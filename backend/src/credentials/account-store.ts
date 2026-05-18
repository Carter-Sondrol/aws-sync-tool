import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_FILE = path.join(__dirname, '..', 'data', 'accounts.json');

export class AccountStore {
  private data: Map<string, Record<string, unknown>> = new Map();
  private initialized = false;

  private ensureDir() {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private load() {
    if (this.initialized) return;
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [id, account] of Object.entries(parsed as Record<string, Record<string, unknown>>)) {
          this.data.set(id, account);
        }
      }
    } catch {
      // Start fresh if file is corrupt
    }
    this.initialized = true;
  }

  private save() {
    this.ensureDir();
    const obj: Record<string, unknown> = {};
    for (const [id, account] of this.data) {
      obj[id] = account;
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  }

  getAll(): Record<string, unknown>[] {
    this.load();
    return Array.from(this.data.values());
  }

  get(id: string): Record<string, unknown> | undefined {
    this.load();
    return this.data.get(id);
  }

  set(id: string, account: Record<string, unknown>) {
    this.load();
    this.data.set(id, account);
    this.save();
  }

  delete(id: string): boolean {
    this.load();
    const deleted = this.data.delete(id);
    if (deleted) this.save();
    return deleted;
  }
}

export const accountStore = new AccountStore();
