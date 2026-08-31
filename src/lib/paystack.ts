/**
 * Paystack Payment Gateway Integration Module
 */

export interface PaystackInitializePayload {
  email: string
  amount: number // in subunits (e.g. kobo or cents, integer)
  currency?: string
  reference: string
  callback_url?: string
  metadata: {
    userId: string
    tier: 'pro' | 'enterprise'
    custom_fields?: Array<{
      display_name: string
      variable_name: string
      value: string
    }>
  }
}

export interface PaystackVerificationResponse {
  status: boolean
  message: string
  data: {
    id: number
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number
    gateway_response: string
    paid_at: string
    created_at: string
    channel: string
    currency: string
    customer: {
      id: number
      email: string
      customer_code: string
      first_name?: string
      last_name?: string
    }
    metadata?: {
      userId?: string
      tier?: 'pro' | 'enterprise'
    }
  }
}

/**
 * Initialize a Paystack transaction directly with the API
 */
export async function initializePaystackTransaction(payload: PaystackInitializePayload) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    throw new Error('Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY.')
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const data = await response.json()
  if (!response.ok || !data.status) {
    throw new Error(data.message || 'Failed to initialize Paystack transaction.')
  }

  return data.data
}

/**
 * Verify a Paystack transaction by reference
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerificationResponse['data']> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    throw new Error('Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY.')
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    cache: 'no-store',
  })

  const data = (await response.json()) as PaystackVerificationResponse
  if (!response.ok || !data.status || !data.data) {
    throw new Error(data.message || 'Payment verification could not be completed with Paystack.')
  }

  return data.data
}
