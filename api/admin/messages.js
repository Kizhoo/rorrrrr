import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
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

// GET all messages with filters
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
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 25;
    const offset = (page - 1) * limit;
    
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const unread = url.searchParams.get('unread');
    const sort = url.searchParams.get('sort') || 'desc';
    
    // Build query
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`message.ilike.%${search}%,sender_name.ilike.%${search}%`);
    }
    
    if (unread === 'true') {
      query = query.eq('is_read', false);
    }
    
    // Apply sorting
    if (sort === 'desc') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: true });
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: messages, error, count } = await query;
    
    if (error) throw error;
    
    // Get stats
    const { data: statsData } = await supabase
      .from('messages')
      .select('is_read, is_priority, created_at');
    
    const stats = {
      total: count || 0,
      unread: statsData?.filter(m => !m.is_read).length || 0,
      priority: statsData?.filter(m => m.is_priority).length || 0,
      today: statsData?.filter(m => {
        const msgDate = new Date(m.created_at);
        const today = new Date();
        return msgDate.toDateString() === today.toDateString();
      }).length || 0
    };
    
    return new Response(JSON.stringify({
      success: true,
      messages: messages || [],
      stats,
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// POST - Create new message (public)
export async function POST(request) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_name: body.sender_name || 'Anonymous',
        message: body.message,
        category: body.category || 'umum',
        images: body.images || []
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Message sent successfully',
      data
    }), {
      status: 201,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error creating message:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// PATCH - Update message (mark as read, priority, etc)
export async function PATCH(request) {
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
    const url = new URL(request.url);
    const messageId = url.pathname.split('/').pop();
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('messages')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Message updated successfully',
      data
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error updating message:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// DELETE - Delete message
export async function DELETE(request) {
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
    const url = new URL(request.url);
    const messageId = url.pathname.split('/').pop();
    
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Message deleted successfully'
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error deleting message:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
