'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileSpreadsheet,
  ExternalLink,
  Search,
  SlidersHorizontal,
  FolderOpen,
  CheckCircle2,
  TableProperties,
  Layers,
  ArrowUpDown,
  LayoutGrid,
  List,
  Clock,
  Sparkles,
} from 'lucide-react'
import { UserAkoSheetInfo } from '@/app/actions/project-sheet-actions'

interface SheetsDirectoryViewProps {
  initialSheets: UserAkoSheetInfo[]
  userTier?: string
}

type SortOption = 'recent' | 'rows' | 'name'

export function SheetsDirectoryView({ initialSheets, userTier = 'free' }: SheetsDirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  const filteredSheets = useMemo(() => {
    let list = [...initialSheets]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.projectName.toLowerCase().includes(q) ||
          (s.projectDescription && s.projectDescription.toLowerCase().includes(q)) ||
          (s.fixedHeaders && s.fixedHeaders.toLowerCase().includes(q))
      )
    }

    if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } else if (sortBy === 'rows') {
      list.sort((a, b) => b.rowCount - a.rowCount)
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.projectName.localeCompare(b.projectName))
    }

    return list
  }, [initialSheets, searchQuery, sortBy])

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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif">AkoSheets</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Consolidated continuous spreadsheets created from your digitized document workflows.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Collapsible Search */}
          <div className="relative flex items-center">
            {isSearchExpanded ? (
              <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sheets..."
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
                    className="h-8 pl-8 pr-3 w-40 sm:w-56 text-xs bg-muted/50 border border-border rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
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
                title="Search sheets (Cmd+F)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border border-border text-xs">
            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'recent' ? 'bg-background font-semibold text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recent
            </button>
            <button
              type="button"
              onClick={() => setSortBy('rows')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'rows' ? 'bg-background font-semibold text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Most Rows
            </button>
            <button
              type="button"
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === 'name' ? 'bg-background font-semibold text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Name
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
        </div>
      </div>

      {/* Main Content */}
      {filteredSheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full mb-4 border border-emerald-500/20">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold">No AkoSheets found</h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mt-1 mb-6">
            {searchQuery
              ? 'No spreadsheets matched your search criteria.'
              : 'AkoSheets are continuous master spreadsheets generated when Fixed Rules are enabled in a project. Enable Fixed Rules to automatically unify digitized documents into a live spreadsheet.'}
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-xs"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Go to Projects</span>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSheets.map((sheet) => (
            <div
              key={sheet.projectId}
              className="group relative bg-card border border-border hover:border-emerald-500/40 rounded-xl p-5 transition-all hover:shadow-md flex flex-col justify-between"
            >
              {/* Top Row: Title + Open in New Tab Button */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  {/* Same-Tab Main Navigation Link */}
                  <Link
                    href={`/sheet/${sheet.projectId}`}
                    className="flex-1 font-semibold text-base text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1"
                    title={sheet.projectName}
                  >
                    {sheet.projectName}
                  </Link>

                  {/* Optional Explicit New Tab Button */}
                  <a
                    href={`/sheet/${sheet.projectId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                    title="Open AkoSheet in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem] mb-4">
                  {sheet.projectDescription || 'Continuous spreadsheet generated from digitized document records.'}
                </p>
              </div>

              {/* Bottom Row: Metrics & Last Updated */}
              <div className="border-t border-border/80 pt-3 mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 font-medium text-foreground">
                    <TableProperties className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{sheet.rowCount} rows</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-muted-foreground" />
                    <span>{sheet.documentCount} docs</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3 text-muted-foreground/70" />
                  <span>{formatRelativeTime(sheet.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Dense List View */
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-5 sm:col-span-4">Sheet Name</div>
            <div className="col-span-3 sm:col-span-3">Description</div>
            <div className="col-span-2 sm:col-span-2 text-right">Data Size</div>
            <div className="col-span-2 sm:col-span-2 text-right">Last Updated</div>
            <div className="hidden sm:block sm:col-span-1 text-center">Actions</div>
          </div>

          <div className="divide-y divide-border">
            {filteredSheets.map((sheet) => (
              <div
                key={sheet.projectId}
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors text-xs"
              >
                {/* Same-Tab Main Navigation Link */}
                <div className="col-span-5 sm:col-span-4">
                  <Link
                    href={`/sheet/${sheet.projectId}`}
                    className="font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 truncate"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{sheet.projectName}</span>
                  </Link>
                </div>

                <div className="col-span-3 sm:col-span-3 text-muted-foreground truncate">
                  {sheet.projectDescription || 'Continuous project spreadsheet'}
                </div>

                <div className="col-span-2 sm:col-span-2 text-right font-mono font-medium text-foreground">
                  {sheet.rowCount} rows <span className="text-muted-foreground text-[10px]">({sheet.columnCount} cols)</span>
                </div>

                <div className="col-span-2 sm:col-span-2 text-right text-muted-foreground text-[11px]">
                  {formatRelativeTime(sheet.updatedAt)}
                </div>

                {/* Optional Explicit New Tab Button */}
                <div className="hidden sm:flex sm:col-span-1 justify-center">
                  <a
                    href={`/sheet/${sheet.projectId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Open AkoSheet in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
