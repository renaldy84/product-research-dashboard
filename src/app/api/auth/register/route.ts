import { NextRequest, NextResponse } from 'next/server';
import { runQuery, runStatement } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();

    // Validate input
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await runQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await runStatement(
      `INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)`,
      [userId, email, name, passwordHash]
    );

    // Create default scoring weights for the user
    await runStatement(
      `INSERT INTO scoring_weights (id, user_id, profit_margin, market_potential, competition_level, uniqueness) VALUES (?, ?, 0.3, 0.25, 0.25, 0.2)`,
      [uuidv4(), userId]
    );

    return NextResponse.json({
      id: userId,
      email,
      name,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
