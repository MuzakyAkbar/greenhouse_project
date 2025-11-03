// src/stores/useAuthStore.js
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    error: null,
    loading: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.user,
    role: (state) => state.user?.role || null,
  },
  actions: {
    async login(email, password) {
      this.loading = true
      this.error = null
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          this.error = error.message
          return false
        }

        const { data: profile, error: profileError } = await supabase
          .from('user')
          .select('user_id, email, role, organization, ob_user, ob_key')
          .eq('user_id', data.user.id)
          .single()

        if (profile) {
          localStorage.setItem('OB_USER', profile.ob_user)
          localStorage.setItem('OB_KEY', profile.ob_key)
        }

        if (profileError) {
          this.error = profileError.message
          return false
        }

        this.user = { ...profile }
        localStorage.setItem('user', JSON.stringify(this.user))

        return true
      } catch (err) {
        this.error = 'Terjadi kesalahan server'
        console.error(err)
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        // 🔹 Cek apakah ada session aktif dulu
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Kalau ada session, signOut dari Supabase
          const { error } = await supabase.auth.signOut()
          if (error) {
            console.error('Supabase logout error:', error)
            // Tetap lanjut clear local data meskipun gagal
          }
        }
        
        // 🔹 Clear semua data lokal (selalu dijalankan)
        this.user = null
        localStorage.removeItem('user')
        localStorage.removeItem('OB_USER')
        localStorage.removeItem('OB_KEY')
        
        console.log('✅ Logout successful - local data cleared')
        return true
        
      } catch (err) {
        console.error('Logout error:', err)
        
        // 🔹 Bahkan kalau error, tetap clear local data
        this.user = null
        localStorage.removeItem('user')
        localStorage.removeItem('OB_USER')
        localStorage.removeItem('OB_KEY')
        
        return true // Return true karena local data sudah clear
      }
    },

    // 🔹 Helper method untuk check session
    async checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session && this.user) {
          // Session expired tapi user masih ada di store
          console.warn('⚠️ Session expired, clearing user data')
          this.logout()
        }
        return !!session
      } catch (error) {
        console.error('Check session error:', error)
        return false
      }
    }
  },
})