import { NextRequest, NextResponse } from 'next/server';
import { runQuery, runStatement } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Get user settings
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await runQuery<{
      openai_api_key: string | null;
      openai_endpoint: string | null;
      openai_custom_model: string | null;
      openrouter_api_key: string | null;
      openrouter_endpoint: string | null;
      openrouter_custom_model: string | null;
      sumopod_api_key: string | null;
      sumopod_endpoint: string | null;
      sumopod_custom_model: string | null;
      active_provider: string;
      active_model: string;
    }>(
      `SELECT 
        openai_api_key,
        openai_endpoint,
        openai_custom_model,
        openrouter_api_key,
        openrouter_endpoint,
        openrouter_custom_model,
        sumopod_api_key,
        sumopod_endpoint,
        sumopod_custom_model,
        active_provider,
        active_model
       FROM user_settings WHERE user_id = ?`,
      [userId]
    );

    if (settings.length === 0) {
      // Return default settings
      return NextResponse.json({
        openai_api_key: '',
        openai_endpoint: '',
        openai_custom_model: '',
        openrouter_api_key: '',
        openrouter_endpoint: '',
        openrouter_custom_model: '',
        sumopod_api_key: '',
        sumopod_endpoint: '',
        sumopod_custom_model: '',
        active_provider: 'openai',
        active_model: '',
      });
    }

    // Mask API keys in response (only show last 4 chars)
    const settingsData = settings.length > 0 ? settings[0] : null;
    
    if (!settingsData) {
      // Return default settings
      return NextResponse.json({
        openai_api_key: '',
        openai_endpoint: '',
        openai_custom_model: '',
        openrouter_api_key: '',
        openrouter_endpoint: '',
        openrouter_custom_model: '',
        sumopod_api_key: '',
        sumopod_endpoint: '',
        sumopod_custom_model: '',
        active_provider: 'openai',
        active_model: '',
      });
    }
    
    const maskedSettings = {
      openai_api_key: settingsData.openai_api_key ? '***' + settingsData.openai_api_key.slice(-4) : '',
      openai_api_key_exists: !!settingsData.openai_api_key,
      openai_endpoint: settingsData.openai_endpoint || '',
      openai_custom_model: settingsData.openai_custom_model || '',
      openrouter_api_key: settingsData.openrouter_api_key ? '***' + settingsData.openrouter_api_key.slice(-4) : '',
      openrouter_api_key_exists: !!settingsData.openrouter_api_key,
      openrouter_endpoint: settingsData.openrouter_endpoint || '',
      openrouter_custom_model: settingsData.openrouter_custom_model || '',
      sumopod_api_key: settingsData.sumopod_api_key ? '***' + settingsData.sumopod_api_key.slice(-4) : '',
      sumopod_api_key_exists: !!settingsData.sumopod_api_key,
      sumopod_endpoint: settingsData.sumopod_endpoint || '',
      sumopod_custom_model: settingsData.sumopod_custom_model || '',
      active_provider: settingsData.active_provider || 'openai',
      active_model: settingsData.active_model || '',
    };

    return NextResponse.json(maskedSettings);
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// Save user settings
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      openai_api_key,
      openai_endpoint,
      openai_custom_model,
      openrouter_api_key,
      openrouter_endpoint,
      openrouter_custom_model,
      sumopod_api_key,
      sumopod_endpoint,
      sumopod_custom_model,
      active_provider,
      active_model,
    } = body;

    // Check if user exists first
    const userExists = await runQuery(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (userExists.length === 0) {
      return NextResponse.json(
        { error: 'User not found. Please login again.' },
        { status: 401 }
      );
    }

    // Check if settings exist
    const existingSettings = await runQuery(
      'SELECT id FROM user_settings WHERE user_id = ?',
      [userId]
    );

    // Get existing API keys if not provided (to preserve them)
    let existingKeys: Record<string, string> = {};
    if (existingSettings.length > 0) {
      const existing = await runQuery<{
        openai_api_key: string | null;
        openrouter_api_key: string | null;
        sumopod_api_key: string | null;
      }>(
        'SELECT openai_api_key, openrouter_api_key, sumopod_api_key FROM user_settings WHERE user_id = ?',
        [userId]
      );
      if (existing.length > 0) {
        existingKeys = {
          openai_api_key: existing[0].openai_api_key || '',
          openrouter_api_key: existing[0].openrouter_api_key || '',
          sumopod_api_key: existing[0].sumopod_api_key || '',
        };
      }
    }

    // Use new API key if provided, otherwise keep existing
    const finalOpenAIKey = openai_api_key && !openai_api_key.startsWith('***') 
      ? openai_api_key 
      : existingKeys.openai_api_key || '';
    const finalOpenRouterKey = openrouter_api_key && !openrouter_api_key.startsWith('***')
      ? openrouter_api_key
      : existingKeys.openrouter_api_key || '';
    const finalSumopodKey = sumopod_api_key && !sumopod_api_key.startsWith('***')
      ? sumopod_api_key
      : existingKeys.sumopod_api_key || '';

    if (existingSettings.length > 0) {
      await runStatement(
        `UPDATE user_settings SET 
          openai_api_key = ?,
          openai_endpoint = ?,
          openai_custom_model = ?,
          openrouter_api_key = ?,
          openrouter_endpoint = ?,
          openrouter_custom_model = ?,
          sumopod_api_key = ?,
          sumopod_endpoint = ?,
          sumopod_custom_model = ?,
          active_provider = ?,
          active_model = ?
         WHERE user_id = ?`,
        [
          finalOpenAIKey || null,
          openai_endpoint || null,
          openai_custom_model || null,
          finalOpenRouterKey || null,
          openrouter_endpoint || null,
          openrouter_custom_model || null,
          finalSumopodKey || null,
          sumopod_endpoint || null,
          sumopod_custom_model || null,
          active_provider || 'openai',
          active_model || null,
          userId,
        ]
      );
    } else {
      await runStatement(
        `INSERT INTO user_settings (
          id, user_id, openai_api_key, openai_endpoint, openai_custom_model,
          openrouter_api_key, openrouter_endpoint, openrouter_custom_model,
          sumopod_api_key, sumopod_endpoint, sumopod_custom_model,
          active_provider, active_model
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          finalOpenAIKey || null,
          openai_endpoint || null,
          openai_custom_model || null,
          finalOpenRouterKey || null,
          openrouter_endpoint || null,
          openrouter_custom_model || null,
          finalSumopodKey || null,
          sumopod_endpoint || null,
          sumopod_custom_model || null,
          active_provider || 'openai',
          active_model || null,
        ]
      );
    }

    // Return masked keys with has_api_key flags for frontend to know if key exists
    return NextResponse.json({
      message: 'Settings saved successfully',
      openai_api_key: finalOpenAIKey ? '***' + finalOpenAIKey.slice(-4) : '',
      openai_api_key_exists: !!finalOpenAIKey,
      openai_endpoint: openai_endpoint || '',
      openai_custom_model: openai_custom_model || '',
      openrouter_api_key: finalOpenRouterKey ? '***' + finalOpenRouterKey.slice(-4) : '',
      openrouter_api_key_exists: !!finalOpenRouterKey,
      openrouter_endpoint: openrouter_endpoint || '',
      openrouter_custom_model: openrouter_custom_model || '',
      sumopod_api_key: finalSumopodKey ? '***' + finalSumopodKey.slice(-4) : '',
      sumopod_api_key_exists: !!finalSumopodKey,
      sumopod_endpoint: sumopod_endpoint || '',
      sumopod_custom_model: sumopod_custom_model || '',
      active_provider: active_provider || 'openai',
      active_model: active_model || '',
    });
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
