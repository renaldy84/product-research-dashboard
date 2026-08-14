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
    const categories = await runQuery(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (categories.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(categories[0]);
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { error: 'Failed to get category' },
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
    const { name, description } = await request.json();

    // Check if category exists and belongs to user
    const categories = await runQuery(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (categories.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await runStatement(
      `UPDATE categories SET name = ?, description = ? WHERE id = ? AND user_id = ?`,
      [name, description || '', id, userId]
    );

    const updatedCategory = {
      id,
      name,
      description: description || '',
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
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

    // Check if category exists and belongs to user
    const categories = await runQuery(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (categories.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Delete category (products will have null category_id)
    await runStatement('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId]);

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
