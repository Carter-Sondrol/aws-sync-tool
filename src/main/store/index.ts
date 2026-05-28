import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// ─── Interface ────────────────────────────────────────────────────────────────

/** Abstract data store for JSON persistence */
export interface DataStore {
    /** Read a JSON file, returning fallback if not found or parse error */
    readJSON<T>(filename: string, fallback: T): T
    /** Write data as formatted JSON */
    writeJSON(filename: string, data: unknown): void
}

// ─── File-based store (CLI / headless) ────────────────────────────────────────

export class FileDataStore implements DataStore {
    constructor(private baseDir: string) {}

    private filePath(filename: string): string {
        if (!existsSync(this.baseDir)) mkdirSync(this.baseDir, { recursive: true })
        return join(this.baseDir, filename)
    }

    readJSON<T>(filename: string, fallback: T): T {
        try {
            const path = this.filePath(filename)
            if (!existsSync(path)) return fallback
            return JSON.parse(readFileSync(path, 'utf-8')) as T
        } catch {
            return fallback
        }
    }

    writeJSON(filename: string, data: unknown): void {
        writeFileSync(this.filePath(filename), JSON.stringify(data, null, 2), 'utf-8')
    }
}

// ─── Electron store (GUI) ─────────────────────────────────────────────────────

export class ElectronDataStore implements DataStore {
    private baseDir: string

    constructor() {
        // Deferred — app may not be ready when module loads
        this.baseDir = ''
    }

    /** Must be called after app.whenReady() */
    init(): void {
        const { app } = require('electron')
        const dir = app.getPath('userData') as string
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        this.baseDir = dir
    }

    private filePath(filename: string): string {
        return join(this.baseDir, filename)
    }

    readJSON<T>(filename: string, fallback: T): T {
        try {
            const path = this.filePath(filename)
            if (!existsSync(path)) return fallback
            return JSON.parse(readFileSync(path, 'utf-8')) as T
        } catch {
            return fallback
        }
    }

    writeJSON(filename: string, data: unknown): void {
        writeFileSync(this.filePath(filename), JSON.stringify(data, null, 2), 'utf-8')
    }
}
