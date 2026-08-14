import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file path
const DB_PATH = path.join(process.cwd(), 'data', 'product_research.db');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Singleton database connection
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    ensureDataDir();
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
  }
  return db;
}

function initTables(): void {
  const database = db!;
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      user_id TEXT NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      target_market TEXT,
      problem_solved TEXT,
      demand_indication TEXT,
      competitors TEXT,
      potential_angles TEXT,
      ai_opinion TEXT,
      challenges TEXT,
      pitchline TEXT,
      marketing_strategy TEXT,
      meta_ad_narrative TEXT,
      ig_reels_narrative TEXT,
      tiktok_narrative TEXT,
      scores_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS scoring_weights (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      profit_margin REAL DEFAULT 0.3,
      market_potential REAL DEFAULT 0.25,
      competition_level REAL DEFAULT 0.25,
      uniqueness REAL DEFAULT 0.2,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      openai_api_key TEXT,
      openai_endpoint TEXT,
      openai_custom_model TEXT,
      openrouter_api_key TEXT,
      openrouter_endpoint TEXT,
      openrouter_custom_model TEXT,
      sumopod_api_key TEXT,
      sumopod_endpoint TEXT,
      sumopod_custom_model TEXT,
      active_provider TEXT DEFAULT 'openai',
      active_model TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

// Execute a query and return results
export function runQuery<T>(sql: string, params: any[] = []): T[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.all(...params) as T[];
}

// Execute a query and return one result
export function runQueryOne<T>(sql: string, params: any[] = []): T | undefined {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

// Execute a statement (INSERT, UPDATE, DELETE)
export function runStatement(sql: string, params: any[] = []): void {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.run(...params);
}

// Close database connection
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
