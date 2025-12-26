// api/admin/messages.js - NO AUTH VERSION
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

// Handle OPTIONS
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// GET messages - NO AUTH
export async function GET(req) {
  console.log('GET request - NO AUTH');
  
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const isRead = searchParams.get('is_read');
    const search = searchParams.get('search');
    
    console.log('Params:', { page, limit, category, isRead, search });
    
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (category && category !== '') query = query.eq('category', category);
    if (isRead === 'true') query = query.eq('is_read', true);
    if (isRead === 'false') query = query.eq('is_read', false);
    if (search) query = query.or(`username.ilike.%${search}%,message.ilike.%${search}%`);
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data: messages, error, count } = await query;
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      messages: messages || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// PUT - NO AUTH
export async function PUT(req) {
  console.log('PUT request - NO AUTH');
  
  try {
    const url = new URL(req.url);
    const messageId = url.searchParams.get('id');
    const body = await req.json();
    
    console.log('Update:', { messageId, body });
    
    if (!messageId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Message ID required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const { error } = await supabase
      .from('messages')
      .update(body)
      .eq('id', messageId);
    
    if (error) throw error;
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Updated'
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// DELETE - NO AUTH
export async function DELETE(req) {
  console.log('DELETE request - NO AUTH');
  
  try {
    const url = new URL(req.url);
    const messageId = url.searchParams.get('id');
    
    if (!messageId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Message ID required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Deleted'
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
