import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';
mkdirSync(DATA_DIR, { recursive: true });

let db;

export function initDB() {
  db = new Database(join(DATA_DIR, 'aios.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
      status TEXT DEFAULT 'active', priority TEXT DEFAULT 'medium',
      progress INTEGER DEFAULT 0, deadline TEXT, tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '', created_at TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, project_id TEXT,
      status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'medium',
      due_date TEXT, notes TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY, platform TEXT, angle TEXT, title TEXT,
      content TEXT, hashtags TEXT DEFAULT '[]', cta TEXT DEFAULT '',
      status TEXT DEFAULT 'ready', created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT DEFAULT '',
      category TEXT DEFAULT 'general', expanded TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT,
      tags TEXT DEFAULT '[]', source TEXT DEFAULT '', created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY, type TEXT, title TEXT, body TEXT,
      priority TEXT DEFAULT 'medium', created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS briefs (
      id TEXT PRIMARY KEY, date TEXT, content TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY, type TEXT, description TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT
    );
  `);
  console.log('DB initialized at', DATA_DIR);
}

export function getDB() { return db; }
