// Simpan sebagai /api/admin/messages.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware untuk auth admin (sederhana)
const adminAuth = (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.split(' ')[1];
  // Di production, gunakan JWT atau session yang proper
  return token === process.env.ADMIN_TOKEN || token === 'admin-token-sementara';
};

export async function GET(req) {
  // Check admin auth
  if (!adminAuth(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const isRead = searchParams.get('is_read');
    const search = searchParams.get('search');
    
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    // Apply filters
    if (category) query = query.eq('category', category);
    if (isRead !== null) query = query.eq('is_read', isRead === 'true');
    if (search) {
      query = query.or(`username.ilike.%${search}%,message.ilike.%${search}%`);
    }
    
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
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Admin GET error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Mark as read
export async function PUT(req) {
  if (!adminAuth(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');
    
    if (!messageId) {
      return new Response(JSON.stringify({ error: 'Message ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
    
    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Mark as read error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Delete message
export async function DELETE(req) {
  if (!adminAuth(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');
    
    if (!messageId) {
      return new Response(JSON.stringify({ error: 'Message ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
             }
