/**
 * Multi-Key API Key Rotation & Load Balancer Engine
 *
 * Manages atomic round-robin key selection across multiple API keys,
 * tracking key health, cool-down states, rate-limit retries (429),
 * jittered exponential backoff, and transparent fallback execution.
 * 
 * Error Classification:
 *   - Recoverable: 429, 503, 500, RESOURCE_EXHAUSTED, ETIMEDOUT → key rotation + backoff
 *   - Fatal: 400, 401, 403, INVALID_ARGUMENT → immediate throw, no retry
 */

interface KeyStatus {
  key: string
  index: number
  isCoolingDown: boolean
  coolDownUntil: number
  failureCount: number
  consecutiveSuccesses: number
}

// Cache GenAI client instances by API key to avoid per-request GC overhead
const genaiClientCache: Map<string, import('@google/genai').GoogleGenAI> = new Map()

async function getOrCreateGenAIClient(apiKey: string): Promise<import('@google/genai').GoogleGenAI> {
  if (genaiClientCache.has(apiKey)) {
    return genaiClientCache.get(apiKey)!
  }
  const { GoogleGenAI } = await import('@google/genai')
  const client = new GoogleGenAI({ apiKey })
  genaiClientCache.set(apiKey, client)
  return client
}

export { getOrCreateGenAIClient }

class ApiKeyRotator {
  private freeKeys: string[] = []
  private proKeys: string[] = []
  private enterpriseKeys: string[] = []
  private keyStatuses: Map<string, KeyStatus> = new Map()

  private freeCurrentIndex = 0
  private proCurrentIndex = 0
  private enterpriseCurrentIndex = 0
  private coolDownDurationMs = 60 * 1000

  constructor() {
    this.initKeys()
  }

  private initKeys() {
    const rawFreeKeys = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
      process.env.GEMINI_API_KEY_5,
      process.env.GEMINI_API_KEY_6,
      process.env.GEMINI_API_KEY_7,
    ].filter((key): key is string => Boolean(key && key.trim() !== ''))

    const rawProKeys = [
      process.env.GEMINI_API_KEY_8,
      process.env.GEMINI_API_KEY_9,
    ].filter((key): key is string => Boolean(key && key.trim() !== ''))

    const rawEnterpriseKeys = [
      process.env.GEMINI_API_KEY_10,
      process.env.GEMINI_API_KEY_11,
      process.env.GEMINI_API_KEY_12,
    ].filter((key): key is string => Boolean(key && key.trim() !== ''))

    this.freeKeys = Array.from(new Set(rawFreeKeys))
    this.proKeys = Array.from(new Set(rawProKeys)).filter(key => !this.freeKeys.includes(key))
    this.enterpriseKeys = Array.from(new Set(rawEnterpriseKeys)).filter(
      key => !this.freeKeys.includes(key) && !this.proKeys.includes(key),
    )

    let globalIndex = 0
    for (const key of [...this.freeKeys, ...this.proKeys, ...this.enterpriseKeys]) {
      this.keyStatuses.set(key, {
        key,
        index: globalIndex++,
        isCoolingDown: false,
        coolDownUntil: 0,
        failureCount: 0,
        consecutiveSuccesses: 0,
      })
    }
  }

  private tryGetHealthyKeyFromPool(pool: string[], poolType: 'free' | 'pro' | 'enterprise'): string | null {
    if (pool.length === 0) return null

    const now = Date.now()
    let attempts = 0
    const totalKeys = pool.length
    const currentIndex = poolType === 'free'
      ? this.freeCurrentIndex
      : poolType === 'pro'
        ? this.proCurrentIndex
        : this.enterpriseCurrentIndex

    while (attempts < totalKeys) {
      const index = (currentIndex + attempts) % totalKeys
      const key = pool[index]
      const status = this.keyStatuses.get(key)
      if (!status) {
        attempts++
        continue
      }

      // Auto-recover key when cooldown has expired
      if (status.isCoolingDown && now > status.coolDownUntil) {
        status.isCoolingDown = false
        status.failureCount = 0
        status.consecutiveSuccesses = 0
      }

      if (!status.isCoolingDown) {
        const nextIndex = (index + 1) % totalKeys
        if (poolType === 'free') this.freeCurrentIndex = nextIndex
        else if (poolType === 'pro') this.proCurrentIndex = nextIndex
        else this.enterpriseCurrentIndex = nextIndex
        return key
      }

      attempts++
    }

    return null
  }

  public getNextKey(tier: 'free' | 'pro' | 'enterprise' = 'free'): string {
    // Always try free pool first, then escalate based on tier
    const freeKey = this.tryGetHealthyKeyFromPool(this.freeKeys, 'free')
    if (freeKey) return freeKey

    if (tier === 'pro' || tier === 'enterprise') {
      const proKey = this.tryGetHealthyKeyFromPool(this.proKeys, 'pro')
      if (proKey) return proKey
    }

    if (tier === 'enterprise') {
      const enterpriseKey = this.tryGetHealthyKeyFromPool(this.enterpriseKeys, 'enterprise')
      if (enterpriseKey) return enterpriseKey
    }

    const allowedKeys = [...this.freeKeys]
    if (tier === 'pro' || tier === 'enterprise') allowedKeys.push(...this.proKeys)
    if (tier === 'enterprise') allowedKeys.push(...this.enterpriseKeys)

    if (allowedKeys.length === 0) {
      throw new Error('Service is temporarily unavailable. Please try again later.')
    }

    // Fall through: all keys cooling — pick the one whose cooldown expires soonest
    const oldestCooldown = allowedKeys
      .map(key => this.keyStatuses.get(key)!)
      .sort((a, b) => a.coolDownUntil - b.coolDownUntil)[0]

    oldestCooldown.isCoolingDown = false
    return oldestCooldown.key
  }

  public markRateLimited(key: string) {
    const status = this.keyStatuses.get(key)
    if (status) {
      status.isCoolingDown = true
      status.failureCount += 1
      // Exponential backoff: 60s * 2^(failures-1), capped at 5 minutes
      const backoffMs = Math.min(
        this.coolDownDurationMs * Math.pow(2, Math.max(0, status.failureCount - 1)),
        5 * 60 * 1000
      )
      status.coolDownUntil = Date.now() + backoffMs
      console.warn(`[ApiKeyRotator] Key #${status.index + 1} rate-limited. Cooling down for ${Math.round(backoffMs / 1000)}s (failure #${status.failureCount}).`)
    }
  }

  public markSuccess(key: string) {
    const status = this.keyStatuses.get(key)
    if (status) {
      status.consecutiveSuccesses += 1
      // Reset failure count after 3 consecutive successes (half-open recovery)
      if (status.consecutiveSuccesses >= 3) {
        status.failureCount = 0
      }
    }
  }

  /**
   * Classify whether an error is recoverable (should trigger key rotation + retry)
   * or fatal (should throw immediately without wasting more retry budget).
   */
  private isRecoverableError(error: unknown): boolean {
    const msg = String(error instanceof Error ? error.message : error).toLowerCase()
    const isRateLimit = msg.includes('429')
      || msg.includes('quota')
      || msg.includes('rate limit')
      || msg.includes('resource_exhausted')
    const isServerOverload = msg.includes('503')
      || msg.includes('500')
      || msg.includes('service unavailable')
      || msg.includes('internal server error')
      || msg.includes('overloaded')
    const isNetworkTimeout = msg.includes('etimedout')
      || msg.includes('fetch failed')
      || msg.includes('network error')
      || msg.includes('econnreset')
      || msg.includes('timeout')
    return isRateLimit || isServerOverload || isNetworkTimeout
  }

  public async executeWithRotation<T>(
    tier: 'free' | 'pro' | 'enterprise',
    operation: (apiKey: string) => Promise<T>,
  ): Promise<T> {
    let lastError: unknown = null
    const attemptedKeys = new Set<string>()
    const maxRetries = tier === 'enterprise'
      ? this.freeKeys.length + this.proKeys.length + this.enterpriseKeys.length
      : tier === 'pro'
        ? this.freeKeys.length + this.proKeys.length
        : this.freeKeys.length

    for (let attempt = 0; attempt < Math.max(maxRetries, 1); attempt++) {
      const apiKey = this.getNextKey(tier)
      if (attemptedKeys.has(apiKey) && attemptedKeys.size === maxRetries) break
      attemptedKeys.add(apiKey)

      try {
        const result = await operation(apiKey)
        this.markSuccess(apiKey)
        return result
      } catch (error: unknown) {
        lastError = error

        if (this.isRecoverableError(error)) {
          this.markRateLimited(apiKey)
          // Jittered backoff between retries: base 500ms + random 0–500ms jitter
          const jitter = Math.floor(Math.random() * 500)
          const backoff = Math.min(500 * Math.pow(2, attempt) + jitter, 8000)
          console.warn(`[ApiKeyRotator] Recoverable error on key #${this.keyStatuses.get(apiKey)?.index ?? '?'}. Rotating key. Retry ${attempt + 1}/${maxRetries} after ${backoff}ms.`)
          await new Promise(resolve => setTimeout(resolve, backoff))
          continue
        }

        // Non-recoverable (400, 401, 403, INVALID_ARGUMENT, etc.) → fail immediately
        throw error
      }
    }

    throw lastError || new Error('We are experiencing unusually high traffic. Please try again in a few moments.')
  }
}

export const apiKeyRotator = new ApiKeyRotator()
