import { NextRequest, NextResponse } from 'next/server';
import { runQuery, runStatement } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await runQuery<any>(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.user_id = ? 
       ORDER BY p.created_at DESC`,
      [userId]
    );

    // Parse scores_json if exists
    const parsedProducts = products.map((p) => ({
      ...p,
      scores: p.scores_json ? JSON.parse(p.scores_json) : null,
    }));

    return NextResponse.json(parsedProducts);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category_id,
      cost_price,
      selling_price,
      target_market,
      problem_solved,
      demand_indication,
      competitors,
      potential_angles,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    const productId = uuidv4();
    await runStatement(
      `INSERT INTO products (
        id, name, description, category_id, user_id, cost_price, selling_price,
        target_market, problem_solved, demand_indication, competitors,
        potential_angles
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        name,
        description || '',
        category_id || null,
        userId,
        cost_price || 0,
        selling_price || 0,
        target_market || '',
        problem_solved || '',
        demand_indication || '',
        competitors || '',
        potential_angles || '',
      ]
    );

    const newProduct = {
      id: productId,
      name,
      description: description || '',
      category_id: category_id || null,
      user_id: userId,
      cost_price: cost_price || 0,
      selling_price: selling_price || 0,
      target_market: target_market || '',
      problem_solved: problem_solved || '',
      demand_indication: demand_indication || '',
      competitors: competitors || '',
      potential_angles: potential_angles || '',
      ai_opinion: null,
      challenges: null,
      pitchline: null,
      marketing_strategy: null,
      meta_ad_narrative: null,
      ig_reels_narrative: null,
      tiktok_narrative: null,
      scores: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
