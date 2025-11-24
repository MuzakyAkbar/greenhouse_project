import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";

export const usePhaseStore = defineStore("phase", {
  state: () => ({
    phases: [],            // semua master data phase
    phasesByBatch: {},     // daftar phase per batch_id
    loading: false,
    error: null,
  }),

  actions: {
    //----------------------------------------------------
    // 1) FETCH MASTER PHASE
    //----------------------------------------------------
    async fetchPhases() {
      this.loading = true;
      this.error = null;

      const { data, error } = await supabase
        .from("gh_phase")
        .select("phase_id, phase_name")
        .order("phase_id", { ascending: true });

      this.loading = false;

      if (error) {
        console.error("❌ Error fetchPhases:", error);
        this.error = error.message;
        return;
      }

      this.phases = data || [];
    },

    //----------------------------------------------------
    // 2) GET PHASE NAME (untuk kebutuhan UI)
    //----------------------------------------------------
    getPhaseName(phaseId) {
      if (!phaseId) return "-";
      const found = this.phases.find((p) => p.phase_id === phaseId);
      return found ? found.phase_name : "-";
    },

    //----------------------------------------------------
    // 3) ADD PHASE BARU
    //----------------------------------------------------
    async addPhase(payload) {
      const { data, error } = await supabase
        .from("gh_phase")
        .insert([
          {
            phase_name: payload.phase_name,
            created_at: new Date().toISOString(),
            update_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error("❌ Error addPhase:", error);
        return { error };
      }

      if (data && data.length > 0) {
        this.phases.push(data[0]);
      }

      return { data };
    },

    //----------------------------------------------------
    // 4) UPDATE PHASE
    //----------------------------------------------------
    async updatePhase(id, payload) {
      const { data, error } = await supabase
        .from("gh_phase")
        .update({
          phase_name: payload.phase_name,
          update_at: new Date().toISOString(),
        })
        .eq("phase_id", id)
        .select();

      if (error) {
        console.error("❌ Error updatePhase:", error);
        return { error };
      }

      const index = this.phases.findIndex((p) => p.phase_id === id);
      if (index !== -1 && data && data.length > 0) {
        this.phases[index] = data[0];
      }

      return { data };
    },

    //----------------------------------------------------
    // 5) DELETE PHASE
    //----------------------------------------------------
    async deletePhase(id) {
      const { error } = await supabase
        .from("gh_phase")
        .delete()
        .eq("phase_id", id);

      if (error) {
        console.error("❌ Error deletePhase:", error);
        return { error };
      }

      this.phases = this.phases.filter((p) => p.phase_id !== id);

      return { success: true };
    },

    //----------------------------------------------------
    // 6) FETCH PHASES BY BATCH (JOIN ke gh_batch_phase)
    //----------------------------------------------------
    async getPhasesForBatch(batchId) {
      if (!batchId) return [];

      // kalau sudah ada di cache → jangan ambil ulang
      if (this.phasesByBatch[batchId]) {
        return this.phasesByBatch[batchId];
      }

      const { data, error } = await supabase
        .from("gh_batch_phase")
        .select(`
          batchphase_id,
          phase_id,
          gh_phase (
            phase_id,
            phase_name
          )
        `)
        .eq("batch_id", batchId);

      if (error) {
        console.error("❌ Error getPhasesForBatch:", error);
        return [];
      }

      // hasil JOIN = row.gh_phase
      const result = data.map((row) => row.gh_phase);

      // simpan ke cache agar cepat
      this.phasesByBatch[batchId] = result;

      return result;
    },
  },
});
