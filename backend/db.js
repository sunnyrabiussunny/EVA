import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';

const DATA_DIR  = process.env.DATA_DIR || './data';
const FILES_DIR = join(DATA_DIR, 'knowledge-files');
mkdirSync(DATA_DIR,  { recursive: true });
mkdirSync(FILES_DIR, { recursive: true });

let db;

export function initDB() {
  db = new Database(join(DATA_DIR, 'aios.db'));
  db.pragma('journal_mode = WAL');

  // ── Create all tables ──────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      priority TEXT DEFAULT 'medium',
      progress INTEGER DEFAULT 0,
      deadline TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_id TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      platform TEXT DEFAULT '',
      angle TEXT DEFAULT '',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      hashtags TEXT DEFAULT '[]',
      cta TEXT DEFAULT '',
      status TEXT DEFAULT 'ready',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      expanded TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      source TEXT DEFAULT '',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS knowledge_files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      content TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      source TEXT DEFAULT 'upload',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'action',
      title TEXT DEFAULT '',
      body TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS briefs (
      id TEXT PRIMARY KEY,
      date TEXT,
      content TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      type TEXT,
      description TEXT,
      created_at TEXT
    );


    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'finance',
      value REAL DEFAULT 0,
      unit TEXT DEFAULT '',
      period TEXT DEFAULT '',
      period_date TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS strategy_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      context TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      messages TEXT DEFAULT '[]',
      insights TEXT DEFAULT '[]',
      roi_total REAL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS nexus_insights (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      department TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      roi_estimate REAL DEFAULT 0,
      hours_saved REAL DEFAULT 0,
      status TEXT DEFAULT 'identified',
      session_id TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS watch_folders (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      label TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      last_scan TEXT,
      file_count INTEGER DEFAULT 0,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ── Safe migrations — add missing columns if they don't exist ──
  const migrations = [
    // content table columns that may be missing in old DBs
    { table:'content', col:'title',    def:"TEXT DEFAULT ''" },
    { table:'content', col:'platform', def:"TEXT DEFAULT ''" },
    { table:'content', col:'angle',    def:"TEXT DEFAULT ''" },
    { table:'content', col:'cta',      def:"TEXT DEFAULT ''" },
    { table:'content', col:'hashtags', def:"TEXT DEFAULT '[]'" },
    { table:'content', col:'status',   def:"TEXT DEFAULT 'ready'" },
    // projects
    { table:'projects', col:'notes',    def:"TEXT DEFAULT ''" },
    { table:'projects', col:'progress', def:"INTEGER DEFAULT 0" },
    // knowledge_files
    { table:'knowledge_files', col:'source', def:"TEXT DEFAULT 'upload'" },
    // insights
    { table:'insights', col:'type',     def:"TEXT DEFAULT 'action'" },
    { table:'insights', col:'priority', def:"TEXT DEFAULT 'medium'" },
  ];

  for (const m of migrations) {
    try {
      db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.col} ${m.def}`);
      console.log(`[DB] Migration: added ${m.table}.${m.col}`);
    } catch {
      // Column already exists — ignore
    }
  }

  console.log('[DB] Initialized at', DATA_DIR);
  console.log('[DB] Knowledge files dir:', FILES_DIR);
}

export function getDB()       { return db; }
export function getFilesDir() { return FILES_DIR; }

