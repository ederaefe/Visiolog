import { FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react'

export type DocumentType = 'note' | 'table'

export function getDocumentTypeLabel(type?: DocumentType): string {
  return type === 'note' ? 'Note' : 'Table'
}

export function getDocumentTypeIcon(type?: DocumentType): LucideIcon {
  return type === 'note' ? FileText : FileSpreadsheet
}
