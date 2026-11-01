-- ============================================================
-- 1. OPTION B: QUEUED SUBSCRIPTION DATES
-- ============================================================

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS starts_at timestamptz;

--> statement-breakpoint

-- Reconstruct historical start dates using each plan's duration.
UPDATE public.subscriptions AS s
SET starts_at =
  s.subscription_until - make_interval(days => p.duration_days)
FROM public.plans AS p
WHERE p.id = s.plan_id
  AND s.starts_at IS NULL;

--> statement-breakpoint

-- Fallback for any historical record without a matching plan.
UPDATE public.subscriptions
SET starts_at = created_at
WHERE starts_at IS NULL;

--> statement-breakpoint

ALTER TABLE public.subscriptions
ALTER COLUMN starts_at SET NOT NULL;

--> statement-breakpoint

-- Preserve the lifetime entitlement for existing Free listings.
UPDATE public.users AS u
SET free_listing_claimed = true,
    updated_at = now()
WHERE u.free_listing_claimed = false
  AND EXISTS (
    SELECT 1
    FROM public.listings AS l
    WHERE l.owner_id = u.id
      AND l.is_free_lifetime = true
  );

--> statement-breakpoint

-- ============================================================
-- 2. SYNCHRONIZE LISTINGS WITH THE CURRENT ACTIVE SUBSCRIPTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_subscription_listings(
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Serialize synchronization for the affected seller(s).
  IF p_user_id IS NULL THEN
    PERFORM u.id
    FROM public.users AS u
    ORDER BY u.id
    FOR UPDATE;
  ELSE
    PERFORM u.id
    FROM public.users AS u
    WHERE u.id = p_user_id
    FOR UPDATE;
  END IF;

  -- A Free lifetime listing hidden by an old expiry process
  -- must remain published. Manually hidden listings are untouched.
  UPDATE public.listings
  SET status = 'published',
      plan_hidden = false,
      updated_at = now()
  WHERE status = 'hidden'
    AND plan_hidden = true
    AND is_free_lifetime = true
    AND (p_user_id IS NULL OR owner_id = p_user_id);

  -- Hide paid listings when the seller has no active subscription.
  UPDATE public.listings AS l
  SET status = 'hidden',
      plan_hidden = true,
      updated_at = now()
  WHERE l.status = 'published'
    AND l.is_free_lifetime = false
    AND (p_user_id IS NULL OR l.owner_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.subscriptions AS s
      WHERE s.user_id = l.owner_id
        AND s.starts_at <= now()
        AND s.subscription_until > now()
    );

  -- If the current plan limit is lower than the number of
  -- published listings, keep Free first, then oldest listings.
  WITH active_plans AS (
    SELECT DISTINCT ON (s.user_id)
      s.user_id,
      p.listing_limit
    FROM public.subscriptions AS s
    INNER JOIN public.plans AS p
      ON p.id = s.plan_id
    WHERE s.starts_at <= now()
      AND s.subscription_until > now()
      AND (p_user_id IS NULL OR s.user_id = p_user_id)
    ORDER BY
      s.user_id,
      s.starts_at DESC,
      s.created_at DESC,
      s.id DESC
  ),
  ranked_listings AS (
    SELECT
      l.id,
      ap.listing_limit,
      row_number() OVER (
        PARTITION BY l.owner_id
        ORDER BY
          l.is_free_lifetime DESC,
          l.created_at ASC,
          l.id ASC
      ) AS listing_position
    FROM public.listings AS l
    INNER JOIN active_plans AS ap
      ON ap.user_id = l.owner_id
    WHERE l.status = 'published'
  )
  UPDATE public.listings AS l
  SET status = 'hidden',
      plan_hidden = true,
      updated_at = now()
  FROM ranked_listings AS r
  WHERE l.id = r.id
    AND r.listing_limit IS NOT NULL
    AND r.listing_position > r.listing_limit;

  -- Reactivate listings hidden automatically by plan limits or
  -- expiry, using only slots available in the current plan.
  WITH active_plans AS (
    SELECT DISTINCT ON (s.user_id)
      s.user_id,
      p.listing_limit
    FROM public.subscriptions AS s
    INNER JOIN public.plans AS p
      ON p.id = s.plan_id
    WHERE s.starts_at <= now()
      AND s.subscription_until > now()
      AND (p_user_id IS NULL OR s.user_id = p_user_id)
    ORDER BY
      s.user_id,
      s.starts_at DESC,
      s.created_at DESC,
      s.id DESC
  ),
  published_counts AS (
    SELECT
      owner_id,
      count(*)::integer AS published_count
    FROM public.listings
    WHERE status = 'published'
      AND (p_user_id IS NULL OR owner_id = p_user_id)
    GROUP BY owner_id
  ),
  candidates AS (
    SELECT
      l.id,
      l.owner_id,
      ap.listing_limit,
      COALESCE(pc.published_count, 0) AS published_count,
      row_number() OVER (
        PARTITION BY l.owner_id
        ORDER BY
          l.is_free_lifetime DESC,
          l.created_at ASC,
          l.id ASC
      ) AS candidate_position
    FROM public.listings AS l
    INNER JOIN active_plans AS ap
      ON ap.user_id = l.owner_id
    LEFT JOIN published_counts AS pc
      ON pc.owner_id = l.owner_id
    WHERE l.status = 'hidden'
      AND l.plan_hidden = true
  ),
  eligible AS (
    SELECT id
    FROM candidates
    WHERE listing_limit IS NULL
       OR candidate_position <= GREATEST(
         listing_limit - published_count,
         0
       )
  )
  UPDATE public.listings AS l
  SET status = 'published',
      plan_hidden = false,
      updated_at = now()
  FROM eligible AS e
  WHERE l.id = e.id
    AND l.status = 'hidden'
    AND l.plan_hidden = true;
END;
$$;

--> statement-breakpoint

-- ============================================================
-- 3. ATOMIC FREE / PAID LISTING PUBLISHING
-- ============================================================

CREATE OR REPLACE FUNCTION public.publish_marketplace_listing(
  p_user_id uuid,
  p_listing_id uuid,
  p_mode text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_free_claimed boolean;
  v_has_active_plan boolean := false;
  v_listing_limit integer;
  v_published_count bigint;
  v_draft_id uuid;
BEGIN
  IF p_mode NOT IN ('free', 'plan') THEN
    RETURN 'invalid_mode';
  END IF;

  -- Serialize publishing requests for this account.
  SELECT free_listing_claimed
  INTO v_free_claimed
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'user_not_found';
  END IF;

  -- Bring this seller's listing statuses up to date.
  PERFORM public.sync_subscription_listings(p_user_id);

  SELECT id
  INTO v_draft_id
  FROM public.listings
  WHERE id = p_listing_id
    AND owner_id = p_user_id
    AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'draft_not_found';
  END IF;

  -- Find the subscription active right now.
  SELECT p.listing_limit
  INTO v_listing_limit
  FROM public.subscriptions AS s
  INNER JOIN public.plans AS p
    ON p.id = s.plan_id
  WHERE s.user_id = p_user_id
    AND s.starts_at <= now()
    AND s.subscription_until > now()
  ORDER BY
    s.starts_at DESC,
    s.created_at DESC,
    s.id DESC
  LIMIT 1;

  v_has_active_plan := FOUND;

  -- FREE LIFETIME PUBLISHING
  IF p_mode = 'free' THEN
    IF v_free_claimed
       OR EXISTS (
         SELECT 1
         FROM public.listings
         WHERE owner_id = p_user_id
           AND is_free_lifetime = true
       ) THEN
      UPDATE public.users
      SET free_listing_claimed = true,
          updated_at = now()
      WHERE id = p_user_id;

      RETURN 'free_listing_used';
    END IF;

    -- When a paid subscription is active, Free also consumes
    -- one slot in that plan's combined publishing limit.
    IF v_has_active_plan AND v_listing_limit IS NOT NULL THEN
      SELECT count(*)
      INTO v_published_count
      FROM public.listings
      WHERE owner_id = p_user_id
        AND status = 'published';

      IF v_published_count >= v_listing_limit THEN
        RETURN 'listing_limit_reached';
      END IF;
    END IF;

    UPDATE public.users
    SET free_listing_claimed = true,
        updated_at = now()
    WHERE id = p_user_id
      AND free_listing_claimed = false;

    IF NOT FOUND THEN
      RETURN 'free_listing_used';
    END IF;

    UPDATE public.listings
    SET status = 'published',
        plan_hidden = false,
        is_free_lifetime = true,
        updated_at = now()
    WHERE id = p_listing_id
      AND owner_id = p_user_id
      AND status = 'draft';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Free listing could not be published';
    END IF;

    RETURN 'published';
  END IF;

  -- PAID PLAN PUBLISHING
  IF NOT v_has_active_plan THEN
    RETURN 'subscription_required';
  END IF;

  SELECT count(*)
  INTO v_published_count
  FROM public.listings
  WHERE owner_id = p_user_id
    AND status = 'published';

  -- Free lifetime listings are included because they are published.
  IF v_listing_limit IS NOT NULL
     AND v_published_count >= v_listing_limit THEN
    RETURN 'listing_limit_reached';
  END IF;

  UPDATE public.listings
  SET status = 'published',
      plan_hidden = false,
      is_free_lifetime = false,
      updated_at = now()
  WHERE id = p_listing_id
    AND owner_id = p_user_id
    AND status = 'draft';

  IF NOT FOUND THEN
    RETURN 'draft_not_found';
  END IF;

  RETURN 'published';
END;
$$;

--> statement-breakpoint

-- ============================================================
-- 4. PESAPAL ORDER FULFILMENT WITH QUEUED SUBSCRIPTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_pesapal_order(
  p_order_id uuid,
  p_tracking_id text,
  p_payment_method text,
  p_confirmation_code text,
  p_receipt_number text,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_duration integer;
  v_start timestamptz;
BEGIN
  IF upper(trim(coalesce(p_status, ''))) <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Pesapal transaction is not completed';
  END IF;

  IF nullif(trim(coalesce(p_tracking_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Pesapal tracking ID is required';
  END IF;

  -- Only a pending order can be fulfilled.
  UPDATE public.orders
  SET status = 'completed',
      verified_at = now(),
      pesapal_tracking_id = p_tracking_id,
      payment_method = p_payment_method,
      confirmation_code = p_confirmation_code,
      receipt_number = p_receipt_number,
      pesapal_status = p_status,
      updated_at = now()
  WHERE id = p_order_id
    AND status = 'pending'
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Serialize this seller's fulfilment and publishing operations.
  PERFORM u.id
  FROM public.users AS u
  WHERE u.id = v_order.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Marketplace user was not found';
  END IF;

  IF v_order.type = 'subscription' THEN
    IF v_order.plan_id IS NULL THEN
      RAISE EXCEPTION 'Paid subscription order has no plan';
    END IF;

    SELECT duration_days
    INTO v_duration
    FROM public.plans
    WHERE id = v_order.plan_id
      AND active = true;

    IF NOT FOUND OR v_duration IS NULL THEN
      RAISE EXCEPTION 'Subscription plan is unavailable';
    END IF;

    -- Option B: start after the latest unexpired subscription,
    -- including any previously queued subscription.
    SELECT GREATEST(
      COALESCE(MAX(subscription_until), now()),
      now()
    )
    INTO v_start
    FROM public.subscriptions
    WHERE user_id = v_order.user_id
      AND subscription_until > now();

    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      starts_at,
      subscription_until,
      created_at,
      updated_at
    )
    VALUES (
      v_order.user_id,
      v_order.plan_id,
      v_start,
      v_start + make_interval(days => v_duration),
      now(),
      now()
    );

    -- Immediately apply whichever plan is active at this moment.
    PERFORM public.sync_subscription_listings(v_order.user_id);

    -- If checkout was initiated from a draft, put it into the
    -- plan-managed queue. It is published when an active plan
    -- has an available slot.
    IF v_order.listing_id IS NOT NULL THEN
      UPDATE public.listings
      SET status = 'hidden',
          plan_hidden = true,
          is_free_lifetime = false,
          updated_at = now()
      WHERE id = v_order.listing_id
        AND owner_id = v_order.user_id
        AND status = 'draft';

      IF FOUND THEN
        PERFORM public.sync_subscription_listings(v_order.user_id);
      END IF;
    END IF;

  ELSIF v_order.type = 'featured' THEN
    IF v_order.listing_id IS NULL THEN
      RAISE EXCEPTION 'Featured order has no listing';
    END IF;

    UPDATE public.listings
    SET featured_until =
          GREATEST(COALESCE(featured_until, now()), now())
          + interval '7 days',
        updated_at = now()
    WHERE id = v_order.listing_id
      AND owner_id = v_order.user_id
      AND status = 'published';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Featured listing is not available';
    END IF;

  ELSIF v_order.type = 'boost' THEN
    IF v_order.listing_id IS NULL THEN
      RAISE EXCEPTION 'Boost order has no listing';
    END IF;

    UPDATE public.listings
    SET boosted_at = now(),
        updated_at = now()
    WHERE id = v_order.listing_id
      AND owner_id = v_order.user_id
      AND status = 'published';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Boost listing is not available';
    END IF;

  ELSE
    RAISE EXCEPTION 'Unsupported paid order type';
  END IF;

  RETURN true;
END;
$$;