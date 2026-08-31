'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Edit2, Check, X, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { updateDocumentName, deleteDocument } from '@/app/actions/workspace-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Document {
  id: string
  file_name: string
  status: string
  uploaded_at: string
  document_type?: 'note' | 'table'
}

export function DocumentList({ 
    documents, 
    selectedDocId, 
    onSelect 
}: { 
    documents: Document[], 
    selectedDocId: string | null, 
    onSelect: (id: string) => void 
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [docToDelete, setDocToDelete] = useState<{ id: string, name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleStartEdit = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation()
    setEditingId(doc.id)
    setEditName(doc.file_name)
  }

  const handleSaveEdit = async (e: React.MouseEvent | React.FormEvent, docId: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!editName.trim()) {
      setEditingId(null)
      return
    }
    try {
      await updateDocumentName(docId, editName.trim())
      toast.success('Document renamed successfully')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename document')
    } finally {
      setEditingId(null)
    }
  }

  const handleDeleteDoc = (e: React.MouseEvent, docId: string, docName: string) => {
    e.stopPropagation()
    setDocToDelete({ id: docId, name: docName })
  }

  const confirmDelete = async () => {
    if (!docToDelete) return
    setIsDeleting(true)
    try {
      await deleteDocument(docToDelete.id)
      toast.success(`Deleted ${docToDelete.name}`)
      if (selectedDocId === docToDelete.id) {
        onSelect('') // Clear selection if the deleted doc was selected
      }
      router.refresh()
      setDocToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        No documents uploaded yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      {documents.map((doc) => {
        const isEditing = editingId === doc.id

        return (
          <div
            key={doc.id}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!isEditing) onSelect(doc.id)
            }}
            className={`group flex items-start gap-3 p-3 rounded-lg transition-colors text-left border cursor-pointer ${
                selectedDocId === doc.id 
                  ? 'bg-primary/5 border-primary/20 shadow-sm' 
                  : 'border-transparent hover:bg-muted focus:border-border'
            }`}
          >
            <div className="mt-1 flex-shrink-0">
                 {doc.document_type === 'note' ? (
                   <FileText className={`w-5 h-5 ${selectedDocId === doc.id ? 'text-primary' : 'text-amber-500'}`} />
                 ) : (
                   <FileSpreadsheet className={`w-5 h-5 ${selectedDocId === doc.id ? 'text-primary' : 'text-blue-500'}`} />
                 )}
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <form onSubmit={(e) => handleSaveEdit(e, doc.id)} className="flex items-center gap-1">
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs font-medium bg-background border border-primary rounded px-1.5 py-0.5 outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button type="submit" onClick={(e) => handleSaveEdit(e, doc.id)} className="p-1 hover:text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={handleCancelEdit} className="p-1 hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between group/name">
                  <p className={`text-sm font-medium truncate ${selectedDocId === doc.id ? 'text-primary' : 'text-foreground'}`}>
                      {doc.file_name}
                  </p>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleStartEdit(e, doc)} 
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                      title="Rename image document"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteDoc(e, doc.id, doc.file_name)} 
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                      title="Delete image document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className={`text-xs font-medium ${
                      doc.status === 'Completed' ? 'text-emerald-500' : 
                      doc.status === 'Failed' ? 'text-destructive' : 
                      'text-amber-500'
                  }`}>
                      {doc.status}
                  </span>
              </div>
            </div>
          </div>
        )
      })}

      {/* Delete Document Confirmation Modal */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && !isDeleting && setDocToDelete(null)}>
        <DialogContent className="sm:max-w-md border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertTriangle className="w-5 h-5 animate-pulse" strokeWidth={2.25} />
              </div>
              <DialogTitle className="text-xl">Delete Document</DialogTitle>
            </div>
            <DialogDescription className="text-base text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{docToDelete?.name}&rdquo;</span>? 
              This will permanently delete the document and all associated extractions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDocToDelete(null)}
              disabled={isDeleting}
              className="font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="font-semibold shadow-sm gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
