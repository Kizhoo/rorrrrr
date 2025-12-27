import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

const adminAuth = (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  return token === '1602' || token === 'admin-token-sementara';
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

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
    const { action, days = 30 } = body;
    
    if (action === 'clearOld') {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Get old messages
      const { data: oldMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id, images')
        .lt('created_at', cutoffDate.toISOString());
      
      if (fetchError) throw fetchError;
      
      // Delete messages
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .lt('created_at', cutoffDate.toISOString());
      
      if (deleteError) throw deleteError;
      
      return new Response(JSON.stringify({
        success: true,
        message: `Deleted ${oldMessages.length} messages older than ${days} days`,
        deletedCount: oldMessages.length
      }), {
        status: 200,
        headers: corsHeaders
      });
      
    } else if (action === 'clearRead') {
      // Delete read messages
      const { data: readMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id')
        .eq('is_read', true);
      
      if (fetchError) throw fetchError;
      
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('is_read', true);
      
      if (deleteError) throw deleteError;
      
      return new Response(JSON.stringify({
        success: true,
        message: `Deleted ${readMessages.length} read messages`,
        deletedCount: readMessages.length
      }), {
        status: 200,
        headers: corsHeaders
      });
      
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid action'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
