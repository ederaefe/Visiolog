'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { updateProject, deleteProject } from '@/app/actions/project-actions'
import { MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ProjectCardActionsProps {
  project: {
    id: string
    name: string
    description?: string | null
  }
  userTier?: string
}

export function ProjectCardActions({ project, userTier = 'free' }: ProjectCardActionsProps) {
  const isRecents = project.name?.toLowerCase() === 'recents'
  if (isRecents) return null

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      const res = await updateProject(project.id, name.trim(), description.trim())
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Project updated successfully')
        setIsEditOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update project')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const res = await deleteProject(project.id)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Project deleted successfully')
        setIsDeleteOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-muted"
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); setIsEditOpen(true); }} 
              className="cursor-pointer gap-2"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); setIsDeleteOpen(true); }} 
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="font-serif">Edit Project</DialogTitle>
              <DialogDescription>
                Update project title and description.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-1 focus:ring-ring min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-destructive">Delete Project</DialogTitle>
            <DialogDescription>
              Permanently delete <strong className="text-foreground">{project.name}</strong> and all associated scanned documents?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
