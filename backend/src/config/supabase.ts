import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;  

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase Service Key or URL');
}
 
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}); 

export const supabase = createClient(supabaseUrl, anonKey || serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});