import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { paymentIntegrations } from '@/db/schema';

const SANDBOX_BASE = 'https://cybqa.pesapal.com/pesapalv3/api';
const LIVE_BASE = 'https://pay.pesapal.com/v3/api';

type PesapalApiError = {
  message?: string;
};

type PesapalTokenResponse = {
  token?: string;
  status?: string;
  message?: string;
  error?: PesapalApiError;
};

type RegisterIpnResponse = {
  ipn_id?: string;
  ipn_status?: number;
  status?: string;
  error?: PesapalApiError;
};

type SubmitOrderResponse = {
  order_tracking_id?: string;
  merchant_reference?: string;
  redirect_url?: string;
  status?: string;
  error?: PesapalApiError;
};

export type PesapalTransactionStatus = {
  payment_status_description?: string;
  status_code?: number;
  amount?: number;
  currency?: string;
  merchant_reference?: string;
  payment_method?: string;
  confirmation_code?: string;
  created_date?: string;
  status?: string;
  error?: PesapalApiError;
};

function getConfig() {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  const environment = process.env.PESAPAL_ENV ?? 'sandbox';

  if (!key || !secret) {
    throw new Error('Pesapal Consumer Key and Secret are not configured.');
  }

  if (environment !== 'sandbox' && environment !== 'live') {
    throw new Error('PESAPAL_ENV must be either sandbox or live.');
  }

  return {
    key,
    secret,
    base: environment === 'live' ? LIVE_BASE : SANDBOX_BASE,
    environment,
  };
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });

  const rawBody = await response.text();

  let body: T & {
    message?: string;
    error?: PesapalApiError;
  };

  try {
    body = JSON.parse(rawBody) as T & {
      message?: string;
      error?: PesapalApiError;
    };
  } catch {
    throw new Error(`Pesapal returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(
      body.error?.message ?? body.message ?? `Pesapal request failed (${response.status}).`,
    );
  }

  return body;
}

function bearerHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export async function getPesapalToken(): Promise<string> {
  const { key, secret, base } = getConfig();

  const result = await requestJson<PesapalTokenResponse>(`${base}/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: key,
      consumer_secret: secret,
    }),
  });

  if (!result.token) {
    throw new Error(
      result.error?.message ?? result.message ?? 'Pesapal did not return an access token.',
    );
  }

  return result.token;
}

export async function getPesapalBaseUrl(): Promise<string> {
  const configuredBase = process.env.APP_BASE_URL ?? process.env.BETTER_AUTH_URL;

  if (!configuredBase) {
    throw new Error('APP_BASE_URL is required for Pesapal callbacks.');
  }

  let parsed: URL;

  try {
    parsed = new URL(configuredBase);
  } catch {
    throw new Error('APP_BASE_URL is not a valid URL.');
  }

  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

  if (parsed.protocol !== 'https:' && !isLocalhost) {
    throw new Error('APP_BASE_URL must use HTTPS outside localhost.');
  }

  return parsed.origin;
}

export async function ensurePesapalIpn(token: string): Promise<string> {
  const { base, environment } = getConfig();
  const origin = await getPesapalBaseUrl();

  const provider = environment === 'live' ? 'pesapal_live' : 'pesapal_sandbox';

  const endpointUrl = `${origin}/api/payments/ipn`;

  const [saved] = await db
    .select()
    .from(paymentIntegrations)
    .where(eq(paymentIntegrations.provider, provider))
    .limit(1);

  // Reuse the registered IPN for this environment and URL.
  if (saved?.notificationId && saved.endpointUrl === endpointUrl) {
    return saved.notificationId;
  }

  const result = await requestJson<RegisterIpnResponse>(`${base}/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: bearerHeaders(token),
    body: JSON.stringify({
      url: endpointUrl,
      ipn_notification_type: 'GET',
    }),
  });

  if (result.status && result.status !== '200') {
    throw new Error(result.error?.message ?? 'Pesapal IPN registration was not successful.');
  }

  if (!result.ipn_id) {
    throw new Error(result.error?.message ?? 'Pesapal did not return an IPN registration ID.');
  }

  if (result.ipn_status === 0) {
    throw new Error('Pesapal registered an inactive IPN endpoint.');
  }

  await db
    .insert(paymentIntegrations)
    .values({
      provider,
      notificationId: result.ipn_id,
      endpointUrl,
    })
    .onConflictDoUpdate({
      target: paymentIntegrations.provider,
      set: {
        notificationId: result.ipn_id,
        endpointUrl,
        updatedAt: new Date(),
      },
    });

  return result.ipn_id;
}

export async function submitPesapalOrder(input: {
  merchantReference: string;
  amount: number;
  description: string;
  phoneNumber: string;
  username: string;
  locale: 'en' | 'sw';
  notificationId: string;
  accessToken: string;
}): Promise<{
  trackingId: string;
  redirectUrl: string;
}> {
  const { base, environment } = getConfig();

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Invalid Pesapal payment amount.');
  }

  if (!input.merchantReference || input.merchantReference.length > 50) {
    throw new Error('Invalid Pesapal merchant reference.');
  }

  if (!input.phoneNumber.trim()) {
    throw new Error('A customer phone number is required.');
  }

  if (!input.notificationId) {
    throw new Error('Pesapal IPN registration is required.');
  }

  const token = input.accessToken;
  const origin = await getPesapalBaseUrl();

  const result = await requestJson<SubmitOrderResponse>(`${base}/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: bearerHeaders(token),
    body: JSON.stringify({
      id: input.merchantReference,
      currency: 'TZS',
      amount: input.amount,
      description: input.description.slice(0, 100),
      callback_url: `${origin}/api/payments/callback`,
      cancellation_url: `${origin}/${input.locale}/payments/history?status=cancelled`,
      notification_id: input.notificationId,
      billing_address: {
        phone_number: input.phoneNumber.trim(),
        country_code: 'TZ',
        first_name: input.username.slice(0, 40),
        last_name: 'Student',
      },
    }),
  });

  if (result.status && result.status !== '200') {
    throw new Error(result.error?.message ?? 'Pesapal did not accept the order request.');
  }

  if (!result.order_tracking_id || !result.redirect_url) {
    throw new Error(result.error?.message ?? 'Pesapal did not return a checkout URL.');
  }

  if (result.merchant_reference && result.merchant_reference !== input.merchantReference) {
    throw new Error('Pesapal returned an unexpected merchant reference.');
  }

  const redirect = new URL(result.redirect_url);

  const expectedHost = environment === 'live' ? 'pay.pesapal.com' : 'cybqa.pesapal.com';

  if (redirect.protocol !== 'https:' || redirect.hostname !== expectedHost) {
    throw new Error('Pesapal returned an unexpected checkout host.');
  }

  return {
    trackingId: result.order_tracking_id,
    redirectUrl: result.redirect_url,
  };
}

export async function getPesapalTransactionStatus(
  trackingId: string,
): Promise<PesapalTransactionStatus> {
  if (!trackingId.trim()) {
    throw new Error('Pesapal tracking ID is required.');
  }

  const { base } = getConfig();
  const token = await getPesapalToken();

  const url = new URL(`${base}/Transactions/GetTransactionStatus`);

  url.searchParams.set('orderTrackingId', trackingId);

  // Important: Authorization must be "Bearer TOKEN".
  return requestJson<PesapalTransactionStatus>(url.toString(), {
    method: 'GET',
    headers: bearerHeaders(token),
  });
}
