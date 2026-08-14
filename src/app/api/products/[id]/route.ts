import { NextRequest, NextResponse } from 'next/server';
import { runQuery, runStatement } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const products = await runQuery<any>(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ? AND p.user_id = ?`,
      [id, userId]
    );

    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = products[0];
    return NextResponse.json({
      ...product,
      scores: product.scores_json ? JSON.parse(product.scores_json) : null,
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Failed to get product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
      ai_opinion,
      challenges,
      pitchline,
      marketing_strategy,
      meta_ad_narrative,
      ig_reels_narrative,
      tiktok_narrative,
      scores,
    } = body;

    // Check if product exists and belongs to user
    const products = await runQuery(
      'SELECT id FROM products WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Build dynamic update - only update fields that are explicitly provided
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    // Basic fields - always update if provided
    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description || ''); }
    if (category_id !== undefined) { updateFields.push('category_id = ?'); updateValues.push(category_id || null); }
    if (cost_price !== undefined) { updateFields.push('cost_price = ?'); updateValues.push(cost_price || 0); }
    if (selling_price !== undefined) { updateFields.push('selling_price = ?'); updateValues.push(selling_price || 0); }
    if (target_market !== undefined) { updateFields.push('target_market = ?'); updateValues.push(target_market || ''); }
    if (problem_solved !== undefined) { updateFields.push('problem_solved = ?'); updateValues.push(problem_solved || ''); }
    if (demand_indication !== undefined) { updateFields.push('demand_indication = ?'); updateValues.push(demand_indication || ''); }
    if (competitors !== undefined) { updateFields.push('competitors = ?'); updateValues.push(competitors || ''); }
    if (potential_angles !== undefined) { updateFields.push('potential_angles = ?'); updateValues.push(potential_angles || ''); }
    
    // AI content fields - only update if explicitly provided (not undefined)
    // This preserves existing content when only one field is being updated
    if (ai_opinion !== undefined) { updateFields.push('ai_opinion = ?'); updateValues.push(ai_opinion || null); }
    if (challenges !== undefined) { updateFields.push('challenges = ?'); updateValues.push(challenges || null); }
    if (pitchline !== undefined) { updateFields.push('pitchline = ?'); updateValues.push(pitchline || null); }
    if (marketing_strategy !== undefined) { updateFields.push('marketing_strategy = ?'); updateValues.push(marketing_strategy || null); }
    if (meta_ad_narrative !== undefined) { updateFields.push('meta_ad_narrative = ?'); updateValues.push(meta_ad_narrative || null); }
    if (ig_reels_narrative !== undefined) { updateFields.push('ig_reels_narrative = ?'); updateValues.push(ig_reels_narrative || null); }
    if (tiktok_narrative !== undefined) { updateFields.push('tiktok_narrative = ?'); updateValues.push(tiktok_narrative || null); }
    
    // Scores - only update if provided
    if (scores !== undefined) { 
      updateFields.push('scores_json = ?'); 
      updateValues.push(scores ? JSON.stringify(scores) : null); 
    }
    
    // Add WHERE clause values
    updateValues.push(id, userId);
    
    // Only run update if there are fields to update
    if (updateFields.length > 0) {
      await runStatement(
        `UPDATE products SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
        updateValues
      );
    }

    // Fetch the updated product from database
    const updatedProducts = await runQuery<any>(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ? AND p.user_id = ?`,
      [id, userId]
    );

    const updatedProduct = updatedProducts[0];
    return NextResponse.json({
      ...updatedProduct,
      scores: updatedProduct.scores_json ? JSON.parse(updatedProduct.scores_json) : null,
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if product exists and belongs to user
    const products = await runQuery(
      'SELECT id FROM products WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await runStatement('DELETE FROM products WHERE id = ? AND user_id = ?', [id, userId]);

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
