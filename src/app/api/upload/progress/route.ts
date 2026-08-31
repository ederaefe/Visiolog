import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const queueId = searchParams.get('queueId')

  if (!queueId) {
    return new Response('Queue ID required', { status: 400 })
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Simulate progress updates (in real implementation, this would connect to actual queue manager)
        for (let i = 0; i <= 100; i += 10) {
          const data = {
            queueId,
            progress: i,
            status: i === 100 ? 'completed' : 'processing',
            timestamp: Date.now()
          }

          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))

          // Delay between updates
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Send completion signal
        const completion = `data: ${JSON.stringify({ queueId, status: 'completed', progress: 100, timestamp: Date.now() })}\n\n`
        controller.enqueue(encoder.encode(completion))

      } catch (error) {
        const errorData = `data: ${JSON.stringify({ queueId, status: 'error', error: 'Progress stream failed' })}\n\n`
        controller.enqueue(encoder.encode(errorData))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}