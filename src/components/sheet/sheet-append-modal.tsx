'use client'

/**
 * sheet-append-modal.tsx
 * Dialog for reviewing and appending unappended document scans to the master sheet.
 */

import React, { useState } from 'react'
import Papa from 'papaparse'
import { ArrowLeft, Check, CheckCircle2, Layers, Loader2, Plus, Table2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { type UnappendedScanItem } from '@/app/actions/project-sheet-actions'

interface SheetAppendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scans: UnappendedScanItem[]
  isLoading: boolean
  isAppending: boolean
  onAppendOne: (id: string) => void
  masterHeaders: string[]
}

export function SheetAppendModal({
  open,
  onOpenChange,
  scans,
  isLoading,
  isAppending,
  onAppendOne,
  masterHeaders,
}: SheetAppendModalProps) {
  const [selectedScan, setSelectedScan] = useState<UnappendedScanItem | null>(null)
  const [step, setStep] = useState<'list' | 'preview' | 'headers'>('list')

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedScan(null)
      setStep('list')
    }
    onOpenChange(nextOpen)
  }

  const incomingHeaders = selectedScan?.headers || []
  const targetHeaders = masterHeaders.length > 0 ? masterHeaders : incomingHeaders
  const headersMatch = incomingHeaders.length > 0 && incomingHeaders.length === targetHeaders.length && incomingHeaders.every(
    (header, index) => header.trim().toLowerCase() === targetHeaders[index]?.trim().toLowerCase()
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/60 p-5 rounded-3xl">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            {step !== 'list' && (
              <button onClick={() => setStep(step === 'headers' ? 'preview' : 'list')} className="p-1 rounded-lg hover:bg-muted" title="Back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Layers className="w-4 h-4 text-primary" />
            <span>{step === 'list' ? 'Import Scan' : step === 'preview' ? 'Scan Preview' : 'Header Alignment Review'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {step === 'list' && 'Choose a pending scan to preview before importing it into this sheet.'}
            {step === 'preview' && 'Confirm the extracted rows before checking their table headers.'}
            {step === 'headers' && 'Incoming headers must match the master table before import.'}
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {step === 'list' && isLoading ? (
            <LoadingState />
          ) : step === 'list' && scans.length === 0 ? (
            <EmptyState />
          ) : step === 'list' ? (
            scans.map((scan) => (
              <ScanRow
                key={scan.documentId}
                scan={scan}
                onSelect={() => {
                  setSelectedScan(scan)
                  setStep('preview')
                }}
              />
            ))
          ) : selectedScan ? step === 'preview' ? (
            <PreviewTable csvData={selectedScan.csvData} />
          ) : (
            <HeaderReview incomingHeaders={incomingHeaders} targetHeaders={targetHeaders} matches={headersMatch} />
          ) : null}
        </div>

        {selectedScan && step === 'preview' && (
          <button onClick={() => setStep('headers')} className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2">
            <Table2 className="w-3.5 h-3.5" />
            Review Table Headers
          </button>
        )}

        {selectedScan && step === 'headers' && (
          <div className="pt-2 border-t border-border/40">
            <button
              onClick={() => onAppendOne(selectedScan.documentId)}
              disabled={isAppending || !headersMatch}
              className="w-full py-2.5 rounded-2xl bg-[#145200] text-white text-xs font-bold active:scale-98 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isAppending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Check className="w-3.5 h-3.5" />
              }
              <span>Confirm Import</span>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Internal sub-components ──────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground text-xs">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span>Loading pending scans…</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-xs text-muted-foreground">
      <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-emerald-500" />
      <p className="font-semibold text-foreground">All scans are up to date</p>
      <p className="text-[11px] mt-1">No unappended scans found in this project workspace.</p>
    </div>
  )
}

interface ScanRowProps {
  scan: UnappendedScanItem
  onSelect: () => void
}

function ScanRow({ scan, onSelect }: ScanRowProps) {
  return (
    <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h5 className="text-xs font-bold truncate text-foreground">{scan.fileName}</h5>
        <span className="text-[10px] text-muted-foreground">
          {scan.rowCount} data rows · {scan.headers?.length || 0} columns
        </span>
      </div>
      <button
        onClick={onSelect}
        className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-all flex items-center gap-1 shrink-0 disabled:opacity-60"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Preview</span>
      </button>
    </div>
  )
}

function PreviewTable({ csvData }: { csvData: string }) {
  const rows = Papa.parse<string[]>(csvData, { skipEmptyLines: true }).data.slice(0, 6)
  return (
    <div className="overflow-auto rounded-xl border border-border/60">
      <table className="w-full text-left text-[11px]">
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border/40 last:border-0">
          {row.map((cell, cellIndex) => <td key={cellIndex} className={`p-2 min-w-[100px] ${rowIndex === 0 ? 'font-bold bg-muted/60' : ''}`}>{cell || ' '}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  )
}

function HeaderReview({ incomingHeaders, targetHeaders, matches }: { incomingHeaders: string[]; targetHeaders: string[]; matches: boolean }) {
  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
        <span>Incoming scan</span><span className="font-bold">{incomingHeaders.length} columns</span>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
        <span>Master sheet</span><span className="font-bold">{targetHeaders.length} columns</span>
      </div>
      <div className={matches ? 'text-emerald-600 flex items-center gap-2' : 'text-amber-600 flex items-center gap-2'}>
        <CheckCircle2 className="w-4 h-4" />
        <span>{matches ? 'Headers aligned. This scan is ready to import.' : 'Headers do not align. Adjust the scan or master sheet before importing.'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {incomingHeaders.map((header, index) => <div key={`${header}-${index}`} className="rounded-lg border border-border/50 px-2 py-1.5 truncate">{header}</div>)}
      </div>
    </div>
  )
}
