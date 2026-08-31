/**
 * local-vision-provider.ts
 * Air-gapped, zero-cloud local vision inference provider using Ollama.
 * Connects directly to local Ollama endpoints without outbound internet access.
 */

import { AiExtractionPayload, AiExtractionResult } from './ai-provider-types'

// Default Ollama local endpoint and vision model
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2-vision'

// Construct optimized extraction prompts for vision transcription
export function buildPromptInstructions(
  documentType: 'note' | 'table',
  fixedHeaders: string = '',
  contextRows: string[] = []
): { systemInstruction: string; userPrompt: string } {
  let customHeaderContext = ''
  if (documentType === 'table' && fixedHeaders) {
    customHeaderContext = `
STRICT SCHEMA: Align output table columns to these headers:
<fixed_headers>
${fixedHeaders}
</fixed_headers>

${contextRows.length > 0 ? `<previous_rows>\n${contextRows.join('\n')}\n</previous_rows>` : ''}
Map visible table values to this schema only.`
  }

  const modeInstructions =
    documentType === 'note'
      ? `NOTE MODE:
      - Return only the complete visible text as plain text.
      - Preserve reading order, paragraph breaks, meaningful line breaks, and list numbering.
      - Do not summarize, format as CSV, or add descriptive labels.`
      : `TABLE MODE:
      - Return only valid raw CSV. Do not return Markdown, code fences, explanations, headings, or greetings.
      - Preserve the original top-to-bottom row order and left-to-right column order.
      - Keep every visible row, including rows with blank cells. Keep blank cells empty.
      - Preserve the visible header row. If no header is visible, do not invent one.
      - When a value contains a comma, double quote, or line break, quote the entire CSV field and escape internal double quotes by doubling them.
      - Do not combine separate rows or split rows.${customHeaderContext}`

  const systemInstruction = `You are a meticulous document transcription engine.
Transcribe only what is visibly present in the image.
Do not hallucinate, invent, or extrapolate values.
Return only extracted data without conversational filler or Markdown wrappers.`

  const userPrompt = `${modeInstructions}

OUTPUT:
- Return raw extracted data only.
- No markdown code blocks (do NOT use \`\`\`csv or \`\`\`).`

  return { systemInstruction, userPrompt }
}

// Execute local document extraction through Ollama chat completions endpoint
export async function extractWithOllama(
  payload: AiExtractionPayload,
  customBaseUrl?: string
): Promise<AiExtractionResult> {
  const startTime = Date.now()
  const baseUrl = (customBaseUrl || DEFAULT_OLLAMA_URL).replace(/\/$/, '')
  const model = payload.modelOverride || DEFAULT_OLLAMA_MODEL
  const { systemInstruction, userPrompt } = buildPromptInstructions(
    payload.documentType,
    payload.fixedHeaders,
    payload.contextRows
  )

  const endpoint = `${baseUrl}/api/chat`

  // Format chat payload with base64 image array for Ollama vision models
  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: userPrompt,
        images: [payload.imageBase64],
      },
    ],
    stream: false,
    options: {
      temperature: 0.1,
    },
  }

  // Execute HTTP request to local Ollama instance
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`Ollama request failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const content = data?.message?.content?.trim() || ''

  if (!content) {
    throw new Error('Ollama vision model returned empty extraction response')
  }

  return {
    content,
    provider: 'ollama',
    model,
    durationMs: Date.now() - startTime,
  }
}
