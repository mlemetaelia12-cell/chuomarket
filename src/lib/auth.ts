
import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, username } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import {
  adminAc,
  defaultStatements,
} from 'better-auth/plugins/admin/access';

import { db } from '@/db';
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from '@/db/schema';

/**
 * Authentication environment configuration.
 */
const authSecret = process.env.BETTER_AUTH_SECRET;

if (!authSecret || authSecret.length < 32) {
  throw new Error(
    'BETTER_AUTH_SECRET must be set to a value of at least 32 characters.',
  );
}

/**
 * Better Auth Admin access control.
 *
 * Preserve Better Auth's default admin permissions.
 * Explicitly define all supported roles so that
 * "superadmin" is a recognized role.
 */
const statement = {
  ...defaultStatements,
} as const;

const ac = createAccessControl(statement);

/**
 * Regular users have no administrative permissions.
 */
const userRole = ac.newRole({});

/**
 * Admin receives the standard Better Auth admin permissions.
 */
const adminRole = ac.newRole({
  ...adminAc.statements,
});

/**
 * Superadmin receives the standard Better Auth admin permissions.
 *
 * Additional superadmin-only application permissions remain
 * enforced by the existing marketplace authorization logic.
 */
const superadminRole = ac.newRole({
  ...adminAc.statements,
});

/**
 * Main Better Auth configuration.
 */
export const auth = betterAuth({
  appName: 'Chuo Market',

  secret: authSecret,

  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/username': {
        window: 60,
        max: 5,
      },
      '/sign-up/email': {
        window: 3600,
        max: 5,
      },
    },
  },

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authUsers,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
      whatsapp: {
        type: 'string',
        required: false,
      },
      language: {
        type: 'string',
        required: false,
        defaultValue: 'en',
      },
    },
  },

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 32,
    }),

    admin({
      ac,

      roles: {
        user: userRole,
        admin: adminRole,
        superadmin: superadminRole,
      },

      adminRoles: ['admin', 'superadmin'],
    }),
  ],
});
