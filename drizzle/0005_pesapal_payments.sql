
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS plan_hidden boolean NOT NULL DEFAULT false;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method varchar(40);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS confirmation_code varchar(120);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS receipt_number varchar(40);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pesapal_status varchar(40);

CREATE TABLE IF NOT EXISTS payment_integrations (
  provider varchar(32) PRIMARY KEY,
  notification_id varchar(64) NOT NULL,
  endpoint_url text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION complete_pesapal_order(
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
  v_order orders%ROWTYPE;
  v_duration integer;
  v_start timestamptz;
BEGIN
  UPDATE orders
  SET
    status = 'completed',
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

  IF v_order.type <> 'subscription' THEN
    RAISE EXCEPTION 'Only subscription orders can activate seller plans';
  END IF;

  IF v_order.plan_id IS NULL THEN
    RAISE EXCEPTION 'Paid subscription order has no plan';
  END IF;

  SELECT duration_days
  INTO v_duration
  FROM plans
  WHERE id = v_order.plan_id;

  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Subscription plan is unavailable';
  END IF;

  SELECT GREATEST(COALESCE(MAX(subscription_until), now()), now())
  INTO v_start
  FROM subscriptions
  WHERE user_id = v_order.user_id;

  INSERT INTO subscriptions (
    user_id,
    plan_id,
    subscription_until,
    created_at,
    updated_at
  )
  VALUES (
    v_order.user_id,
    v_order.plan_id,
    v_start + make_interval(days => v_duration),
    now(),
    now()
  );

  UPDATE listings
  SET status = 'published',
      plan_hidden = false,
      updated_at = now()
  WHERE owner_id = v_order.user_id
    AND plan_hidden = true;

  IF v_order.listing_id IS NOT NULL THEN
    UPDATE listings
    SET status = 'published',
        plan_hidden = false,
        updated_at = now()
    WHERE id = v_order.listing_id
      AND owner_id = v_order.user_id
      AND status = 'draft';
  END IF;

  RETURN true;
END;
$$;
