// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// Ambil variabel dari .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

// Validasi konfigurasi environment
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL tidak ditemukan. Pastikan ada di file .env')
}
if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_KEY tidak ditemukan. Pastikan ada di file .env')
}

// Buat instance Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Ekspor supaya bisa digunakan file lain
export { supabase }
