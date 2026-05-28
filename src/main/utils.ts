import type { DataStore } from './store'

// Default store instance — set by Electron app on startup, or by CLI before use.
let _store: DataStore | null = null

/** Set the active data store. Call once at startup. */
export function setDataStore(store: DataStore): void {
    _store = store
}

/** Get the active data store. Throws if not initialized. */
export function getDataStore(): DataStore {
    if (!_store) throw new Error('DataStore not initialized. Call setDataStore() first.')
    return _store
}

export function readJSON<T>(filename: string, fallback: T): T {
    return getDataStore().readJSON(filename, fallback)
}

export function writeJSON(filename: string, data: unknown): void {
    getDataStore().writeJSON(filename, data)
}
