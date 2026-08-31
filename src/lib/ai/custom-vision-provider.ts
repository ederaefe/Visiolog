/**
 * custom-vision-provider.ts
 * Custom OpenAI-compatible vision endpoint provider.
 * Enables integration with LocalAI, vLLM, LM Studio, or private enterprise endpoints.
 */

import { AiExtractionPayload, AiExtractionResult } from './ai-provider-types'
import { buildPromptInstructions } from './local-vision-provider'

// Execute extraction using custom OpenAI-compatible vision endpoint
export async function extractWithCustomEndpoint(
  payload: AiExtractionPayload,
  baseUrl?: string,
  apiKey?: string,
  modelName?: string
): Promise<AiExtractionResult> {
  const startTime = Date.now()
  const endpointUrl = baseUrl || process.env.CUSTOM_VISION_URL || 'http://localhost:8080/v1/chat/completions'
  const activeKey = apiKey || process.env.CUSTOM_VISION_API_KEY || 'dummy'
  const model = modelName || payload.modelOverride || process.env.CUSTOM_VISION_MODEL || 'default'

  const { systemInstruction, userPrompt } = buildPromptInstructions(
    payload.documentType,
    payload.fixedHeaders,
    payload.contextRows
  )

  const formattedDataUrl = `data:${payload.mimeType || 'image/jpeg'};base64,${payload.imageBase64}`

  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: formattedDataUrl,
            },
          },
        ],
      },
    ],
    temperature: 0.1,
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`Custom vision endpoint failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content?.trim() || ''

  if (!content) {
    throw new Error('Custom vision endpoint returned empty response')
  }

  return {
    content,
    provider: 'custom',
    model,
    durationMs: Date.now() - startTime,
  }
}
