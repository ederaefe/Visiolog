'use client'

import { logSystemError, SystemErrorLogPayload } from '@/app/actions/system-log-actions'

/**
 * Reports a system error to the admin telemetry dashboard.
 * Captures stack trace, context, route, and environment details.
 * Strictly captures system diagnostic metadata — NEVER raw user files or sensitive data.
 */
export async function reportSystemError(
  error: unknown,
  context: string = 'CLIENT_GENERAL',
  metadata?: Record<string, any>
) {
  try {
    let errorMessage = 'Unknown error occurred'
    let errorStack = ''
    let errorCode = ''

    if (error instanceof Error) {
      errorMessage = error.message
      errorStack = error.stack || ''
      errorCode = (error as any).code || ''
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = (error as any).message || JSON.stringify(error)
      errorStack = (error as any).stack || ''
    }

    const payload: SystemErrorLogPayload = {
      errorMessage,
      errorStack,
      errorCode,
      context,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      level: 'error',
      origin: 'client',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      metadata: metadata || {},
    }

    // Call server action silently
    await logSystemError(payload)
  } catch (err) {
    // Failsafe: avoid crashing the client if logging fails
    console.warn('[SystemLogger] Failed to dispatch error telemetry:', err)
  }
}
