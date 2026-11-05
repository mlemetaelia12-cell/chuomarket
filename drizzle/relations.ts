import { relations } from "drizzle-orm/relations";
import { users, subscriptions, plans, listings, listingImages, favorites, listingStats, pointEvents, authUsers, authAccounts, authSessions, whatsappReveals, whatsappRevealLimits, orders, communityPosts, reports, dailyPointClaims, communityAnswers, userNotifications } from "./schema";

export const subscriptionsRelations = relations(subscriptions, ({one, many}) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
	plan: one(plans, {
		fields: [subscriptions.planId],
		references: [plans.id]
	}),
	userNotifications: many(userNotifications),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	subscriptions: many(subscriptions),
	favorites: many(favorites),
	pointEvents: many(pointEvents),
	whatsappReveals: many(whatsappReveals),
	whatsappRevealLimits: many(whatsappRevealLimits),
	user: one(users, {
		fields: [users.referredBy],
		references: [users.id],
		relationName: "users_referredBy_users_id"
	}),
	users: many(users, {
		relationName: "users_referredBy_users_id"
	}),
	listings: many(listings),
	orders: many(orders),
	communityPosts: many(communityPosts),
	reports_reporterId: many(reports, {
		relationName: "reports_reporterId_users_id"
	}),
	reports_reportedUserId: many(reports, {
		relationName: "reports_reportedUserId_users_id"
	}),
	dailyPointClaims: many(dailyPointClaims),
	communityAnswers: many(communityAnswers),
	userNotifications: many(userNotifications),
}));

export const plansRelations = relations(plans, ({many}) => ({
	subscriptions: many(subscriptions),
	orders: many(orders),
}));

export const listingImagesRelations = relations(listingImages, ({one}) => ({
	listing: one(listings, {
		fields: [listingImages.listingId],
		references: [listings.id]
	}),
}));

export const listingsRelations = relations(listings, ({one, many}) => ({
	listingImages: many(listingImages),
	favorites: many(favorites),
	listingStats: many(listingStats),
	whatsappReveals: many(whatsappReveals),
	user: one(users, {
		fields: [listings.ownerId],
		references: [users.id]
	}),
	orders: many(orders),
	reports: many(reports),
}));

export const favoritesRelations = relations(favorites, ({one}) => ({
	user: one(users, {
		fields: [favorites.userId],
		references: [users.id]
	}),
	listing: one(listings, {
		fields: [favorites.listingId],
		references: [listings.id]
	}),
}));

export const listingStatsRelations = relations(listingStats, ({one}) => ({
	listing: one(listings, {
		fields: [listingStats.listingId],
		references: [listings.id]
	}),
}));

export const pointEventsRelations = relations(pointEvents, ({one}) => ({
	user: one(users, {
		fields: [pointEvents.userId],
		references: [users.id]
	}),
}));

export const authAccountsRelations = relations(authAccounts, ({one}) => ({
	authUser: one(authUsers, {
		fields: [authAccounts.userId],
		references: [authUsers.id]
	}),
}));

export const authUsersRelations = relations(authUsers, ({many}) => ({
	authAccounts: many(authAccounts),
	authSessions: many(authSessions),
}));

export const authSessionsRelations = relations(authSessions, ({one}) => ({
	authUser: one(authUsers, {
		fields: [authSessions.userId],
		references: [authUsers.id]
	}),
}));

export const whatsappRevealsRelations = relations(whatsappReveals, ({one}) => ({
	user: one(users, {
		fields: [whatsappReveals.userId],
		references: [users.id]
	}),
	listing: one(listings, {
		fields: [whatsappReveals.listingId],
		references: [listings.id]
	}),
}));

export const whatsappRevealLimitsRelations = relations(whatsappRevealLimits, ({one}) => ({
	user: one(users, {
		fields: [whatsappRevealLimits.userId],
		references: [users.id]
	}),
}));

export const ordersRelations = relations(orders, ({one}) => ({
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	listing: one(listings, {
		fields: [orders.listingId],
		references: [listings.id]
	}),
	plan: one(plans, {
		fields: [orders.planId],
		references: [plans.id]
	}),
}));

export const communityPostsRelations = relations(communityPosts, ({one, many}) => ({
	user: one(users, {
		fields: [communityPosts.authorId],
		references: [users.id]
	}),
	reports: many(reports),
	communityAnswers: many(communityAnswers),
}));

export const reportsRelations = relations(reports, ({one}) => ({
	user_reporterId: one(users, {
		fields: [reports.reporterId],
		references: [users.id],
		relationName: "reports_reporterId_users_id"
	}),
	listing: one(listings, {
		fields: [reports.listingId],
		references: [listings.id]
	}),
	user_reportedUserId: one(users, {
		fields: [reports.reportedUserId],
		references: [users.id],
		relationName: "reports_reportedUserId_users_id"
	}),
	communityPost: one(communityPosts, {
		fields: [reports.communityPostId],
		references: [communityPosts.id]
	}),
}));

export const dailyPointClaimsRelations = relations(dailyPointClaims, ({one}) => ({
	user: one(users, {
		fields: [dailyPointClaims.userId],
		references: [users.id]
	}),
}));

export const communityAnswersRelations = relations(communityAnswers, ({one}) => ({
	communityPost: one(communityPosts, {
		fields: [communityAnswers.postId],
		references: [communityPosts.id]
	}),
	user: one(users, {
		fields: [communityAnswers.authorId],
		references: [users.id]
	}),
}));

export const userNotificationsRelations = relations(userNotifications, ({one}) => ({
	user: one(users, {
		fields: [userNotifications.userId],
		references: [users.id]
	}),
	subscription: one(subscriptions, {
		fields: [userNotifications.subscriptionId],
		references: [subscriptions.id]
	}),
}));