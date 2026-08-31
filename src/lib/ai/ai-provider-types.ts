/**
 * ai-provider-types.ts
 * Type definitions and contracts for Visiolog multi-provider vision AI extraction engine.
 */

// Supported AI vision inference providers
export type AiVisionProviderType = 'gemini' | 'ollama' | 'openrouter' | 'custom'

// Document extraction target mode
export type ExtractionDocumentType = 'note' | 'table'

// Input payload containing document image data and extraction parameters
export interface AiExtractionPayload {
  // Base64 encoded image binary string without data: URL prefix
  imageBase64: string
  // MIME type of the input image (e.g. image/jpeg, image/png, image/webp)
  mimeType: string
  // Extraction mode: structured spreadsheet table or plain note
  documentType: ExtractionDocumentType
  // Optional target column headers for strict table schema alignment
  fixedHeaders?: string
  // Optional previous row values for continuity context
  contextRows?: string[]
  // Specific model override (optional)
  modelOverride?: string
}

// Result returned from a successful vision extraction execution
export interface AiExtractionResult {
  // Raw extracted textual or CSV output
  content: string
  // Provider that fulfilled the extraction
  provider: AiVisionProviderType
  // Specific model identifier utilized
  model: string
  // Total execution latency in milliseconds
  durationMs: number
}

// Configuration options for AI providers
export interface AiProviderConfig {
  // Primary active provider
  primaryProvider: AiVisionProviderType
  // Ollama local endpoint settings
  ollama: {
    baseUrl: string
    defaultModel: string
  }
  // OpenRouter cloud settings
  openrouter: {
    apiKey?: string
    defaultModel: string
    baseUrl: string
  }
  // Google Gemini settings
  gemini: {
    apiKeys: string[]
    defaultModel: string
  }
  // Custom OpenAI-compatible endpoint settings
  custom: {
    baseUrl?: string
    apiKey?: string
    defaultModel?: string
  }
}
