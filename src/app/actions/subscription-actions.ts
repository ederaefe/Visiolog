'use server'

import { createClient } from '@/utils/supabase/server'
import { verifyPaystackTransaction } from '@/lib/paystack'

export async function initializeSubscriptionPayment(tier: 'pro' | 'enterprise') {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Authentication required to subscribe.')
  }

  const pricesUSD = {
    pro: 19,
    enterprise: 99,
  }

  const amountUSD = pricesUSD[tier] || 19
  // Paystack amount in smallest currency unit (e.g. cents for USD = amount * 100)
  const amountInSubunits = amountUSD * 100
  const reference = `Akosil_sub_${user.id}_${tier}_${Date.now()}`

  const payload = {
    key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    email: user.email || 'user@Visiolog.com',
    amount: amountInSubunits,
    currency: 'USD',
    ref: reference,
    metadata: {
      userId: user.id,
      tier,
      custom_fields: [
        {
          display_name: 'User ID',
          variable_name: 'userId',
          value: user.id,
        },
        {
          display_name: 'Tier',
          variable_name: 'tier',
          value: tier,
        },
      ],
    },
  }

  return {
    success: true,
    payload,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  }
}

export async function verifyAndUpdateSubscription(reference: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const txData = await verifyPaystackTransaction(reference)

    if (txData && txData.status === 'success') {
      const tier = (txData.metadata?.tier || 'pro') as 'pro' | 'enterprise'
      
      const expectedPricesCents = {
        pro: 1900,
        enterprise: 9900,
      }
      const requiredAmount = expectedPricesCents[tier] || 1900

      // Mitigate amount tampering
      if (typeof txData.amount === 'number' && txData.amount < requiredAmount) {
        throw new Error(`Underpayment detected: received $${(txData.amount / 100).toFixed(2)}, required $${(requiredAmount / 100).toFixed(2)}.`)
      }

      // Update User Profile Subscription Tier in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          tier: tier,
          subscription_status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update user profile subscription:', updateError)
        throw new Error('Payment verified, but there was an issue updating your account. Please contact support.')
      }

      return { success: true, tier }
    } else {
      throw new Error('Paystack payment validation failed or incomplete.')
    }
  } catch (err: any) {
    console.error('[Paystack Verification Error]', err)
    return { success: false, error: err.message || 'Verification failed.' }
  }
}
