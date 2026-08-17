/**
 * Import script for anekadropship.csv
 * 
 * This script:
 * 1. Reads products from anekadropship.csv
 * 2. For each product with "Harga Per PCS" > 0:
 *    - Checks if the category exists in categories table
 *    - If not, creates the category
 *    - Inserts the product with the correct category_id
 * 
 * Usage: npx tsx scripts/import-anekadropship.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Database file path
const DB_PATH = path.join(process.cwd(), 'data', 'product_research.db');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// CSV parsing helper
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse header (handle BOM)
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = parseCSVLine(headerLine);
  
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = (values[index] || '').trim();
    });
    rows.push(row);
  }
  
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Main import function
async function main() {
  console.log('🚀 Starting anekadropship CSV import...\n');
  
  // Initialize database
  ensureDataDir();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Initialize tables if they don't exist
  initTables(db);
  
  // Get or create default user
  const userId = await getOrCreateDefaultUser(db);
  console.log(`📦 Using user ID: ${userId}\n`);
  
  // Read and parse CSV
  const csvPath = path.join(process.cwd(), 'anekadropship.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const products = parseCSV(csvContent);
  
  console.log(`📄 Found ${products.length} rows in CSV\n`);
  
  // Track statistics
  const stats = {
    total: products.length,
    skipped: 0,
    categoriesAdded: 0,
    productsAdded: 0,
    errors: 0
  };
  
  // Track categories we add during this run (to avoid duplicate inserts)
  const categoriesAddedThisRun = new Map<string, string>();
  
  // Get existing categories
  const existingCategories = db.prepare('SELECT name, id FROM categories').all() as { name: string; id: string }[];
  const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));
  
  for (const row of products) {
    try {
      const hargaPerPcs = parseFloat(row['Harga Per PCS'] || '0');
      
      // Skip if "Harga Per PCS" <= 0
      if (hargaPerPcs <= 0) {
        stats.skipped++;
        continue;
      }
      
      const categoryName = row['Kategori'] || 'Uncategorized';
      const productName = row['Nama Produk'] || '';
      const description = row['Deskripsi'] || '';
      const hargaJual = parseFloat(row['Harga Jual'] || '0');
      const stok = parseInt(row['Stok'] || '0', 10);
      const terjual = parseInt(row['Terjual'] || '0', 10);
      const berat = row['Berat'] || '';
      const imageUrl = row['Image URL'] || '';
      const productUrl = row['URL'] || '';
      const ekspedisi = row['Ekspedisi'] || '';
      const sistem = row['Sistem'] || '';
      
      // Get or create category
      let categoryId = categoryMap.get(categoryName.toLowerCase());
      
      if (!categoryId) {
        // Check if we already added it in this run
        categoryId = categoriesAddedThisRun.get(categoryName.toLowerCase());
        
        if (!categoryId) {
          // Create new category
          categoryId = uuidv4();
          db.prepare(`
            INSERT INTO categories (id, name, user_id, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
          `).run(categoryId, categoryName, userId);
          
          categoryMap.set(categoryName.toLowerCase(), categoryId);
          categoriesAddedThisRun.set(categoryName.toLowerCase(), categoryId);
          stats.categoriesAdded++;
          console.log(`  ✅ Added category: ${categoryName}`);
        }
      }
      
      // Create product
      const productId = uuidv4();
      
      db.prepare(`
        INSERT INTO products (
          id, name, description, category_id, user_id,
          cost_price, selling_price, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        productId,
        productName,
        description.substring(0, 10000), // Truncate description if too long
        categoryId,
        userId,
        hargaPerPcs,
        hargaJual
      );
      
      stats.productsAdded++;
      
      // Progress indicator every 50 products
      if (stats.productsAdded % 50 === 0) {
        console.log(`  📊 Progress: ${stats.productsAdded} products imported...`);
      }
      
    } catch (error) {
      stats.errors++;
      console.error(`  ❌ Error processing row:`, error instanceof Error ? error.message : error);
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total rows in CSV:     ${stats.total}`);
  console.log(`Products skipped:     ${stats.skipped} (Harga Per PCS <= 0)`);
  console.log(`Categories added:     ${stats.categoriesAdded}`);
  console.log(`Products imported:    ${stats.productsAdded}`);
  console.log(`Errors:               ${stats.errors}`);
  console.log('='.repeat(50));
  
  db.close();
  
  if (stats.errors > 0) {
    console.log('\n⚠️  Some errors occurred during import. Check the output above.');
  } else {
    console.log('\n✅ Import completed successfully!');
  }
}

// Initialize database tables
function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
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

  db.exec(`
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

  db.exec(`
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

  db.exec(`
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

// Get or create a default user for the import
async function getOrCreateDefaultUser(db: Database.Database): Promise<string> {
  const email = 'importer@localhost';
  
  // Check if user exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  
  if (existingUser) {
    return existingUser.id;
  }
  
  // Create default user
  const userId = uuidv4();
  const bcrypt = await import('bcryptjs');
  const passwordHash = bcrypt.hashSync('importer-default-password', 10);
  
  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(userId, email, 'CSV Importer', passwordHash);
  
  console.log('📝 Created default user for import');
  return userId;
}

// Run the import
main().catch(console.error);
