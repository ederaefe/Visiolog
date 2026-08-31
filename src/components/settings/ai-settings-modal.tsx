'use client'

/**
 * ai-settings-modal.tsx
 * Enterprise Settings & AI Vision Provider Management Modal.
 * Gives self-hosters and enterprise admins complete sovereignty over inference endpoints,
 * model choices, API keys, storage modes, and privacy toggles.
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Sliders,
  Cpu,
  Globe,
  Sparkles,
  Server,
  Database,
  Shield,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { AiVisionProviderType } from '@/lib/ai/ai-provider-types'

// Props interface for the settings modal
export interface AiSettingsModalProps {
  // Modal visibility open state
  open: boolean
  // Modal visibility change handler
  onOpenChange: (open: boolean) => void
}

// Enterprise AI & Storage Settings component
export function AiSettingsModal({ open, onOpenChange }: AiSettingsModalProps) {
  // Provider selection state
  const [provider, setProvider] = useState<AiVisionProviderType>('ollama')

  // Ollama local endpoint settings
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3.2-vision')
  const [isTestingOllama, setIsTestingOllama] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'online' | 'offline'>('idle')

  // OpenRouter settings
  const [openRouterKey, setOpenRouterKey] = useState('')
  const [openRouterModel, setOpenRouterModel] = useState('meta-llama/llama-3.2-11b-vision-instruct')

  // Gemini settings
  const [geminiKey, setGeminiKey] = useState('')

  // Custom endpoint settings
  const [customUrl, setCustomUrl] = useState('')
  const [customKey, setCustomKey] = useState('')
  const [customModel, setCustomModel] = useState('')

  // Storage backend mode
  const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local')

  // Telemetry privacy mode
  const [telemetryEnabled, setTelemetryEnabled] = useState(false)

  // Hydrate settings from localStorage upon mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('visiolog_ai_provider') as AiVisionProviderType
      if (savedProvider) setProvider(savedProvider)

      const savedOllamaUrl = localStorage.getItem('visiolog_ollama_url')
      if (savedOllamaUrl) setOllamaUrl(savedOllamaUrl)

      const savedOllamaModel = localStorage.getItem('visiolog_ollama_model')
      if (savedOllamaModel) setOllamaModel(savedOllamaModel)

      const savedOpenRouterKey = localStorage.getItem('visiolog_openrouter_key')
      if (savedOpenRouterKey) setOpenRouterKey(savedOpenRouterKey)

      const savedOpenRouterModel = localStorage.getItem('visiolog_openrouter_model')
      if (savedOpenRouterModel) setOpenRouterModel(savedOpenRouterModel)

      const savedGeminiKey = localStorage.getItem('visiolog_gemini_key')
      if (savedGeminiKey) setGeminiKey(savedGeminiKey)

      const savedCustomUrl = localStorage.getItem('visiolog_custom_url')
      if (savedCustomUrl) setCustomUrl(savedCustomUrl)

      const savedCustomKey = localStorage.getItem('visiolog_custom_key')
      if (savedCustomKey) setCustomKey(savedCustomKey)

      const savedCustomModel = localStorage.getItem('visiolog_custom_model')
      if (savedCustomModel) setCustomModel(savedCustomModel)

      const savedStorageMode = localStorage.getItem('visiolog_storage_mode') as 'local' | 'cloud'
      if (savedStorageMode) setStorageMode(savedStorageMode)

      const savedTelemetry = localStorage.getItem('visiolog_telemetry') === 'true'
      setTelemetryEnabled(savedTelemetry)
    }
  }, [open])

  // Test connectivity to local Ollama server
  const testOllamaConnection = async () => {
    setIsTestingOllama(true)
    setOllamaStatus('idle')
    try {
      const targetUrl = ollamaUrl.replace(/\/$/, '')
      const res = await fetch(`${targetUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        setOllamaStatus('online')
        toast.success('Ollama connected')
      } else {
        setOllamaStatus('offline')
        toast.error(`Ollama error: HTTP ${res.status}`)
      }
    } catch {
      setOllamaStatus('offline')
      toast.error('Cannot connect to Ollama')
    } finally {
      setIsTestingOllama(false)
    }
  }

  // Save all enterprise preferences to local storage
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('visiolog_ai_provider', provider)
      localStorage.setItem('visiolog_ollama_url', ollamaUrl)
      localStorage.setItem('visiolog_ollama_model', ollamaModel)
      if (openRouterKey) localStorage.setItem('visiolog_openrouter_key', openRouterKey)
      localStorage.setItem('visiolog_openrouter_model', openRouterModel)
      if (geminiKey) localStorage.setItem('visiolog_gemini_key', geminiKey)
      if (customUrl) localStorage.setItem('visiolog_custom_url', customUrl)
      if (customKey) localStorage.setItem('visiolog_custom_key', customKey)
      if (customModel) localStorage.setItem('visiolog_custom_model', customModel)
      localStorage.setItem('visiolog_storage_mode', storageMode)
      localStorage.setItem('visiolog_telemetry', String(telemetryEnabled))

      toast.success('Settings saved')
      onOpenChange(false)
    } catch {
      toast.error('Failed to save settings')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card text-card-foreground rounded-2xl p-6 border border-border shadow-2xl overflow-y-auto max-h-[88vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-serif">
                System Settings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure inference providers, storage backends, and privacy preferences.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 my-4">
          {/* 1. AI Vision Inference Provider Selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Vision Provider</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {/* Ollama Option */}
              <button
                type="button"
                onClick={() => setProvider('ollama')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'ollama'
                    ? 'border-primary bg-primary/5 shadow-xs font-semibold'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-foreground">Ollama</span>
                  </div>
                  {provider === 'ollama' && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Local offline inference
                </p>
              </button>

              {/* OpenRouter Option */}
              <button
                type="button"
                onClick={() => setProvider('openrouter')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'openrouter'
                    ? 'border-primary bg-primary/5 shadow-xs font-semibold'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-foreground">OpenRouter</span>
                  </div>
                  {provider === 'openrouter' && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Multi-model cloud API
                </p>
              </button>

              {/* Gemini Option */}
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'gemini'
                    ? 'border-primary bg-primary/5 shadow-xs font-semibold'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-foreground">Gemini</span>
                  </div>
                  {provider === 'gemini' && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Google Gemini Flash
                </p>
              </button>

              {/* Custom OpenAI Option */}
              <button
                type="button"
                onClick={() => setProvider('custom')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'custom'
                    ? 'border-primary bg-primary/5 shadow-xs font-semibold'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-foreground">Custom</span>
                  </div>
                  {provider === 'custom' && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  OpenAI-compatible URL
                </p>
              </button>
            </div>
          </div>

          {/* 2. Provider-Specific Detail Fields */}
          {provider === 'ollama' && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Ollama Endpoint URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={testOllamaConnection}
                    disabled={isTestingOllama}
                    className="text-xs"
                  >
                    {isTestingOllama ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
                {ollamaStatus === 'online' && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    Connected to local Ollama instance
                  </p>
                )}
                {ollamaStatus === 'offline' && (
                  <p className="text-[11px] text-destructive mt-1">
                    Could not reach Ollama at this address
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Vision Model</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="llama3.2-vision"
                  className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Recommended: llama3.2-vision, minicpm-v, llava, qwen2.5-vl
                </p>
              </div>
            </div>
          )}

          {provider === 'openrouter' && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">OpenRouter API Key</label>
                <input
                  type="password"
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Model Identifier</label>
                <input
                  type="text"
                  value={openRouterModel}
                  onChange={(e) => setOpenRouterModel(e.target.value)}
                  placeholder="meta-llama/llama-3.2-11b-vision-instruct"
                  className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                />
              </div>
            </div>
          )}

          {provider === 'gemini' && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Google Gemini API Key</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty to utilize server-configured environment keys.
                </p>
              </div>
            </div>
          )}

          {provider === 'custom' && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Endpoint URL</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="http://localhost:8080/v1/chat/completions"
                  className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Bearer Token / Key</label>
                <input
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Optional token"
                  className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Model Name</label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="default"
                  className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                />
              </div>
            </div>
          )}

          {/* 3. Storage Backend Mode */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>Storage Mode</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStorageMode('local')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  storageMode === 'local'
                    ? 'border-primary bg-primary/5 shadow-xs font-semibold'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Local IndexedDB</span>
                  {storageMode === 'local' && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Offline standalone storage
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStorageMode('cloud')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  storageMode === 'cloud'
                    ? 'border-primary bg-primary/5 shadow-xs font-semibold'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Supabase Cloud</span>
                  {storageMode === 'cloud' && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Database synchronization
                </p>
              </button>
            </div>

            {/* Database Studio Direct Link */}
            <div className="pt-1">
              <a
                href="/database"
                className="w-full py-2 px-3 rounded-xl border border-border hover:border-primary/50 bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-2 transition-all"
              >
                <Database className="w-3.5 h-3.5 text-primary" />
                <span>Open Database Studio</span>
              </a>
            </div>
          </div>

          {/* 4. Privacy & Telemetry Toggle */}
          <div className="p-3.5 rounded-xl border border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-foreground">External Telemetry</p>
                <p className="text-[10px] text-muted-foreground">
                  Send performance diagnostics to external services
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTelemetryEnabled((prev) => !prev)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
                telemetryEnabled ? 'bg-primary justify-end' : 'bg-muted justify-start'
              }`}
              aria-label="Toggle Telemetry"
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveSettings}
            className="text-xs"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
