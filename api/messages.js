// Vercel Serverless API untuk To-Kizhoo
// Simpan sebagai /api/messages.js di Vercel

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper untuk response JSON
const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

// GET /api/stats
export async function GET(req) {
  try {
    // Get total messages
    const { count: total, error: totalError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // Get today's messages
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount, error: todayError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`);
    
    if (todayError) throw todayError;
    
    // Get unread messages
    const { count: unread, error: unreadError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    
    if (unreadError) throw unreadError;
    
    return jsonResponse({
      success: true,
      total: total || 0,
      today: todayCount || 0,
      unread: unread || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

// POST /api/messages
export async function POST(req) {
  try {
    const body = await req.json();
    
    const { username, message, category = 'umum', priority = false, photos = [] } = body;
    
    // Validasi input
    if (!username || !message) {
      return jsonResponse({
        success: false,
        error: 'Username dan message diperlukan'
      }, 400);
    }
    
    // Validasi panjang pesan
    if (message.length > 500) {
      return jsonResponse({
        success: false,
        error: 'Pesan maksimal 500 karakter'
      }, 400);
    }
    
    // Validasi photos jika ada
    if (photos.length > 5) {
      return jsonResponse({
        success: false,
        error: 'Maksimal 5 foto yang dapat diupload'
      }, 400);
    }
    
    // Validasi base64 photos
    const validPhotos = [];
    for (const photo of photos) {
      if (typeof photo === 'string' && photo.startsWith('data:image')) {
        // Validasi ukuran base64 (maksimal 5MB setelah encode)
        const base64Length = photo.length - (photo.indexOf(',') + 1);
        const padding = photo.endsWith('==') ? 2 : photo.endsWith('=') ? 1 : 0;
        const fileSizeInBytes = (base64Length * 3) / 4 - padding;
        
        if (fileSizeInBytes <= 5 * 1024 * 1024) { // 5MB
          validPhotos.push(photo);
        } else {
          console.warn('Photo too large, skipping');
        }
      }
    }
    
    // Insert ke database
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        username: username.trim(),
        message: message.trim(),
        category: category.trim(),
        priority: Boolean(priority),
        photos: validPhotos.length > 0 ? validPhotos : null,
        is_read: false,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Update analytics (async, jangan tunggu)
    updateAnalytics();
    
    return jsonResponse({
      success: true,
      message: 'Pesan berhasil dikirim',
      data: {
        id: data.id,
        username: data.username,
        category: data.category,
        created_at: data.created_at
      }
    }, 201);
    
  } catch (error) {
    console.error('POST error:', error);
    
    // Handle specific Supabase errors
    let errorMessage = 'Gagal menyimpan pesan';
    let statusCode = 500;
    
    if (error.code === '23505') {
      errorMessage = 'Data duplikat terdeteksi';
      statusCode = 409;
    } else if (error.code === '23502') {
      errorMessage = 'Data tidak lengkap';
      statusCode = 400;
    }
    
    return jsonResponse({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, statusCode);
  }
}

// Fungsi helper untuk update analytics (async)
async function updateAnalytics() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Cek apakah sudah ada data untuk hari ini
    const { data: existing } = await supabase
      .from('analytics')
      .select('*')
      .eq('date', today)
      .single();
    
    if (existing) {
      // Update existing
      await supabase
        .from('analytics')
        .update({
          total_messages: existing.total_messages + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert new
      await supabase
        .from('analytics')
        .insert([{
          date: today,
          total_messages: 1,
          unread_messages: 1
        }]);
    }
  } catch (error) {
    console.error('Analytics update error:', error);
  }
}

// Handle OPTIONS untuk CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
        }
