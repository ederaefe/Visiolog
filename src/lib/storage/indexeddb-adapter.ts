/**
 * indexeddb-adapter.ts
 * Browser-native Promise-based IndexedDB wrapper for Visiolog offline and air-gapped storage.
 * Zero cloud dependency: allows full document extraction and spreadsheet saving on localhost.
 */

export interface LocalProject {
  id: string
  name: string
  created_at: string
  updated_at: string
  fixed_rules_enabled?: boolean
  fixed_headers?: string
}

export interface LocalDocument {
  id: string
  project_id: string
  file_name: string
  file_type?: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed'
  raw_text?: string
  created_at: string
}

export interface LocalSpreadsheet {
  id: string
  project_id: string
  document_id?: string
  csv_data: string
  created_at: string
  updated_at: string
  mismatch_flag?: boolean
}

const DB_NAME = 'visiolog_local_db'
const DB_VERSION = 1

// Open and initialize local IndexedDB object stores
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is only available in browser environments'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Store for workspace project folders
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('updated_at', 'updated_at', { unique: false })
      }

      // Store for uploaded and processed document scans
      if (!db.objectStoreNames.contains('documents')) {
        const docStore = db.createObjectStore('documents', { keyPath: 'id' })
        docStore.createIndex('project_id', 'project_id', { unique: false })
        docStore.createIndex('created_at', 'created_at', { unique: false })
      }

      // Store for spreadsheet grids and master sheets
      if (!db.objectStoreNames.contains('spreadsheets')) {
        const sheetStore = db.createObjectStore('spreadsheets', { keyPath: 'id' })
        sheetStore.createIndex('project_id', 'project_id', { unique: false })
        sheetStore.createIndex('document_id', 'document_id', { unique: false })
      }

      // Store for application and enterprise admin settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Generic transaction executor
async function executeTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const req = callback(store)

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Local IndexedDB Storage Operations
export const LocalDB = {
  // Project operations
  async getProjects(): Promise<LocalProject[]> {
    return executeTransaction<LocalProject[]>('projects', 'readonly', (store) => store.getAll())
  },

  async getProjectById(id: string): Promise<LocalProject | undefined> {
    return executeTransaction<LocalProject | undefined>('projects', 'readonly', (store) => store.get(id))
  },

  async saveProject(project: LocalProject): Promise<string> {
    return executeTransaction<string>('projects', 'readwrite', (store) => store.put(project))
  },

  async deleteProject(id: string): Promise<void> {
    return executeTransaction<void>('projects', 'readwrite', (store) => store.delete(id))
  },

  // Document operations
  async getDocuments(projectId: string): Promise<LocalDocument[]> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly')
      const store = tx.objectStore('documents')
      const index = store.index('project_id')
      const req = index.getAll(projectId)

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },

  async saveDocument(doc: LocalDocument): Promise<string> {
    return executeTransaction<string>('documents', 'readwrite', (store) => store.put(doc))
  },

  async deleteDocument(id: string): Promise<void> {
    return executeTransaction<void>('documents', 'readwrite', (store) => store.delete(id))
  },

  // Spreadsheet operations
  async getSpreadsheet(documentId: string): Promise<LocalSpreadsheet | undefined> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('spreadsheets', 'readonly')
      const store = tx.objectStore('spreadsheets')
      const index = store.index('document_id')
      const req = index.get(documentId)

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },

  async saveSpreadsheet(sheet: LocalSpreadsheet): Promise<string> {
    return executeTransaction<string>('spreadsheets', 'readwrite', (store) => store.put(sheet))
  },

  // Settings operations
  async getSetting<T>(key: string): Promise<T | undefined> {
    const res = await executeTransaction<{ key: string; value: T } | undefined>(
      'settings',
      'readonly',
      (store) => store.get(key)
    )
    return res?.value
  },

  async setSetting<T>(key: string, value: T): Promise<void> {
    await executeTransaction<string>('settings', 'readwrite', (store) =>
      store.put({ key, value })
    )
  },
}
