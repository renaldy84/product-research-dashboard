#!/usr/bin/env npx tsx

/**
 * Script untuk memperbaiki overall score semua produk
 * 
 * Usage: npx tsx scripts/fix-scores.ts
 * 
 * This script will:
 * 1. Fetch all products from database
 * 2. Recalculate scores based on actual AI content
 * 3. Products with AI content: use AI scores
 * 4. Products WITHOUT AI content: set scores to 0 or very low
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'product_research.db');

interface Product {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  description: string;
  target_market: string;
  problem_solved: string;
  demand_indication: string;
  competitors: string;
  potential_angles: string;
  ai_opinion: string;
  scores_json: string;
  pricing_plan: string;
}

interface Scores {
  profit_margin: number;
  market_potential: number;
  competition_level: number;
  uniqueness: number;
  overall_score: number;
}

// Scoring weights
const weights = {
  profit_margin: 0.3,
  market_potential: 0.25,
  competition_level: 0.25,
  uniqueness: 0.2,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function hasAIContent(product: Product): boolean {
  const contentFields = [
    product.target_market,
    product.problem_solved,
    product.demand_indication,
    product.competitors,
    product.potential_angles,
    product.ai_opinion,
  ];
  
  return contentFields.some(field => field && field.trim().length > 0);
}

function countAIFields(product: Product): number {
  const contentFields = [
    product.target_market,
    product.problem_solved,
    product.demand_indication,
    product.competitors,
    product.potential_angles,
    product.ai_opinion,
  ];
  
  return contentFields.filter(field => field && field.trim().length > 50).length;
}

function calculateScores(product: Product): Scores {
  // Profit Margin Score
  const profit = product.selling_price - product.cost_price;
  const margin = product.cost_price > 0 ? (profit / product.cost_price) * 100 : 0;
  const profitMarginScore = Math.min(100, Math.max(0, margin * 2));
  
  // Check if product has AI content
  const aiContentCount = countAIFields(product);
  
  if (aiContentCount === 0) {
    // No AI content = No scores
    return {
      profit_margin: Math.round(profitMarginScore),
      market_potential: 0,
      competition_level: 0,
      uniqueness: 0,
      overall_score: Math.round(profitMarginScore * weights.profit_margin),
    };
  }
  
  // Products with AI content but no stored scores
  // Calculate default scores based on content
  
  // Market Potential: Based on demand_indication and target_market
  let marketPotential = 30 + (aiContentCount * 10);
  marketPotential = Math.min(100, marketPotential);
  
  // Competition Level: Based on competitors analysis
  // Lower score = more competition (inverted)
  let competitionLevel = 50 - (aiContentCount * 5);
  competitionLevel = Math.max(10, Math.min(100, competitionLevel));
  
  // Uniqueness: Based on potential_angles
  let uniqueness = 20 + (aiContentCount * 15);
  uniqueness = Math.min(100, uniqueness);
  
  // Calculate overall score
  const overallScore = Math.round(
    profitMarginScore * weights.profit_margin +
    marketPotential * weights.market_potential +
    competitionLevel * weights.competition_level +
    uniqueness * weights.uniqueness
  );
  
  return {
    profit_margin: Math.round(profitMarginScore),
    market_potential: Math.round(marketPotential),
    competition_level: Math.round(competitionLevel),
    uniqueness: Math.round(uniqueness),
    overall_score: Math.min(100, Math.max(0, overallScore)),
  };
}

async function fixScores() {
  console.log('🔧 Starting score fix...\n');
  
  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found at:', DB_PATH);
    process.exit(1);
  }
  
  const db = new Database(DB_PATH);
  
  try {
    // Fetch all products
    const products = db.prepare('SELECT * FROM products').all() as Product[];
    
    console.log(`📦 Found ${products.length} products\n`);
    
    let updated = 0;
    let unchanged = 0;
    
    const updateStmt = db.prepare(`
      UPDATE products 
      SET scores_json = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    for (const product of products) {
      const hasAI = hasAIContent(product);
      const aiCount = countAIFields(product);
      const existingScores = product.scores_json ? JSON.parse(product.scores_json) : null;
      
      const newScores = calculateScores(product);
      
      // Check if scores need updating
      const needsUpdate = !existingScores || 
        existingScores.overall_score !== newScores.overall_score ||
        (aiCount === 0 && existingScores.market_potential > 0);
      
      if (needsUpdate) {
        console.log(`📝 ${product.name}`);
        console.log(`   AI Content: ${hasAI ? '✓ Yes' : '✗ No'} (${aiCount} fields)`);
        console.log(`   Old Score: ${existingScores?.overall_score ?? 'N/A'}`);
        console.log(`   New Score: ${newScores.overall_score}`);
        console.log(`   Breakdown: PM=${newScores.profit_margin}, MP=${newScores.market_potential}, CL=${newScores.competition_level}, U=${newScores.uniqueness}`);
        console.log('');
        
        updateStmt.run(JSON.stringify(newScores), product.id);
        updated++;
      } else {
        unchanged++;
      }
    }
    
    console.log('─'.repeat(60));
    console.log(`✅ Summary:`);
    console.log(`   Total Products: ${products.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log('');
    
    // Show products with high scores but no AI content
    console.log('⚠️  Products with HIGH scores but NO AI content:');
    const highScoreNoContent = products.filter(p => {
      const scores = p.scores_json ? JSON.parse(p.scores_json) : null;
      return scores && scores.overall_score > 50 && countAIFields(p) === 0;
    });
    
    if (highScoreNoContent.length > 0) {
      for (const p of highScoreNoContent) {
        const scores = JSON.parse(p.scores_json);
        console.log(`   - ${p.name}: Score ${scores.overall_score} (NO AI CONTENT!)`);
      }
    } else {
      console.log('   None found ✓');
    }
    
  } finally {
    db.close();
  }
  
  console.log('\n✨ Done!');
}

fixScores().catch(console.error);
