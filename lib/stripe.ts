type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
  } | null;
};

type CreateCheckoutSessionInput = {
  leadId: string;
  diagnosisType: string;
  customerEmail?: string | null;
  customerName?: string | null;
  successUrl: string;
  cancelUrl: string;
};

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || null;
}

function getStripePriceId() {
  return process.env.STRIPE_PRICE_ID || null;
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is missing.');
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...init?.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText.slice(0, 500) || `Stripe API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createStripeCheckoutSession(input: CreateCheckoutSessionInput) {
  const priceId = getStripePriceId();
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID is missing.');
  }

  const body = new URLSearchParams({
    mode: 'payment',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.leadId,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'metadata[diagnosis_lead_id]': input.leadId,
    'metadata[diagnosis_type]': input.diagnosisType
  });

  if (input.customerEmail) {
    body.set('customer_email', input.customerEmail);
  }
  if (input.customerName) {
    body.set('metadata[customer_name]', input.customerName);
  }

  return stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export function getMemberPageUrl() {
  return process.env.MEMBER_PAGE_URL || null;
}
