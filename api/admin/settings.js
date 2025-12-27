import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json'
};

// Helper function to check admin auth
const adminAuth = (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  return token === '1602' || token === 'admin-token-sementara';
};

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// GET all settings
export async function GET(request) {
  if (!adminAuth(request)) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('*')
      .order('category', { ascending: true });
    
    if (error) throw error;
    
    // Convert to object format
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Convert value based on type
      switch (setting.setting_type) {
        case 'number':
          value = Number(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch {
            value = value;
          }
          break;
        default:
          value = String(value);
      }
      
      settingsObj[setting.setting_key] = value;
    });
    
    return new Response(JSON.stringify({
      success: true,
      settings: settingsObj,
      raw: settings
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error fetching settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// UPDATE settings
export async function PUT(request) {
  if (!adminAuth(request)) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    const body = await request.json();
    const { settings } = body;
    
    if (!settings || typeof settings !== 'object') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid settings data'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const updates = [];
    const now = new Date().toISOString();
    
    // Prepare updates
    for (const [key, value] of Object.entries(settings)) {
      let stringValue;
      let settingType = 'string';
      
      // Determine type and convert value
      if (typeof value === 'boolean') {
        stringValue = value.toString();
        settingType = 'boolean';
      } else if (typeof value === 'number') {
        stringValue = value.toString();
        settingType = 'number';
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
        settingType = 'json';
      } else {
        stringValue = String(value);
      }
      
      updates.push({
        setting_key: key,
        setting_value: stringValue,
        setting_type: settingType,
        updated_at: now
      });
    }
    
    // Batch upsert (update or insert)
    const { error } = await supabase
      .from('admin_settings')
      .upsert(updates, {
        onConflict: 'setting_key'
      });
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Settings updated successfully',
      updated: updates.length
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error updating settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// RESET to defaults
export async function POST(request) {
  if (!adminAuth(request)) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'reset') {
      // Default settings
      const defaultSettings = [
        { setting_key: 'site_name', setting_value: 'To-Kizhoo Admin', setting_type: 'string', category: 'general' },
        { setting_key: 'admin_email', setting_value: 'admin@kizhoo.com', setting_type: 'string', category: 'general' },
        { setting_key: 'timezone', setting_value: 'Asia/Jakarta', setting_type: 'string', category: 'general' },
        { setting_key: 'items_per_page', setting_value: '25', setting_type: 'number', category: 'general' },
        { setting_key: 'email_notifications', setting_value: 'true', setting_type: 'boolean', category: 'notifications' },
        { setting_key: 'push_notifications', setting_value: 'true', setting_type: 'boolean', category: 'notifications' },
        { setting_key: 'sound_alerts', setting_value: 'false', setting_type: 'boolean', category: 'notifications' },
        { setting_key: 'session_timeout', setting_value: '30', setting_type: 'number', category: 'security' },
        { setting_key: 'two_factor_auth', setting_value: 'false', setting_type: 'boolean', category: 'security' },
        { setting_key: 'ip_whitelist', setting_value: 'false', setting_type: 'boolean', category: 'security' },
        { setting_key: 'login_attempts', setting_value: '5', setting_type: 'number', category: 'security' },
        { setting_key: 'theme', setting_value: 'dark', setting_type: 'string', category: 'appearance' },
        { setting_key: 'primary_color', setting_value: '#6366f1', setting_type: 'string', category: 'appearance' },
        { setting_key: 'font_size', setting_value: 'medium', setting_type: 'string', category: 'appearance' },
        { setting_key: 'compact_mode', setting_value: 'false', setting_type: 'boolean', category: 'appearance' },
        { setting_key: 'message_sorting', setting_value: 'newest', setting_type: 'string', category: 'messages' },
        { setting_key: 'auto_delete_days', setting_value: '30', setting_type: 'number', category: 'messages' },
        { setting_key: 'auto_mark_read', setting_value: 'false', setting_type: 'boolean', category: 'messages' },
        { setting_key: 'max_message_length', setting_value: '1000', setting_type: 'number', category: 'messages' },
        { setting_key: 'backup_frequency', setting_value: 'weekly', setting_type: 'string', category: 'backup' },
        { setting_key: 'backup_format', setting_value: 'json', setting_type: 'string', category: 'backup' },
        { setting_key: 'backup_location', setting_value: 'local', setting_type: 'string', category: 'backup' }
      ];
      
      const now = new Date().toISOString();
      const updates = defaultSettings.map(setting => ({
        ...setting,
        updated_at: now
      }));
      
      const { error } = await supabase
        .from('admin_settings')
        .upsert(updates, {
          onConflict: 'setting_key'
        });
      
      if (error) throw error;
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Settings reset to defaults'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }), {
      status: 400,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error resetting settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
