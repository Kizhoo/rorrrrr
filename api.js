// Vercel Serverless API untuk To-Kizhoo
// Simpan sebagai /api/index.js di Vercel

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase configuration
const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'sb_publishable__dylrUDStK0yejyhVNvaKA_Uf32RZkn';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}, corsHeaders);
  }

  // Set CORS headers untuk semua response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    // Routing berdasarkan path
    const path = req.url.split('?')[0];
    
    switch (path) {
      case '/api/messages':
        if (req.method === 'GET') {
          await handleGetMessages(req, res);
        } else if (req.method === 'POST') {
          await handlePostMessage(req, res);
        } else {
          res.status(405).json({ error: 'Method not allowed' });
        }
        break;
        
      case '/api/stats':
        await handleGetStats(req, res);
        break;
        
      case '/api/stats/detailed':
        await handleGetDetailedStats(req, res);
        break;
        
      default:
        // Handle dynamic routes
        if (path.startsWith('/api/messages/')) {
          const messageId = path.split('/')[3];
          
          if (path.endsWith('/read')) {
            await handleMarkAsRead(req, res, messageId);
          } else {
            if (req.method === 'DELETE') {
              await handleDeleteMessage(req, res, messageId);
            } else if (req.method === 'PUT') {
              await handleUpdateMessage(req, res, messageId);
            } else {
              res.status(405).json({ error: 'Method not allowed' });
            }
          }
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// 1. GET /api/messages - Get messages with filters
async function handleGetMessages(req, res) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      is_read, 
      date,
      search 
    } = req.query;
    
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    
    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }
    
    if (date) {
      query = query.gte('created_at', `${date}T00:00:00Z`)
                   .lte('created_at', `${date}T23:59:59Z`);
    }
    
    if (search) {
      query = query.or(`username.ilike.%${search}%,message.ilike.%${search}%`);
    }
    
    const { data: messages, error, count } = await query;
    
    if (error) throw error;
    
    res.status(200).json({
      messages: messages || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / limit)
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. POST /api/messages - Create new message
async function handlePostMessage(req, res) {
  try {
    // Handle multipart form data untuk file upload
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      await handleMultipartMessage(req, res);
    } else {
      // Handle JSON data
      const { username, message, category = 'umum', priority = false } = req.body;
      
      if (!username || !message) {
        return res.status(400).json({ error: 'Username dan message diperlukan' });
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          username,
          message,
          category,
          priority,
          is_read: false,
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          user_agent: req.headers['user-agent']
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(201).json({
        success: true,
        message: 'Pesan berhasil disimpan',
        data
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Handle multipart form data dengan file upload
async function handleMultipartMessage(req, res) {
  try {
    // Di production, gunakan multer atau busboy untuk parse form-data
    // Ini contoh sederhana untuk Vercel Serverless
    const formData = await parseFormData(req);
    
    const { username, message, category = 'umum', priority = false } = formData.fields;
    const photos = [];
    
    // Handle file uploads ke Supabase Storage
    if (formData.files && formData.files.length > 0) {
      for (const file of formData.files) {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('message-images')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });
        
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('message-images')
            .getPublicUrl(fileName);
          
          photos.push(publicUrl);
        }
      }
    }
    
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        username,
        message,
        category,
        priority: priority === 'true',
        photos: photos.length > 0 ? photos : null,
        is_read: false,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      message: 'Pesan berhasil disimpan',
      data
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Helper untuk parse form-data (sederhana)
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        // Implementasi parsing form-data sederhana
        // Di production, gunakan library seperti busboy
        resolve({
          fields: {
            username: 'Sample User',
            message: 'Sample message',
            category: 'umum',
            priority: 'false'
          },
          files: []
        });
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// 5. PUT /api/messages/:id/read - Mark as read
async function handleMarkAsRead(req, res, messageId) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
    
    if (error) throw error;
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 6. DELETE /api/messages/:id - Delete message
async function handleDeleteMessage(req, res, messageId) {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 7. GET /api/stats - Get statistics
async function handleGetStats(req, res) {
  try {
    const { data, error } = await supabase.rpc('get_message_stats');
    
    if (error) throw error;
    
    res.status(200).json(data[0] || {
      total: 0,
      unread: 0,
      priority: 0,
      today: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 8. GET /api/stats/detailed - Get detailed statistics
async function handleGetDetailedStats(req, res) {
  try {
    // Get total count
    const { count: total } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    // Get counts by category
    const { data: categoryData } = await supabase
      .from('messages')
      .select('category')
      .not('is_archived', 'eq', true);
    
    const categories = {};
    if (categoryData) {
      categoryData.forEach(msg => {
        categories[msg.category] = (categories[msg.category] || 0) + 1;
      });
    }
    
    // Get activity for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: activityData } = await supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    const activity = {};
    if (activityData) {
      activityData.forEach(msg => {
        const date = new Date(msg.created_at).toLocaleDateString('id-ID');
        activity[date] = (activity[date] || 0) + 1;
      });
    }
    
    res.status(200).json({
      total: total || 0,
      categories,
      activity,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 9. PUT /api/messages/:id - Update message
async function handleUpdateMessage(req, res, messageId) {
  try {
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', messageId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 10. Export untuk Vercel
module.exports = handler;
