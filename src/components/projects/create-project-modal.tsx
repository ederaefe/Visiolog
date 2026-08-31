'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createProject } from '@/app/actions/project-actions'

export function CreateProjectModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    setLoading(true)
    const result = await createProject(formData)
    setLoading(false)
    
    if (result.error) {
      toast.error(result.error)
      return
    }

    setOpen(false)
    if (result.data) {
        toast.success("Project created successfully")
        router.push(`/workspace/${result.data.id}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ className: "gap-1.5 shadow-xs hover:scale-105 active:scale-95 transition-all duration-300" })}>
          <Plus className="h-4 w-4" />
          <span>New</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Create a workspace for your document tables.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Weekly Attendance"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Brief description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
