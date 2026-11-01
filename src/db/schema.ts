
import { relations, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ============================================================
// ENUMS
// ============================================================

export const userRoleEnum = pgEnum('user_role', [
  'user',
  'admin',
  'superadmin',
]);

export const languageEnum = pgEnum('language', ['en', 'sw']);

export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'published',
  'sold',
  'hidden',
]);

export const listingCategoryEnum = pgEnum('listing_category', [
  'books',
  'electronics',
  'clothes',
  'utensils',
  'other',
]);

export const orderTypeEnum = pgEnum('order_type', [
  'subscription',
  'featured',
  'boost',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'completed',
  'failed',
  'cancelled',
]);

export const communityPostTypeEnum = pgEnum('community_post_type', [
  'material',
  'room',
  'lost_found',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'open',
  'reviewing',
  'resolved',
  'dismissed',
]);

export const pointEventTypeEnum = pgEnum('point_event_type', [
  'daily_login',
  'referral',
  'redemption',
  'admin_adjustment',
  'notes_post',
  'answer_post',
]);

// ============================================================
// SHARED COLUMNS
// ============================================================

const timestamps = () => ({
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

// ============================================================
// MARKETPLACE USERS
// ============================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    authUserId: text('auth_user_id').unique(),

    username: varchar('username', { length: 32 })
      .notNull()
      .unique(),

    passwordHash: text('password_hash').notNull(),

    role: userRoleEnum('role').notNull().default('user'),

    whatsapp: varchar('whatsapp', { length: 20 }),

    language: languageEnum('language').notNull().default('en'),

    points: integer('points').notNull().default(0),

    featuredDaysCredit: integer('featured_days_credit')
      .notNull()
      .default(0),

    referredBy: uuid('referred_by').references(
      (): AnyPgColumn => users.id,
      { onDelete: 'set null' },
    ),

    banned: boolean('banned').notNull().default(false),

    // Lifetime Free listing entitlement.
    // Once claimed, it is never restored.
    freeListingClaimed: boolean('free_listing_claimed')
      .notNull()
      .default(false),

    ...timestamps(),
  },
  (t) => [
    index('users_referred_by_idx').on(t.referredBy),
  ],
);

// ============================================================
// SELLER PLANS
// ============================================================

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),

  code: varchar('code', { length: 32 })
    .notNull()
    .unique(),

  name: varchar('name', { length: 80 }).notNull(),

  priceTsh: integer('price_tsh').notNull(),

  durationDays: integer('duration_days').notNull(),

  // null means unlimited listings.
  listingLimit: integer('listing_limit'),

  businessBadge: boolean('business_badge')
    .notNull()
    .default(false),

  priorityPlacement: boolean('priority_placement')
    .notNull()
    .default(false),

  active: boolean('active').notNull().default(true),

  ...timestamps(),
});

// ============================================================
// SELLER SUBSCRIPTIONS
// ============================================================

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, {
        onDelete: 'restrict',
      }),

    // Supports queued subscriptions.
    startsAt: timestamp('starts_at', {
      withTimezone: true,
    }).notNull(),

    subscriptionUntil: timestamp('subscription_until', {
      withTimezone: true,
    }).notNull(),

    ...timestamps(),
  },
  (t) => [
    index('subscriptions_user_until_idx').on(
      t.userId,
      t.subscriptionUntil,
    ),
  ],
);

// ============================================================
// MARKETPLACE LISTINGS
// ============================================================

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    title: varchar('title', { length: 140 }).notNull(),

    description: text('description').notNull(),

    status: listingStatusEnum('status')
      .notNull()
      .default('draft'),

    category: listingCategoryEnum('category').notNull(),

    priceTsh: integer('price_tsh').notNull(),

    meetingPlace: varchar('meeting_place', { length: 180 })
      .notNull(),

    featuredUntil: timestamp('featured_until', {
      withTimezone: true,
    }),

    boostedAt: timestamp('boosted_at', {
      withTimezone: true,
    }),

    // True when hidden automatically because a plan expired.
    planHidden: boolean('plan_hidden')
      .notNull()
      .default(false),

    // Identifies the one lifetime Free listing.
    isFreeLifetime: boolean('is_free_lifetime')
      .notNull()
      .default(false),

    ...timestamps(),
  },
  (t) => [
    index('listings_owner_status_idx').on(
      t.ownerId,
      t.status,
    ),

    index('listings_category_status_idx').on(
      t.category,
      t.status,
    ),

    index('listings_created_at_idx').on(t.createdAt),
  ],
);

// ============================================================
// LISTING IMAGES
// ============================================================

export const listingImages = pgTable(
  'listing_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, {
        onDelete: 'cascade',
      }),

    fileUrl: text('file_url').notNull(),

    sortOrder: integer('sort_order').notNull().default(0),

    ...timestamps(),
  },
  (t) => [
    index('listing_images_listing_idx').on(t.listingId),
  ],
);

// ============================================================
// FAVORITES
// ============================================================

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, {
        onDelete: 'cascade',
      }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('favorites_user_listing_unique').on(
      t.userId,
      t.listingId,
    ),

    index('favorites_listing_idx').on(t.listingId),
  ],
);

// ============================================================
// REPORTS
// ============================================================

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    listingId: uuid('listing_id').references(
      () => listings.id,
      { onDelete: 'set null' },
    ),

    communityPostId: uuid('community_post_id').references(
      (): AnyPgColumn => communityPosts.id,
      { onDelete: 'set null' },
    ),

    reportedUserId: uuid('reported_user_id').references(
      () => users.id,
      { onDelete: 'set null' },
    ),

    reason: varchar('reason', { length: 80 }).notNull(),

    details: text('details'),

    status: reportStatusEnum('status')
      .notNull()
      .default('open'),

    ...timestamps(),
  },
  (t) => [
    index('reports_status_created_idx').on(
      t.status,
      t.createdAt,
    ),

    index('reports_community_post_idx').on(
      t.communityPostId,
    ),

    uniqueIndex('reports_reporter_listing_unique')
      .on(t.reporterId, t.listingId)
      .where(sql`${t.listingId} IS NOT NULL`),
  ],
);

// ============================================================
// PAYMENTS AND ORDERS
// ============================================================

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
      }),

    listingId: uuid('listing_id').references(
      () => listings.id,
      { onDelete: 'set null' },
    ),

    planId: uuid('plan_id').references(
      () => plans.id,
      { onDelete: 'set null' },
    ),

    type: orderTypeEnum('type').notNull(),

    amountTsh: integer('amount_tsh').notNull(),

    status: orderStatusEnum('status')
      .notNull()
      .default('pending'),

    pesapalTrackingId: varchar('pesapal_tracking_id', {
      length: 128,
    }).unique(),

    pesapalMerchantReference: varchar(
      'pesapal_merchant_reference',
      { length: 128 },
    ).unique(),

    paymentMethod: varchar('payment_method', {
      length: 40,
    }),

    confirmationCode: varchar('confirmation_code', {
      length: 120,
    }),

    receiptNumber: varchar('receipt_number', {
      length: 40,
    }),

    pesapalStatus: varchar('pesapal_status', {
      length: 40,
    }),

    verifiedAt: timestamp('verified_at', {
      withTimezone: true,
    }),

    ...timestamps(),
  },
  (t) => [
    index('orders_user_created_idx').on(
      t.userId,
      t.createdAt,
    ),

    index('orders_status_idx').on(t.status),
  ],
);

// ============================================================
// LISTING STATISTICS
// ============================================================

export const listingStats = pgTable('listing_stats', {
  listingId: uuid('listing_id')
    .primaryKey()
    .references(() => listings.id, {
      onDelete: 'cascade',
    }),

  views: integer('views').notNull().default(0),

  whatsappClicks: integer('whatsapp_clicks')
    .notNull()
    .default(0),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

// ============================================================
// WHATSAPP REVEALS
// ============================================================

export const whatsappReveals = pgTable(
  'whatsapp_reveals',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, {
        onDelete: 'cascade',
      }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('whatsapp_reveals_user_created_idx').on(
      t.userId,
      t.createdAt,
    ),
  ],
);

export const whatsappRevealLimits = pgTable(
  'whatsapp_reveal_limits',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    usageDate: date('usage_date').notNull(),

    revealCount: integer('reveal_count')
      .notNull()
      .default(0),
  },
  (t) => [
    uniqueIndex('whatsapp_reveal_limits_user_date_unique').on(
      t.userId,
      t.usageDate,
    ),
  ],
);

// ============================================================
// COMMUNITY POSTS
// ============================================================

export const communityPosts = pgTable(
  'community_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    type: communityPostTypeEnum('type').notNull(),

    title: varchar('title', { length: 160 }).notNull(),

    description: text('description').notNull(),

    course: varchar('course', { length: 120 }),

    year: integer('year'),

    fileUrl: text('file_url'),

    meetingPlace: varchar('meeting_place', {
      length: 180,
    }),

    photoUrl: text('photo_url'),

    postStatus: varchar('post_status', { length: 20 })
      .notNull()
      .default('open'),

    lostFoundType: varchar('lost_found_type', {
      length: 10,
    }),

    ...timestamps(),
  },
  (t) => [
    index('community_posts_type_created_idx').on(
      t.type,
      t.createdAt,
    ),

    index('community_posts_course_year_idx').on(
      t.course,
      t.year,
    ),
  ],
);

// ============================================================
// POINT EVENTS
// ============================================================

export const pointEvents = pgTable(
  'point_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    type: pointEventTypeEnum('type').notNull(),

    points: integer('points').notNull(),

    description: varchar('description', {
      length: 180,
    }),

    referenceId: uuid('reference_id'),

    metadata: jsonb('metadata').$type<
      Record<string, string | number | boolean | null>
    >(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('point_events_user_created_idx').on(
      t.userId,
      t.createdAt,
    ),
  ],
);

// ============================================================
// COMMUNITY ANSWERS
// ============================================================

export const communityAnswers = pgTable(
  'community_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    postId: uuid('post_id')
      .notNull()
      .references(() => communityPosts.id, {
        onDelete: 'cascade',
      }),

    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    body: text('body').notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('community_answers_post_created_idx').on(
      t.postId,
      t.createdAt,
    ),

    uniqueIndex('community_answers_post_author_unique').on(
      t.postId,
      t.authorId,
    ),
  ],
);

// ============================================================
// MARKETPLACE RELATIONS
// ============================================================

export const usersRelations = relations(
  users,
  ({ many, one }) => ({
    referrer: one(users, {
      fields: [users.referredBy],
      references: [users.id],
      relationName: 'referrals',
    }),

    referrals: many(users, {
      relationName: 'referrals',
    }),

    listings: many(listings),

    subscriptions: many(subscriptions),

    favorites: many(favorites),

    pointEvents: many(pointEvents),
  }),
);

export const listingsRelations = relations(
  listings,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [listings.ownerId],
      references: [users.id],
    }),

    images: many(listingImages),

    stats: one(listingStats),
  }),
);

export const listingImagesRelations = relations(
  listingImages,
  ({ one }) => ({
    listing: one(listings, {
      fields: [listingImages.listingId],
      references: [listings.id],
    }),
  }),
);

export const favoritesRelations = relations(
  favorites,
  ({ one }) => ({
    user: one(users, {
      fields: [favorites.userId],
      references: [users.id],
    }),

    listing: one(listings, {
      fields: [favorites.listingId],
      references: [listings.id],
    }),
  }),
);

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [subscriptions.userId],
      references: [users.id],
    }),

    plan: one(plans, {
      fields: [subscriptions.planId],
      references: [plans.id],
    }),
  }),
);

export const ordersRelations = relations(
  orders,
  ({ one }) => ({
    user: one(users, {
      fields: [orders.userId],
      references: [users.id],
    }),

    listing: one(listings, {
      fields: [orders.listingId],
      references: [listings.id],
    }),

    plan: one(plans, {
      fields: [orders.planId],
      references: [plans.id],
    }),
  }),
);

export const listingStatsRelations = relations(
  listingStats,
  ({ one }) => ({
    listing: one(listings, {
      fields: [listingStats.listingId],
      references: [listings.id],
    }),
  }),
);

export const communityPostsRelations = relations(
  communityPosts,
  ({ one }) => ({
    author: one(users, {
      fields: [communityPosts.authorId],
      references: [users.id],
    }),
  }),
);

export const pointEventsRelations = relations(
  pointEvents,
  ({ one }) => ({
    user: one(users, {
      fields: [pointEvents.userId],
      references: [users.id],
    }),
  }),
);

// ============================================================
// BETTER AUTH TABLES
// These are separate from marketplace users.
// ============================================================

export const authUsers = pgTable('auth_users', {
  id: text('id').primaryKey(),

  name: text('name').notNull(),

  email: text('email').notNull().unique(),

  emailVerified: boolean('email_verified')
    .notNull()
    .default(false),

  image: text('image'),

  username: varchar('username', { length: 32 })
    .notNull()
    .unique(),

  displayUsername: varchar('display_username', {
    length: 32,
  }),

  whatsapp: varchar('whatsapp', { length: 20 }),

  language: languageEnum('language').notNull().default('en'),

  role: userRoleEnum('role').notNull().default('user'),

  banned: boolean('banned').notNull().default(false),

  banReason: text('ban_reason'),

  banExpires: timestamp('ban_expires', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text('id').primaryKey(),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    token: text('token').notNull().unique(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    ipAddress: text('ip_address'),

    userAgent: text('user_agent'),

    impersonatedBy: text('impersonated_by'),

    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, {
        onDelete: 'cascade',
      }),
  },
  (t) => [
    index('auth_sessions_user_idx').on(t.userId),
  ],
);

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: text('id').primaryKey(),

    accountId: text('account_id').notNull(),

    providerId: text('provider_id').notNull(),

    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, {
        onDelete: 'cascade',
      }),

    accessToken: text('access_token'),

    refreshToken: text('refresh_token'),

    idToken: text('id_token'),

    accessTokenExpiresAt: timestamp(
      'access_token_expires_at',
      { withTimezone: true },
    ),

    refreshTokenExpiresAt: timestamp(
      'refresh_token_expires_at',
      { withTimezone: true },
    ),

    scope: text('scope'),

    password: text('password'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('auth_accounts_user_idx').on(t.userId),
  ],
);

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: text('id').primaryKey(),

    identifier: text('identifier').notNull(),

    value: text('value').notNull(),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('auth_verifications_identifier_idx').on(
      t.identifier,
    ),
  ],
);

// ============================================================
// PAYMENT INTEGRATIONS
// ============================================================

export const paymentIntegrations = pgTable(
  'payment_integrations',
  {
    provider: varchar('provider', { length: 32 }).primaryKey(),

    notificationId: varchar('notification_id', {
      length: 64,
    }).notNull(),

    endpointUrl: text('endpoint_url').notNull(),

    registeredAt: timestamp('registered_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
);

// ============================================================
// API RATE LIMITS
// ============================================================

export const apiRateLimits = pgTable('api_rate_limits', {
  key: varchar('key', { length: 200 }).primaryKey(),

  windowStartedAt: timestamp('window_started_at', {
    withTimezone: true,
  }).notNull(),

  count: integer('count').notNull().default(0),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

// ============================================================
// USER NOTIFICATIONS
// ============================================================

export const userNotifications = pgTable(
  'user_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, {
        onDelete: 'cascade',
      }),

    kind: varchar('kind', { length: 40 }).notNull(),

    message: varchar('message', { length: 240 }).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    readAt: timestamp('read_at', {
      withTimezone: true,
    }),
  },
  (t) => [
    uniqueIndex('user_notifications_subscription_kind_unique').on(
      t.subscriptionId,
      t.kind,
    ),

    index('user_notifications_user_created_idx').on(
      t.userId,
      t.createdAt,
    ),
  ],
);

// ============================================================
// DAILY POINT CLAIMS
// ============================================================

export const dailyPointClaims = pgTable(
  'daily_point_claims',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    claimDate: date('claim_date').notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('daily_point_claims_user_date_unique').on(
      t.userId,
      t.claimDate,
    ),
  ],
);

// ============================================================
// EXPORTS
// ============================================================
