import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('verif-hash')
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH

    if (!signature || signature !== secretHash) {
      return NextResponse.json({ error: 'Invalid webhook signature hash.' }, { status: 401 })
    }

    const payload = await req.json()
    const { event, data } = payload

    if (event === 'charge.completed' && data.status === 'successful') {
      const userId = data.meta?.userId
      const tier = (data.meta?.tier || 'pro') as 'free' | 'pro' | 'enterprise'

      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            tier,
            flutterwave_customer_id: String(data.customer?.id || ''),
            flutterwave_tx_ref: data.tx_ref,
            subscription_status: 'active',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', userId)

        console.log(`[Flutterwave Webhook] User ${userId} upgraded to ${tier} successfully.`)
      }
    }

    return NextResponse.json({ status: 'success' })
  } catch (err: any) {
    console.error('[Flutterwave Webhook Error]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
