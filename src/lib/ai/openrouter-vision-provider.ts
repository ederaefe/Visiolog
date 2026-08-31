/**
 * openrouter-vision-provider.ts
 * OpenRouter AI provider implementation for multimodal document extraction.
 * Communicates with OpenRouter OpenAI-compatible chat completions endpoint.
 */

import { AiExtractionPayload, AiExtractionResult } from './ai-provider-types'
import { buildPromptInstructions } from './local-vision-provider'

// Default OpenRouter configuration
const DEFAULT_OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-11b-vision-instruct'

// Execute document extraction through OpenRouter API
export async function extractWithOpenRouter(
  payload: AiExtractionPayload,
  apiKey?: string,
  modelName?: string
): Promise<AiExtractionResult> {
  const startTime = Date.now()
  const activeKey = apiKey || process.env.OPENROUTER_API_KEY

  if (!activeKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on this instance')
  }

  const model = modelName || payload.modelOverride || DEFAULT_OPENROUTER_MODEL
  const { systemInstruction, userPrompt } = buildPromptInstructions(
    payload.documentType,
    payload.fixedHeaders,
    payload.contextRows
  )

  // Construct standard OpenAI multimodal image URL payload
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

  const response = await fetch(DEFAULT_OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://visiolog.local',
      'X-Title': 'Visiolog Document Studio',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`OpenRouter API failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content?.trim() || ''

  if (!content) {
    throw new Error('OpenRouter vision model returned an empty extraction response')
  }

  return {
    content,
    provider: 'openrouter',
    model,
    durationMs: Date.now() - startTime,
  }
}
