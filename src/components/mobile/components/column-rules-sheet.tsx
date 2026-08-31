'use client'

import React, { useState } from 'react'
import {
  X,
  TableProperties,
  Sparkles,
  Check,
  Type,
  Hash,
  Calendar,
  DollarSign,
  Mail,
  ToggleLeft,
  Trash2,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/haptics'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type ColumnDataType = 'text' | 'number' | 'date' | 'currency' | 'email' | 'boolean'

export interface ColumnRule {
  colIndex: number
  headerName: string
  dataType: ColumnDataType
  aiPrompt?: string
  required?: boolean
}

interface ColumnRulesSheetProps {
  isOpen: boolean
  colIndex: number
  currentHeader: string
  existingRule?: ColumnRule
  onSaveRule: (rule: ColumnRule) => void
  onDeleteColumn?: (colIndex: number) => void
  onClose: () => void
}

export function ColumnRulesSheet({
  isOpen,
  colIndex,
  currentHeader,
  existingRule,
  onSaveRule,
  onDeleteColumn,
  onClose,
}: ColumnRulesSheetProps) {
  const [headerName, setHeaderName] = useState(existingRule?.headerName || currentHeader || '')
  const [dataType, setDataType] = useState<ColumnDataType>(existingRule?.dataType || 'text')
  const [aiPrompt, setAiPrompt] = useState(existingRule?.aiPrompt || '')
  const [required, setRequired] = useState(existingRule?.required || false)

  if (!isOpen) return null

  const dataTypes: Array<{ type: ColumnDataType; label: string; icon: any }> = [
    { type: 'text', label: 'Text', icon: Type },
    { type: 'number', label: 'Number', icon: Hash },
    { type: 'currency', label: 'Currency ($ / ₦)', icon: DollarSign },
    { type: 'date', label: 'Date', icon: Calendar },
    { type: 'email', label: 'Email', icon: Mail },
    { type: 'boolean', label: 'Yes / No', icon: ToggleLeft },
  ]

  const handleSave = () => {
    if (!headerName.trim()) {
      toast.error('Column name cannot be empty')
    }
    triggerHaptic('success')
    onSaveRule({
      colIndex,
      headerName: headerName.trim(),
      dataType,
      aiPrompt: aiPrompt.trim(),
      required,
    })
    toast.success(`Rule saved for "${headerName.trim()}"`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 border-t sm:border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 flex items-center justify-center">
              <TableProperties className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Column Settings
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                Column {colIndex + 1} • {currentHeader}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-0.5">
          
          {/* Column Header Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1">
              Column Title
            </label>
            <input
              type="text"
              value={headerName}
              onChange={(e) => setHeaderName(e.target.value)}
              placeholder="e.g. Student Name, Price, Date..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 rounded-xl text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 focus:border-[#2E8B57] outline-none"
            />
          </div>

          {/* Data Type Selection Chips */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
              Data Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {dataTypes.map((dt) => {
                const Icon = dt.icon
                const isSelected = dataType === dt.type
                return (
                  <button
                    key={dt.type}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection')
                      setDataType(dt.type)
                    }}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all touch-native-active text-left',
                      isSelected
                        ? 'bg-green-50 dark:bg-emerald-950/60 border-[#2E8B57] text-[#2E8B57] dark:text-emerald-400'
                        : 'bg-gray-50 dark:bg-zinc-800/60 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{dt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* AI Extraction Prompt / Formatting Rule */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#2E8B57]" />
                <span>AI Extraction Guideline</span>
              </label>
              <span className="text-[10px] text-gray-400">Optional</span>
            </div>
            <textarea
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Format date as YYYY-MM-DD, or extract numeric values only without commas..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/80 rounded-xl text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 focus:border-[#2E8B57] outline-none resize-none"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 dark:border-zinc-800">
          {onDeleteColumn ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('warning')
                if (confirm(`Delete column "${currentHeader}"?`)) {
                  onDeleteColumn(colIndex)
                  onClose()
                }
              }}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Col</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm touch-native-active"
            >
              Apply Rule
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
