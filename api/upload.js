import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('image');
        
        if (!file) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No file uploaded'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }
        
        // Validasi file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return new Response(JSON.stringify({
                success: false,
                error: 'File size too large (max 5MB)'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }
        
        // Validasi file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }
        
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `messages/${fileName}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('public')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false
            });
        
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('public')
            .getPublicUrl(filePath);
        
        return new Response(JSON.stringify({
            success: true,
            imageUrl: publicUrl,
            fileName: file.name,
            fileSize: file.size,
            message: 'Image uploaded successfully'
        }), {
            status: 200,
            headers: corsHeaders
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
