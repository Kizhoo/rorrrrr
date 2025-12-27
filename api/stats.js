import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttylewbnhhhsgtaijqvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWxld2JuaGhoc2d0YWlqcXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MTc4NywiZXhwIjoyMDgyMjQ3Nzg3fQ.a4Ft1bBxu1CD59QaJM6rnRyJVbOHks3BcOXFjtk2v_s';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
    try {
        // Get total messages
        const { count: total, error: totalError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true });
        
        if (totalError) throw totalError;
        
        // Get today's messages
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount, error: todayError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        
        if (todayError) throw todayError;
        
        // Get unread messages
        const { count: unread, error: unreadError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);
        
        if (unreadError) throw unreadError;
        
        return new Response(JSON.stringify({
            success: true,
            total: total || 0,
            today: todayCount || 0,
            unread: unread || 0
        }), {
            status: 200,
            headers: corsHeaders
        });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
