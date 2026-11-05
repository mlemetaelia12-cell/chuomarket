import { pgTable, index, foreignKey, uuid, timestamp, unique, varchar, integer, boolean, text, jsonb, uniqueIndex, date, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const communityPostType = pgEnum("community_post_type", ['material', 'room', 'lost_found'])
export const language = pgEnum("language", ['en', 'sw'])
export const listingCategory = pgEnum("listing_category", ['books', 'electronics', 'clothes', 'utensils', 'other'])
export const listingStatus = pgEnum("listing_status", ['draft', 'published', 'sold', 'hidden'])
export const orderStatus = pgEnum("order_status", ['pending', 'completed', 'failed', 'cancelled'])
export const orderType = pgEnum("order_type", ['subscription', 'featured', 'boost'])
export const pointEventType = pgEnum("point_event_type", ['daily_login', 'referral', 'redemption', 'admin_adjustment', 'notes_post', 'answer_post'])
export const reportStatus = pgEnum("report_status", ['open', 'reviewing', 'resolved', 'dismissed'])
export const userRole = pgEnum("user_role", ['user', 'admin', 'superadmin'])


export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	planId: uuid("plan_id").notNull(),
	subscriptionUntil: timestamp("subscription_until", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("subscriptions_user_until_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.subscriptionUntil.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [plans.id],
			name: "subscriptions_plan_id_fkey"
		}).onDelete("restrict"),
]);

export const plans = pgTable("plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 32 }).notNull(),
	name: varchar({ length: 80 }).notNull(),
	priceTsh: integer("price_tsh").notNull(),
	durationDays: integer("duration_days").notNull(),
	listingLimit: integer("listing_limit"),
	businessBadge: boolean("business_badge").default(false).notNull(),
	priorityPlacement: boolean("priority_placement").default(false).notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("plans_code_key").on(table.code),
]);

export const listingImages = pgTable("listing_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	listingId: uuid("listing_id").notNull(),
	fileUrl: text("file_url").notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("listing_images_listing_idx").using("btree", table.listingId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "listing_images_listing_id_fkey"
		}).onDelete("cascade"),
]);

export const favorites = pgTable("favorites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	listingId: uuid("listing_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("favorites_listing_idx").using("btree", table.listingId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "favorites_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "favorites_listing_id_fkey"
		}).onDelete("cascade"),
	unique("favorites_user_listing_unique").on(table.userId, table.listingId),
]);

export const listingStats = pgTable("listing_stats", {
	listingId: uuid("listing_id").primaryKey().notNull(),
	views: integer().default(0).notNull(),
	whatsappClicks: integer("whatsapp_clicks").default(0).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "listing_stats_listing_id_fkey"
		}).onDelete("cascade"),
]);

export const pointEvents = pgTable("point_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: pointEventType().notNull(),
	points: integer().notNull(),
	description: varchar({ length: 180 }),
	referenceId: uuid("reference_id"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("point_events_user_created_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "point_events_user_id_fkey"
		}).onDelete("cascade"),
]);

export const authUsers = pgTable("auth_users", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	username: varchar({ length: 32 }).notNull(),
	displayUsername: varchar("display_username", { length: 32 }),
	whatsapp: varchar({ length: 20 }),
	language: language().default('en').notNull(),
	role: userRole().default('user').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	banned: boolean().default(false).notNull(),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("auth_users_email_key").on(table.email),
	unique("auth_users_username_key").on(table.username),
]);

export const authAccounts = pgTable("auth_accounts", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("auth_accounts_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [authUsers.id],
			name: "auth_accounts_user_id_fkey"
		}).onDelete("cascade"),
]);

export const authVerifications = pgTable("auth_verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("auth_verifications_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const authSessions = pgTable("auth_sessions", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
	impersonatedBy: text("impersonated_by"),
}, (table) => [
	index("auth_sessions_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [authUsers.id],
			name: "auth_sessions_user_id_fkey"
		}).onDelete("cascade"),
	unique("auth_sessions_token_key").on(table.token),
]);

export const whatsappReveals = pgTable("whatsapp_reveals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	listingId: uuid("listing_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("whatsapp_reveals_user_created_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "whatsapp_reveals_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "whatsapp_reveals_listing_id_fkey"
		}).onDelete("cascade"),
]);

export const whatsappRevealLimits = pgTable("whatsapp_reveal_limits", {
	userId: uuid("user_id").notNull(),
	usageDate: date("usage_date").notNull(),
	revealCount: integer("reveal_count").default(0).notNull(),
}, (table) => [
	uniqueIndex("whatsapp_reveal_limits_user_date_unique").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.usageDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "whatsapp_reveal_limits_user_id_fkey"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: varchar({ length: 32 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	role: userRole().default('user').notNull(),
	whatsapp: varchar({ length: 20 }),
	language: language().default('en').notNull(),
	points: integer().default(0).notNull(),
	referredBy: uuid("referred_by"),
	banned: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	authUserId: text("auth_user_id"),
	featuredDaysCredit: integer("featured_days_credit").default(0).notNull(),
	freeListingClaimed: boolean("free_listing_claimed").default(false).notNull(),
}, (table) => [
	uniqueIndex("users_auth_user_id_unique").using("btree", table.authUserId.asc().nullsLast().op("text_ops")),
	index("users_referred_by_idx").using("btree", table.referredBy.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.referredBy],
			foreignColumns: [table.id],
			name: "users_referred_by_users_id_fk"
		}).onDelete("set null"),
	unique("users_username_key").on(table.username),
]);

export const listings = pgTable("listings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ownerId: uuid("owner_id").notNull(),
	title: varchar({ length: 140 }).notNull(),
	description: text().notNull(),
	status: listingStatus().default('draft').notNull(),
	category: listingCategory().notNull(),
	priceTsh: integer("price_tsh").notNull(),
	meetingPlace: varchar("meeting_place", { length: 180 }).notNull(),
	featuredUntil: timestamp("featured_until", { withTimezone: true, mode: 'string' }),
	boostedAt: timestamp("boosted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	planHidden: boolean("plan_hidden").default(false).notNull(),
	isFreeLifetime: boolean("is_free_lifetime").default(false).notNull(),
}, (table) => [
	index("listings_category_status_idx").using("btree", table.category.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("listings_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("listings_owner_status_idx").using("btree", table.ownerId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "listings_owner_id_fkey"
		}).onDelete("cascade"),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	listingId: uuid("listing_id"),
	planId: uuid("plan_id"),
	type: orderType().notNull(),
	amountTsh: integer("amount_tsh").notNull(),
	status: orderStatus().default('pending').notNull(),
	pesapalTrackingId: varchar("pesapal_tracking_id", { length: 128 }),
	pesapalMerchantReference: varchar("pesapal_merchant_reference", { length: 128 }),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	paymentMethod: varchar("payment_method", { length: 40 }),
	confirmationCode: varchar("confirmation_code", { length: 120 }),
	receiptNumber: varchar("receipt_number", { length: 40 }),
	pesapalStatus: varchar("pesapal_status", { length: 40 }),
}, (table) => [
	index("orders_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("orders_user_created_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "orders_listing_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [plans.id],
			name: "orders_plan_id_fkey"
		}).onDelete("set null"),
	unique("orders_pesapal_tracking_id_key").on(table.pesapalTrackingId),
	unique("orders_pesapal_merchant_reference_key").on(table.pesapalMerchantReference),
]);

export const paymentIntegrations = pgTable("payment_integrations", {
	provider: varchar({ length: 32 }).primaryKey().notNull(),
	notificationId: varchar("notification_id", { length: 64 }).notNull(),
	endpointUrl: text("endpoint_url").notNull(),
	registeredAt: timestamp("registered_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const communityPosts = pgTable("community_posts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authorId: uuid("author_id").notNull(),
	type: communityPostType().notNull(),
	title: varchar({ length: 160 }).notNull(),
	description: text().notNull(),
	course: varchar({ length: 120 }),
	year: integer(),
	fileUrl: text("file_url"),
	meetingPlace: varchar("meeting_place", { length: 180 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	postStatus: varchar("post_status", { length: 20 }).default('open').notNull(),
	lostFoundType: varchar("lost_found_type", { length: 10 }),
	photoUrl: text("photo_url"),
}, (table) => [
	index("community_posts_course_year_idx").using("btree", table.course.asc().nullsLast().op("int4_ops"), table.year.asc().nullsLast().op("text_ops")),
	index("community_posts_type_created_idx").using("btree", table.type.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "community_posts_author_id_fkey"
		}).onDelete("cascade"),
]);

export const reports = pgTable("reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reporterId: uuid("reporter_id").notNull(),
	listingId: uuid("listing_id"),
	reportedUserId: uuid("reported_user_id"),
	reason: varchar({ length: 80 }).notNull(),
	details: text(),
	status: reportStatus().default('open').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	communityPostId: uuid("community_post_id"),
}, (table) => [
	index("reports_community_post_idx").using("btree", table.communityPostId.asc().nullsLast().op("uuid_ops")),
	index("reports_status_created_idx").using("btree", table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "reports_reporter_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "reports_listing_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.reportedUserId],
			foreignColumns: [users.id],
			name: "reports_reported_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.communityPostId],
			foreignColumns: [communityPosts.id],
			name: "reports_community_post_id_fkey"
		}).onDelete("set null"),
]);

export const dailyPointClaims = pgTable("daily_point_claims", {
	userId: uuid("user_id").notNull(),
	claimDate: date("claim_date").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "daily_point_claims_user_id_fkey"
		}).onDelete("cascade"),
	unique("daily_point_claims_user_date_unique").on(table.userId, table.claimDate),
]);

export const communityAnswers = pgTable("community_answers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	postId: uuid("post_id").notNull(),
	authorId: uuid("author_id").notNull(),
	body: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("community_answers_post_author_unique").using("btree", table.postId.asc().nullsLast().op("uuid_ops"), table.authorId.asc().nullsLast().op("uuid_ops")),
	index("community_answers_post_created_idx").using("btree", table.postId.asc().nullsLast().op("uuid_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [communityPosts.id],
			name: "community_answers_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "community_answers_author_id_fkey"
		}).onDelete("cascade"),
]);

export const apiRateLimits = pgTable("api_rate_limits", {
	key: varchar({ length: 200 }).primaryKey().notNull(),
	windowStartedAt: timestamp("window_started_at", { withTimezone: true, mode: 'string' }).notNull(),
	count: integer().default(0).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const userNotifications = pgTable("user_notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	subscriptionId: uuid("subscription_id").notNull(),
	kind: varchar({ length: 40 }).notNull(),
	message: varchar({ length: 240 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("user_notifications_user_created_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_notifications_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [subscriptions.id],
			name: "user_notifications_subscription_id_fkey"
		}).onDelete("cascade"),
	unique("user_notifications_subscription_kind_unique").on(table.subscriptionId, table.kind),
]);
