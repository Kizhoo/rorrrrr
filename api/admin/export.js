import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const format = url.searchParams.get('format') || 'json';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const category = url.searchParams.get('category');
    
    // Build query
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: messages, error } = await query;
    
    if (error) throw error;
    
    if (format === 'csv') {
      const csv = convertToCSV(messages);
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=messages.csv'
        }
      });
    } else if (format === 'excel') {
      const excelData = convertToExcel(messages);
      return new Response(excelData, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=messages.xlsx'
        }
      });
    } else {
      // JSON format
      return new Response(JSON.stringify({
        success: true,
        count: messages.length,
        messages
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename=messages.json'
        }
      });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

function convertToCSV(messages) {
  const headers = ['ID', 'Sender', 'Message', 'Category', 'Read', 'Priority', 'Images', 'Created At'];
  const rows = messages.map(msg => [
    msg.id,
    msg.sender_name || 'Anonymous',
    `"${msg.message.replace(/"/g, '""')}"`,
    msg.category,
    msg.is_read ? 'Yes' : 'No',
    msg.is_priority ? 'Yes' : 'No',
    msg.images ? msg.images.length : 0,
    new Date(msg.created_at).toLocaleString()
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function convertToExcel(messages) {
  // Simple Excel format (CSV with tab separators)
  const headers = ['ID', 'Sender', 'Message', 'Category', 'Read', 'Priority', 'Images', 'Created At'];
  const rows = messages.map(msg => [
    msg.id,
    msg.sender_name || 'Anonymous',
    msg.message.replace(/"/g, '""'),
    msg.category,
    msg.is_read ? 'Yes' : 'No',
    msg.is_priority ? 'Yes' : 'No',
    msg.images ? msg.images.length : 0,
    new Date(msg.created_at).toLocaleString()
  ]);
  
  return [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
}
