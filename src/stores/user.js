import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";

export const useUserStore = defineStore("user", {
  state: () => ({
    users: [], // 👈 ganti ke plural
    loading: false,
    error: "",
  }),
  actions: {
    async fetchUsers() {
      this.loading = true;
      this.error = "";
      try {
        const { data, error } = await supabase
          .from("user")
          .select("*");
        if (error) throw error;
        this.users = data || [];
      } catch (err) {
        this.error = err.message || "Gagal memuat data pengguna";
        console.error("Fetch users error:", err);
      } finally {
        this.loading = false;
      }
    },

    async createUser(userData) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              username: userData.username,
              role: userData.role,
              organization: userData.organization
            }
          }
        })
        
        if (error) {
          console.error('Signup error:', error)
          throw error
        }
        
        console.log('User created successfully:', data)
        
        // User langsung bisa login, tidak perlu konfirmasi email
        return { 
          data, 
          error: null,
          message: 'User berhasil dibuat dan langsung aktif'
        }
        
      } catch (error) {
        console.error('Error creating user:', error)
        return { 
          data: null, 
          error: error.message || 'Gagal membuat user'
        }
      }
    },

    async updateUser(user) {
      this.error = "";
      try {
        const { data, error } = await supabase
          .from("user")
          .update({
            username: user.username,
            organization: user.organization,
            email: user.email,
            role: user.role,
          })
          .eq("user_id", user.user_id) 
          .select()
          .single();
        if (error) throw error;
        this.fetchUsers();

        // update di state
        const idx = this.users.findIndex((u) => u.id === user.id);
        if (idx !== -1) this.users[idx] = data;
        return data;
      } catch (e) {
        this.error = e.message;
        throw e;
      }
    },

    async deleteUser(id) {
      this.error = "";
      try {
        const { error } = await supabase
          .from("user")
          .delete()
          .eq("user_id", id);
        if (error) throw error;

        this.users = this.users.filter((u) => u.user_id !== id);
      } catch (e) {
        this.error = e.message;
        throw e;
      }
    },
  },
});