'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileSpreadsheet,
  FolderOpen,
  Check,
  Pin,
  Search,
  LayoutGrid,
  List,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react'
import { CreateProjectModal } from '@/components/projects/create-project-modal'
import { ProjectCardActions } from '@/components/projects/project-card-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProjectItem {
  id: string
  name: string
  description?: string | null
  updated_at: string
  fixed_rules_enabled?: boolean
  fixed_headers?: string | null
  documents?: { id: string }[]
}

interface ProjectsDirectoryViewProps {
  initialProjects: ProjectItem[]
  userTier?: string
}

type ProjectFilter = 'all' | 'active' | 'recents' | 'rules'

export function ProjectsDirectoryView({ initialProjects, userTier = 'free' }: ProjectsDirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  const filteredProjects = useMemo(() => {
    let list = [...initialProjects]

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
    }

    // Tab filter
    if (activeFilter === 'recents') {
      list = list.filter((p) => p.name.toLowerCase() === 'recents')
    } else if (activeFilter === 'rules') {
      list = list.filter((p) => p.fixed_rules_enabled)
    } else if (activeFilter === 'active') {
      list = list.filter((p) => p.name.toLowerCase() !== 'archived')
    }

    return list
  }, [initialProjects, searchQuery, activeFilter])

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const diff = Date.now() - d.getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 2) return 'Just now'
      if (mins < 60) return `${mins}m ago`
      const hours = Math.floor(mins / 60)
      if (hours < 24) return `${hours}h ago`
      const days = Math.floor(hours / 24)
      if (days < 7) return `${days}d ago`
      return d.toLocaleDateString()
    } catch {
      return 'Recently'
    }
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif">Projects</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Organize digitized documents and access continuous spreadsheets.
          </p>
        </div>

        {/* Controls: Search, Filter Tabs, View Switcher & Create Modal */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Collapsible Search Trigger */}
          <div className="relative flex items-center">
            {isSearchExpanded ? (
              <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    autoFocus
                    onBlur={() => {
                      if (!searchQuery) setIsSearchExpanded(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchQuery('')
                        setIsSearchExpanded(false)
                      }
                    }}
                    className="h-8 pl-8 pr-3 w-36 sm:w-48 text-xs bg-muted/50 border border-border rounded-md focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setIsSearchExpanded(false)
                  }}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchExpanded(true)}
                className="h-8 w-8 rounded-md border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
                title="Search projects (Cmd+F)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border border-border text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-1 rounded transition-colors ${
                activeFilter === 'all' ? 'bg-background font-semibold text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('rules')}
              className={`px-2 py-1 rounded transition-colors ${
                activeFilter === 'rules' ? 'bg-background font-semibold text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              AkoSheets
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border border-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <CreateProjectModal />
        </div>
      </div>

      {/* Main Grid / List Content */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10">
          <div className="p-3 bg-muted rounded-full mb-4 text-muted-foreground">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold">No projects found</h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mt-1 mb-4">
            {searchQuery
              ? 'No projects match your search.'
              : 'Create a project to organize digitized documents and manage extracted tables.'}
          </p>
          <CreateProjectModal />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const isRecents = project.name?.toLowerCase() === 'recents'
            return (
              <div key={project.id} className="relative group">
                <Link href={`/workspace/${project.id}`} className="block h-full">
                  <Card className={`h-full hover:border-primary/50 transition-all hover:shadow-md cursor-pointer ${
                    isRecents ? 'border-primary/40 bg-card shadow-2xs' : 'border-border'
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2 truncate">
                          <span className="truncate">{project.name}</span>
                          {isRecents && (
                            <Pin className="w-3.5 h-3.5 text-primary rotate-45 shrink-0" strokeWidth={2.25} />
                          )}
                        </span>
                      </CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[2.25rem] text-xs mt-1">
                        {project.description || (isRecents ? 'Staged and newly digitized files.' : 'Project workspace')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3 mt-1">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{project.documents?.length || 0} files</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px]">{formatRelativeTime(project.updated_at)}</span>
                          
                          {/* Fixed Headers / AkoSheets Indicator */}
                          {!isRecents && project.fixed_rules_enabled && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              title="AkoSheets Active"
                            >
                              <FileSpreadsheet className="w-2.5 h-2.5" />
                              <span>Sheet</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                {!isRecents && (
                  <div className="absolute top-4 right-4 z-20 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                    <ProjectCardActions project={project as any} userTier={userTier} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Dense List View */
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-6 sm:col-span-5">Project Name</div>
            <div className="col-span-3 sm:col-span-3">Description</div>
            <div className="col-span-3 sm:col-span-2 text-right">Files</div>
            <div className="hidden sm:block sm:col-span-2 text-right">Updated</div>
          </div>

          <div className="divide-y divide-border">
            {filteredProjects.map((project) => {
              const isRecents = project.name?.toLowerCase() === 'recents'
              return (
                <Link
                  key={project.id}
                  href={`/workspace/${project.id}`}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors text-xs"
                >
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-2 truncate">
                    <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">{project.name}</span>
                    {isRecents && <Pin className="w-3 h-3 text-primary rotate-45 shrink-0" />}
                    {project.fixed_rules_enabled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        Sheet
                      </span>
                    )}
                  </div>

                  <div className="col-span-3 sm:col-span-3 text-muted-foreground truncate">
                    {project.description || (isRecents ? 'Staged files' : '—')}
                  </div>

                  <div className="col-span-3 sm:col-span-2 text-right text-muted-foreground">
                    {project.documents?.length || 0} files
                  </div>

                  <div className="hidden sm:block sm:col-span-2 text-right text-muted-foreground text-[11px]">
                    {formatRelativeTime(project.updated_at)}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
