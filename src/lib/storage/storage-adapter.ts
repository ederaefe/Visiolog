/**
 * storage-adapter.ts
 * Unified storage abstraction layer for Visiolog.
 * Dynamically switches between browser IndexedDB (standalone local-first) and Supabase (cloud-connected).
 */

import { LocalDB, LocalProject, LocalDocument, LocalSpreadsheet } from './indexeddb-adapter'

// Determine if Supabase is active and configured
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && url !== 'https://your-project.supabase.co' && !url.includes('dummy'))
}

// Check if running in forced local-first offline mode
export function isLocalFirstMode(): boolean {
  if (typeof window !== 'undefined') {
    const forced = localStorage.getItem('visiolog_storage_mode')
    if (forced === 'local') return true
    if (forced === 'cloud') return false
  }
  return !isSupabaseConfigured()
}

// Storage abstraction interface
export interface IStorageAdapter {
  isLocal: boolean
  getProjects(): Promise<LocalProject[]>
  getProject(id: string): Promise<LocalProject | undefined>
  createProject(name: string, fixedRules?: boolean, fixedHeaders?: string): Promise<LocalProject>
  getDocuments(projectId: string): Promise<LocalDocument[]>
  saveDocument(doc: LocalDocument): Promise<string>
  getSpreadsheet(documentId: string): Promise<LocalSpreadsheet | undefined>
  saveSpreadsheet(sheet: LocalSpreadsheet): Promise<string>
}

// Client-side unified storage facade
export const AppStorage: IStorageAdapter = {
  get isLocal() {
    return isLocalFirstMode()
  },

  async getProjects(): Promise<LocalProject[]> {
    if (this.isLocal) {
      return LocalDB.getProjects()
    }
    const { getProjects } = await import('@/app/actions/project-actions')
    const remote = await getProjects()
    return (remote || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      created_at: p.updated_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString(),
      fixed_rules_enabled: p.fixed_rules_enabled,
      fixed_headers: p.fixed_headers,
    }))
  },

  async getProject(id: string): Promise<LocalProject | undefined> {
    if (this.isLocal) {
      return LocalDB.getProjectById(id)
    }
    const { getProjects } = await import('@/app/actions/project-actions')
    const projects = await getProjects()
    const match = (projects || []).find((p: any) => p.id === id)
    if (!match) return undefined
    return {
      id: match.id,
      name: match.name,
      created_at: match.updated_at || new Date().toISOString(),
      updated_at: match.updated_at || new Date().toISOString(),
      fixed_rules_enabled: match.fixed_rules_enabled,
      fixed_headers: match.fixed_headers,
    }
  },

  async createProject(
    name: string,
    fixedRules = false,
    fixedHeaders = ''
  ): Promise<LocalProject> {
    if (this.isLocal) {
      const now = new Date().toISOString()
      const newProj: LocalProject = {
        id: `local_proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        created_at: now,
        updated_at: now,
        fixed_rules_enabled: fixedRules,
        fixed_headers: fixedHeaders,
      }
      await LocalDB.saveProject(newProj)
      return newProj
    }

    const { createProject } = await import('@/app/actions/project-actions')
    const formData = new FormData()
    formData.append('name', name)
    const res = await createProject(formData)
    const created = res.data || { id: `proj_${Date.now()}`, name }

    return {
      id: created.id,
      name: created.name || name,
      created_at: created.created_at || new Date().toISOString(),
      updated_at: created.updated_at || new Date().toISOString(),
      fixed_rules_enabled: fixedRules,
      fixed_headers: fixedHeaders,
    }
  },

  async getDocuments(projectId: string): Promise<LocalDocument[]> {
    if (this.isLocal) {
      return LocalDB.getDocuments(projectId)
    }
    return []
  },

  async saveDocument(doc: LocalDocument): Promise<string> {
    if (this.isLocal) {
      return LocalDB.saveDocument(doc)
    }
    return doc.id
  },

  async getSpreadsheet(documentId: string): Promise<LocalSpreadsheet | undefined> {
    if (this.isLocal) {
      return LocalDB.getSpreadsheet(documentId)
    }
    return undefined
  },

  async saveSpreadsheet(sheet: LocalSpreadsheet): Promise<string> {
    if (this.isLocal) {
      return LocalDB.saveSpreadsheet(sheet)
    }
    return sheet.id
  },
}
