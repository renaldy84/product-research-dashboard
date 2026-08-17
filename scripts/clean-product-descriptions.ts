/**
 * Script to clean HTML/JavaScript from product descriptions
 * 
 * Usage: npx tsx scripts/clean-product-descriptions.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file path
const DB_PATH = path.join(process.cwd(), 'data', 'product_research.db');

// Clean HTML and JavaScript from description
function cleanDescription(description: string): string {
  if (!description) return '';
  
  let cleaned = description;
  
  // Remove JavaScript fetch/then/catch chains
  cleaned = cleaned.replace(/fetch\s*\([^)]*\)\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}\s*;?/g, '');
  cleaned = cleaned.replace(/\.then\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*\.catch\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*\.finally\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}\s*\);?/g, '');
  cleaned = cleaned.replace(/r\.json\(\)\)/g, '');
  cleaned = cleaned.replace(/window\.detailFlash\([^)]*\);?/g, '');
  
  // Remove Checkout blocks
  cleaned = cleaned.replace(/Checkout[\s\S]*?Pengiriman dalam \d+-\d+ hari kerja\.?/g, '');
  cleaned = cleaned.replace(/Checkout[\s\S]*?Pengiriman dalam \d+-\d+ hari kerja\./g, '');
  cleaned = cleaned.replace(/Checkout[\s\S]*?Preview Landing Page Preview Landing Page belum tersedia\./g, '');
  
  // Remove marketing kit section
  cleaned = cleaned.replace(/Marketing Kit\s*Download Marketing Kit\s*Preview Landing Page\s*Preview[\s\S]*$/g, '');
  cleaned = cleaned.replace(/Marketing Kit\s*Download Marketing Kit\s*Preview Landing Page\s*Preview$/g, '');
  cleaned = cleaned.replace(/Preview Landing Page Preview Landing Page belum tersedia\.\s*$/g, '');
  
  // Remove Alamat lines
  cleaned = cleaned.replace(/Alamat\s*:\s*[A-Za-z0-9\s\.,]+(?:JL|Jl|jln|Kel|Kec|Kab|kab|RT|RW)[^\n]*/gi, '');
  
  // Remove function definitions (JavaScript code)
  cleaned = cleaned.replace(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s*\{[\s\S]*?\};?\s*\}/g, '');
  cleaned = cleaned.replace(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '');
  
  // Remove object literal patterns like :class=""...""
  cleaned = cleaned.replace(/:class="[^"]*"/g, '');
  cleaned = cleaned.replace(/class="[^"]*"/g, '');
  
  // Remove onclick and other HTML attributes
  cleaned = cleaned.replace(/\s*(onclick|onchange|onsubmit|onerror|ondblclick)\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*data-\w+\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*disabled\s*=\s*"[^"]*"/gi, '');
  
  // Remove script-like content
  cleaned = cleaned.replace(/\$\s*\([^)]*\)\s*\.\w+\s*\([^)]*\)\s*;?/g, '');
  cleaned = cleaned.replace(/document\.createElement\s*\([^)]*\)\s*;?/g, '');
  cleaned = cleaned.replace(/document\.querySelector\s*\([^)]*\)\s*;?/g, '');
  cleaned = cleaned.replace(/document\.body\.appendChild\s*\([^)]*\)\s*;?/g, '');
  
  // Remove setTimeout chains
  cleaned = cleaned.replace(/setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?setTimeout\s*\([\s\S]*?\}\s*,\s*\d+\s*\)\s*;?/g, '');
  cleaned = cleaned.replace(/setTimeout\s*\([^)]*\)\s*;?/g, '');
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Decode common HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&[a-z]+;/gi, '');
  
  // Remove REKOMENDASI JUAL line
  cleaned = cleaned.replace(/REKOMENDASI JUAL\s*:\s*[^\n]*/gi, '');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s{3,}/g, ' ');
  
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove lines that are just JavaScript remnants
  cleaned = cleaned.split('\n').map(line => {
    const trimmed = line.trim();
    // Skip lines that look like code
    if (trimmed.match(/^return\s+\{/) || 
        trimmed.match(/^if\s*\(/) ||
        trimmed.match(/^const\s+\w+/) ||
        trimmed.match(/^let\s+\w+/) ||
        trimmed.match(/^\w+\s*:\s*\[/) ||
        trimmed.match(/^\w+\s*\|\s*\|/) ||
        trimmed === '{' || 
        trimmed === '}' ||
        trimmed.match(/^document\./) ||
        trimmed.match(/^window\./) ||
        trimmed.match(/^\.\w+\([^)]*\)\s*;?$/)) {
      return '';
    }
    return line;
  }).join('\n');
  
  // Clean up multiple newlines again
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove trailing "Preview Landing Page" text
  cleaned = cleaned.replace(/\s*Preview Landing Page\s*Preview Landing Page belum tersedia\.?\s*$/gi, '');
  cleaned = cleaned.replace(/\s*Preview Landing Page\s*Preview\s*$/gi, '');
  
  // Final trim
  cleaned = cleaned.trim();
  
  return cleaned;
}

async function main() {
  console.log('🧹 Starting description cleanup...\n');
  
  // Initialize database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Get all products with descriptions that need cleaning
  const products = db.prepare(`
    SELECT id, name, description 
    FROM products 
    WHERE description LIKE '%Checkout%' 
       OR description LIKE '%r.json()%'
       OR description LIKE '%window.%'
  `).all() as { 
    id: string; 
    name: string; 
    description: string 
  }[];
  
  console.log(`Found ${products.length} products to clean\n`);
  
  let cleaned = 0;
  let skipped = 0;
  let errors = 0;
  
  const updateStmt = db.prepare('UPDATE products SET description = ? WHERE id = ?');
  
  for (const product of products) {
    try {
      const cleanedDesc = cleanDescription(product.description);
      
      // Only update if we actually removed something
      if (cleanedDesc.length < product.description.length) {
        updateStmt.run(cleanedDesc, product.id);
        cleaned++;
        
        if (cleaned <= 5) {
          console.log(`✅ Cleaned: ${product.name.substring(0, 50)}...`);
          console.log(`   Before: ${product.description.length} chars → After: ${cleanedDesc.length} chars`);
        }
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error cleaning ${product.name}:`, error instanceof Error ? error.message : error);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total products:       ${products.length}`);
  console.log(`Descriptions cleaned: ${cleaned}`);
  console.log(`Skipped (no change): ${skipped}`);
  console.log(`Errors:              ${errors}`);
  console.log('='.repeat(50));
  
  db.close();
  
  if (errors > 0) {
    console.log('\n⚠️  Some errors occurred.');
  } else {
    console.log('\n✅ Cleanup completed successfully!');
  }
}

main().catch(console.error);
