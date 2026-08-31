import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

/**
 * POST /api/webhooks/paystack
 * 
 * Paystack Webhook Handler
 * Verifies Paystack HMAC SHA512 signature and updates user subscription on 'charge.success'.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-paystack-signature')
    const secretKey = process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      console.error('[Paystack Webhook] PAYSTACK_SECRET_KEY is not configured.')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    // Verify HMAC SHA512 signature
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex')

    if (hash !== signature) {
      console.warn('[Paystack Webhook] Invalid signature rejected.')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody)

    if (event.event === 'charge.success') {
      const data = event.data
      const userId = data.metadata?.userId
      const tier = (data.metadata?.tier || 'pro') as 'pro' | 'enterprise'

      const expectedPricesCents = {
        pro: 1900,
        enterprise: 9900,
      }
      const requiredAmount = expectedPricesCents[tier] || 1900

      // Block underpayment fraud in webhook
      if (typeof data.amount === 'number' && data.amount < requiredAmount) {
        console.warn(`[Paystack Webhook] Underpayment fraud attempt for user ${userId}: received ${data.amount}, expected ${requiredAmount}`)
        return NextResponse.json({ error: 'Underpayment detected' }, { status: 400 })
      }

      if (userId) {
        const supabase = await createClient()

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            tier: tier,
            subscription_status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[Paystack Webhook] Database update error:', updateError)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }

        console.log(`[Paystack Webhook] User ${userId} upgraded to ${tier} successfully.`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Paystack Webhook Error]', err)
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
  }
}
