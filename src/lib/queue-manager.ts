/**
 * Abstract Queue Management System
 * 
 * Provides a clean interface for managing sequential or concurrent processing queues
 * with comprehensive error handling, progress tracking, and recovery mechanisms.
 * 
 * Key Features:
 *   - Configurable concurrency (bounded worker pool, default 1 = sequential)
 *   - Per-item fault isolation: one failure never aborts remaining items
 *   - Exponential backoff retry with jitter per item
 *   - Timeout enforcement per item via AbortSignal
 *   - Circuit breaker pattern for systematic failures
 */

export interface QueueItem<T> {
  id: string
  data: T
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  stage: 'queued' | 'uploading' | 'analyzing' | 'extracting' | 'completing' | 'error'
  error?: string
  result?: unknown
  startedAt?: number
  completedAt?: number
  retryCount?: number
}

export interface QueueOptions<T> {
  processor: (item: T, context: ProcessingContext) => Promise<unknown>
  onProgress?: (item: QueueItem<T>, progress: number) => void
  onComplete?: (item: QueueItem<T>, result: unknown) => void
  onError?: (item: QueueItem<T>, error: Error) => void
  onStageChange?: (item: QueueItem<T>, stage: string) => void
  /** Number of items to process concurrently. Default: 1 (sequential). */
  concurrency?: number
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

export interface ProcessingContext {
  abortSignal: AbortSignal
  itemId: string
  queueId: string
}

export class QueueManager<T> {
  private queue: QueueItem<T>[] = []
  private isProcessing = false
  private abortController: AbortController | null = null
  private options: Required<QueueOptions<T>>
  private queueId: string
  private circuitBreaker: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map()

  constructor(options: QueueOptions<T>) {
    this.queueId = `queue-${Date.now()}-${Math.random().toString(36).substring(7)}`
    this.options = {
      processor: options.processor,
      onProgress: options.onProgress || (() => {}),
      onComplete: options.onComplete || (() => {}),
      onError: options.onError || (() => {}),
      onStageChange: options.onStageChange || (() => {}),
      concurrency: Math.max(1, options.concurrency ?? 1),
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      timeout: options.timeout ?? 45000,
    }
  }

  /**
   * Add items to the queue
   */
  add(items: T[]): string[] {
    const itemIds: string[] = []

    for (const data of items) {
      const item: QueueItem<T> = {
        id: `${this.queueId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        data,
        status: 'queued',
        stage: 'queued',
        progress: 0,
        retryCount: 0,
      }
      this.queue.push(item)
      itemIds.push(item.id)
    }

    return itemIds
  }

  /**
   * Get current queue state
   */
  getState(): QueueItem<T>[] {
    return [...this.queue]
  }

  /**
   * Get specific item by ID
   */
  getItem(id: string): QueueItem<T> | undefined {
    return this.queue.find(item => item.id === id)
  }

  /**
   * Remove item from queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Clear all items from queue
   */
  clear(): void {
    this.queue = []
    this.abortController?.abort()
    this.abortController = null
    this.isProcessing = false
  }

  /**
   * Start processing the queue with bounded concurrency.
   * Uses a worker pool pattern: maintains up to `concurrency` items processing simultaneously.
   * Each item's failure is isolated — other workers continue unaffected.
   */
  async start(): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Queue is already processing')
    }

    this.isProcessing = true
    this.abortController = new AbortController()

    try {
      const concurrency = this.options.concurrency
      const pendingItems = this.queue.filter(item => item.status !== 'completed')

      if (concurrency <= 1) {
        // Sequential mode (original behavior)
        for (const item of pendingItems) {
          if (this.abortController.signal.aborted) break
          await this.processItem(item)
        }
      } else {
        // Concurrent bounded worker pool
        let nextIndex = 0

        const runWorker = async (): Promise<void> => {
          while (nextIndex < pendingItems.length) {
            if (this.abortController?.signal.aborted) break

            const item = pendingItems[nextIndex]
            nextIndex++

            // Skip already completed items
            if (item.status === 'completed') continue

            // Fault-isolated: each item's error is caught independently
            await this.processItem(item).catch(() => {
              // processItem already calls onError — swallow here to keep pool alive
            })
          }
        }

        // Launch pool of workers, each running items until exhausted
        const workers = Array.from({ length: Math.min(concurrency, pendingItems.length) }, () => runWorker())
        await Promise.all(workers)
      }
    } finally {
      this.isProcessing = false
      this.abortController = null
    }
  }

  /**
   * Abort current processing
   */
  abort(): void {
    this.abortController?.abort()
    this.isProcessing = false
  }

  /**
   * Check if queue is processing
   */
  isActive(): boolean {
    return this.isProcessing
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const total = this.queue.length
    const completed = this.queue.filter(i => i.status === 'completed').length
    const failed = this.queue.filter(i => i.status === 'failed').length
    const processing = this.queue.filter(i => i.status === 'processing').length
    const queued = this.queue.filter(i => i.status === 'queued').length

    return {
      total,
      completed,
      failed,
      processing,
      queued,
      progress: total > 0 ? (completed / total) * 100 : 0,
    }
  }

  /**
   * Circuit breaker: prevents the system from repeatedly calling a
   * service that is already consistently failing.
   */
  private checkCircuitBreaker(operationId: string): boolean {
    const breaker = this.circuitBreaker.get(operationId)
    if (!breaker) return false

    const now = Date.now()
    const cooldownPeriod = 60000 // 1 minute

    if (breaker.isOpen && now - breaker.lastFailure > cooldownPeriod) {
      // Half-open: reset after cooldown to allow probe request
      this.circuitBreaker.set(operationId, { failures: 0, lastFailure: 0, isOpen: false })
      return false
    }

    return breaker.isOpen
  }

  private recordCircuitBreakerFailure(operationId: string): void {
    const breaker = this.circuitBreaker.get(operationId) || { failures: 0, lastFailure: 0, isOpen: false }
    breaker.failures++
    breaker.lastFailure = Date.now()

    // Open circuit after 5 consecutive failures (more tolerant than before)
    if (breaker.failures >= 5) {
      breaker.isOpen = true
      console.warn(`[QueueManager] Circuit breaker OPEN for ${operationId}`)
    }

    this.circuitBreaker.set(operationId, breaker)
  }

  private recordCircuitBreakerSuccess(operationId: string): void {
    const breaker = this.circuitBreaker.get(operationId)
    if (breaker) {
      breaker.failures = 0
      breaker.isOpen = false
      this.circuitBreaker.set(operationId, breaker)
    }
  }

  /**
   * Process a single item with retry logic, timeout, and circuit breaker.
   * Per-item fault isolation: throws only after all retries exhausted.
   */
  private async processItem(item: QueueItem<T>): Promise<void> {
    let lastError: Error | null = null
    const operationId = 'queue-processor-service'

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      if (this.abortController?.signal?.aborted) {
        item.status = 'failed'
        item.stage = 'error'
        item.error = 'Processing aborted'
        this.options.onError(item, new Error('Processing aborted'))
        return
      }

      // Check circuit breaker before attempting
      if (this.checkCircuitBreaker(operationId)) {
        item.status = 'failed'
        item.stage = 'error'
        item.error = 'Service temporarily unavailable (circuit open)'
        this.options.onError(item, new Error('Circuit breaker is open'))
        return
      }

      const itemAbortController = new AbortController()
      const forwardAbort = () => itemAbortController.abort()
      this.abortController?.signal.addEventListener('abort', forwardAbort)

      let timeoutTimer: NodeJS.Timeout | null = null

      try {
        item.status = 'processing'
        item.stage = 'uploading'
        item.startedAt = Date.now()
        item.progress = 0
        item.retryCount = attempt
        this.options.onStageChange(item, 'uploading')

        const context: ProcessingContext = {
          abortSignal: itemAbortController.signal,
          itemId: item.id,
          queueId: this.queueId,
        }

        // Stage transitions to show progress
        item.stage = 'analyzing'
        item.progress = 25
        this.options.onStageChange(item, 'analyzing')
        this.options.onProgress(item, 25)

        item.stage = 'extracting'
        item.progress = 50
        this.options.onStageChange(item, 'extracting')
        this.options.onProgress(item, 50)

        // Race: processor vs timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => {
            itemAbortController.abort()
            reject(new Error(`Operation timeout after ${this.options.timeout}ms`))
          }, this.options.timeout)
        })

        const result = await Promise.race([
          this.options.processor(item.data, context),
          timeoutPromise,
        ])

        if (timeoutTimer) clearTimeout(timeoutTimer)

        item.stage = 'completing'
        item.progress = 90
        this.options.onStageChange(item, 'completing')
        this.options.onProgress(item, 90)

        item.status = 'completed'
        item.stage = 'completing'
        item.progress = 100
        item.completedAt = Date.now()
        item.result = result

        this.recordCircuitBreakerSuccess(operationId)
        this.options.onComplete(item, result)
        return

      } catch (error) {
        if (timeoutTimer) clearTimeout(timeoutTimer)
        lastError = error as Error
        item.stage = 'error'
        this.recordCircuitBreakerFailure(operationId)

        // Timeout or abort: don't retry
        if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('aborted'))) {
          break
        }

        // Jittered exponential backoff between retries
        if (attempt < this.options.maxRetries) {
          const jitter = Math.floor(Math.random() * 500)
          const delay = Math.min(this.options.retryDelay * Math.pow(2, attempt) + jitter, 15000)
          await this.sleep(delay)
        }
      } finally {
        this.abortController?.signal.removeEventListener('abort', forwardAbort)
      }
    }

    // All retries exhausted
    item.status = 'failed'
    item.stage = 'error'
    item.error = lastError?.message || 'Unknown error'
    item.completedAt = Date.now()
    this.options.onError(item, lastError || new Error('Unknown error'))
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Factory function to create a queue manager
 */
export function createQueueManager<T>(options: QueueOptions<T>): QueueManager<T> {
  return new QueueManager(options)
}