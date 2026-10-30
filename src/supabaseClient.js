import { createClient } from '@supabase/supabase-js'

// Dán URL và Anon Key của bạn vào đây
const supabaseUrl = 'https://hdkysfjsffqlaxfflweb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhka3lzZmpzZmZxbGF4ZmZsd2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNDU1NTEsImV4cCI6MjEwODkyMTU1MX0.l3Z_IuRTE1f7ApLDjBB5XLYKquSN_2ESUMQZrMAlH6U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)