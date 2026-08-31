/**
 * Flutterwave Payment Gateway Helper Module
 */

export interface FlutterwavePaymentPayload {
  tx_ref: string
  amount: number
  currency: string
  payment_options: string
  customer: {
    email: string
    name: string
    phonenumber?: string
  }
  customizations: {
    title: string
    description: string
    logo: string
  }
  meta: {
    userId: string
    tier: 'pro' | 'enterprise'
  }
}

export async function verifyFlutterwaveTransaction(transactionId: string) {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Payment service is currently misconfigured. Please contact support.')
  }

  const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    cache: 'no-store',
  })

  const data = await response.json()
  if (!response.ok || data.status !== 'success') {
    throw new Error('Payment verification could not be completed. Please try again or contact support.')
  }

  return data.data
}
