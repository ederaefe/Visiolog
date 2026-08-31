import { NextRequest, NextResponse } from 'next/server'
import { logSystemError } from '@/app/actions/system-log-actions'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body || !body.errorMessage) {
      return NextResponse.json({ error: 'Missing errorMessage' }, { status: 400 })
    }

    const res = await logSystemError({
      errorMessage: body.errorMessage,
      errorStack: body.errorStack,
      errorCode: body.errorCode,
      context: body.context || 'API_TELEMETRY',
      route: body.route,
      level: body.level || 'error',
      origin: body.origin || 'client',
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: body.metadata,
      userId: body.userId,
      userEmail: body.userEmail,
    })

    return NextResponse.json(res)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
