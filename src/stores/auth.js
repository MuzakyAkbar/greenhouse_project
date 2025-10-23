// src/stores/useAuthStore.js
import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null,
    error: null,
    loading: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.user, // true kalau ada user
    role: (state) => state.user?.role || null, // ambil role dari user
  },
  actions: {
    async login(email, password) {
      this.loading = true;
      this.error = null;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          this.error = error.message;
          return false;
        }

        const { data: profile, error: profileError } = await supabase
          .from("user")
          .select("user_id, email, role, organization") // 🔹 Tambahkan organization
          .eq("user_id", data.user.id)
          .single();

        if (profileError) {
          this.error = profileError.message;
          return false;
        }

        this.user = { ...profile };
        localStorage.setItem("user", JSON.stringify(this.user));

        return true;
      } catch (err) {
        this.error = "Terjadi kesalahan server";
        console.error(err);
        return false;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      await supabase.auth.signOut();
      this.user = null;
      localStorage.removeItem("user");
    },
  },
});