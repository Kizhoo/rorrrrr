// api/admin/settings.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Auth middleware
const adminAuth = (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  return token === '1602' || token === 'admin-token-sementara';
};

// Handle OPTIONS
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// GET all settings
export async function GET(req) {
  if (!adminAuth(req)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
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
      // Convert value based on type
      let value = setting.setting_value;
      if (setting.setting_type === 'number') {
        value = Number(value);
      } else if (setting.setting_type === 'boolean') {
        value = value === 'true';
      } else if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = value;
        }
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
    console.error('Settings GET error:', error);
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
export async function PUT(req) {
  if (!adminAuth(req)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders
    });
  }
  
  try {
    const body = await req.json();
    const settings = body.settings;
    
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
      
      // Convert based on type
      if (typeof value === 'boolean') {
        stringValue = value.toString();
      } else if (typeof value === 'number') {
        stringValue = value.toString();
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = value;
      }
      
      updates.push({
        setting_key: key,
        setting_value: stringValue,
        updated_at: now
      });
    }
    
    // Batch update
    for (const update of updates) {
      const { error } = await supabase
        .from('admin_settings')
        .update({
          setting_value: update.setting_value,
          updated_at: update.updated_at
        })
        .eq('setting_key', update.setting_key);
      
      if (error) {
        console.error(`Error updating setting ${update.setting_key}:`, error);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Settings updated successfully',
      updated: updates.length
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Settings PUT error:', error);
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
export async function POST(req) {
  if (!adminAuth(req)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders
    });
  }
  
  try {
    const body = await req.json();
    const action = body.action;
    
    if (action === 'reset') {
      // Reset to default values
      const defaultSettings = {
        'site_name': 'To-Kizhoo Admin',
        'admin_email': 'admin@kizhoo.com',
        'timezone': 'Asia/Jakarta',
        'items_per_page': '25',
        'email_notifications': 'true',
        'push_notifications': 'true',
        'sound_alerts': 'false',
        'session_timeout': '30',
        'two_factor_auth': 'false',
        'ip_whitelist': 'false',
        'login_attempts': '5',
        'theme': 'dark',
        'primary_color': '#6366f1',
        'font_size': 'medium',
        'compact_mode': 'false',
        'message_sorting': 'newest',
        'auto_delete_days': '30',
        'auto_mark_read': 'false',
        'max_message_length': '1000',
        'backup_frequency': 'weekly',
        'backup_format': 'json',
        'backup_location': 'local'
      };
      
      const updates = [];
      const now = new Date().toISOString();
      
      for (const [key, value] of Object.entries(defaultSettings)) {
        updates.push({
          setting_key: key,
          setting_value: value,
          updated_at: now
        });
      }
      
      // Batch update
      for (const update of updates) {
        await supabase
          .from('admin_settings')
          .update({
            setting_value: update.setting_value,
            updated_at: update.updated_at
          })
          .eq('setting_key', update.setting_key);
      }
      
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
    console.error('Settings POST error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
  }
