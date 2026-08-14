import { NextRequest, NextResponse } from 'next/server';
import { runQuery, runStatement } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weights = await runQuery<{
      profit_margin: number;
      market_potential: number;
      competition_level: number;
      uniqueness: number;
    }>(
      'SELECT profit_margin, market_potential, competition_level, uniqueness FROM scoring_weights WHERE user_id = ?',
      [userId]
    );

    if (weights.length === 0) {
      // Return default weights
      return NextResponse.json({
        profit_margin: 0.3,
        market_potential: 0.25,
        competition_level: 0.25,
        uniqueness: 0.2,
      });
    }

    return NextResponse.json({
      profit_margin: weights[0].profit_margin,
      market_potential: weights[0].market_potential,
      competition_level: weights[0].competition_level,
      uniqueness: weights[0].uniqueness,
    });
  } catch (error) {
    console.error('Get weights error:', error);
    return NextResponse.json(
      { error: 'Failed to get weights' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profit_margin, market_potential, competition_level, uniqueness } = await request.json();

    // Validate weights sum to 1
    const total = (profit_margin || 0) + (market_potential || 0) + (competition_level || 0) + (uniqueness || 0);
    if (Math.abs(total - 1) > 0.01) {
      return NextResponse.json(
        { error: 'Weights must sum to 1 (100%)' },
        { status: 400 }
      );
    }

    // Check if weights exist for user
    const existingWeights = await runQuery(
      'SELECT id FROM scoring_weights WHERE user_id = ?',
      [userId]
    );

    if (existingWeights.length > 0) {
      await runStatement(
        `UPDATE scoring_weights SET 
          profit_margin = ?, market_potential = ?, 
          competition_level = ?, uniqueness = ?
         WHERE user_id = ?`,
        [profit_margin, market_potential, competition_level, uniqueness, userId]
      );
    } else {
      await runStatement(
        `INSERT INTO scoring_weights (id, user_id, profit_margin, market_potential, competition_level, uniqueness)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), userId, profit_margin, market_potential, competition_level, uniqueness]
      );
    }

    return NextResponse.json({
      profit_margin,
      market_potential,
      competition_level,
      uniqueness,
    });
  } catch (error) {
    console.error('Update weights error:', error);
    return NextResponse.json(
      { error: 'Failed to update weights' },
      { status: 500 }
    );
  }
}
