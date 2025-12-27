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
    const period = url.searchParams.get('period') || 'week';
    
    // Get messages for analytics
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*');
    
    if (messagesError) throw messagesError;
    
    // Calculate analytics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const analytics = {
      total: messages.length,
      unread: messages.filter(m => !m.is_read).length,
      priority: messages.filter(m => m.is_priority).length,
      today: messages.filter(m => new Date(m.created_at) >= today).length,
      thisWeek: messages.filter(m => new Date(m.created_at) >= weekAgo).length,
      thisMonth: messages.filter(m => new Date(m.created_at) >= monthAgo).length,
      
      // Category breakdown
      categories: {
        umum: messages.filter(m => m.category === 'umum').length,
        pujian: messages.filter(m => m.category === 'pujian').length,
        kritik: messages.filter(m => m.category === 'kritik').length,
        pertanyaan: messages.filter(m => m.category === 'pertanyaan').length,
        rahasia: messages.filter(m => m.category === 'rahasia').length
      },
      
      // Daily data for chart
      dailyData: await getDailyData(messages, period),
      
      // Hourly activity
      hourlyData: getHourlyData(messages),
      
      // Messages with images
      withImages: messages.filter(m => m.images && m.images.length > 0).length
    };
    
    return new Response(JSON.stringify({
      success: true,
      analytics
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

async function getDailyData(messages, period) {
  const days = period === 'month' ? 30 : period === 'week' ? 7 : 1;
  const dailyCounts = {};
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyCounts[dateStr] = 0;
  }
  
  messages.forEach(msg => {
    const msgDate = new Date(msg.created_at).toISOString().split('T')[0];
    if (dailyCounts[msgDate] !== undefined) {
      dailyCounts[msgDate]++;
    }
  });
  
  return {
    labels: Object.keys(dailyCounts),
    values: Object.values(dailyCounts)
  };
}

function getHourlyData(messages) {
  const hourlyCounts = new Array(24).fill(0);
  
  messages.forEach(msg => {
    const hour = new Date(msg.created_at).getHours();
    hourlyCounts[hour]++;
  });
  
  return hourlyCounts;
}
