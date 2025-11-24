// src/stores/batchPhase.js
import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";

export const useBatchPhaseStore = defineStore("batchPhase", {
  state: () => ({
    batchPhases: [],  // semua mapping batch-phase
    phasesByBatch: {}, // grouped dictionary {batch_id : [phase_objects]}
    loading: false,
    error: null,
  }),

  actions: {
    // Ambil semua phase berdasarkan batch_id
    async fetchPhasesForBatch(batch_id) {
      this.loading = true;

      const { data, error } = await supabase
        .from("gh_batch_phase")
        .select(`
          batchphase_id,
          batch_id,
          gh_phase (
            phase_id,
            phase_name
          )
        `)
        .eq("batch_id", batch_id);

      this.loading = false;

      if (error) {
        console.error("Error fetchPhasesForBatch:", error);
        this.error = error.message;
        return [];
      }

      // Simpan hasilnya
      this.phasesByBatch[batch_id] = data.map(d => d.gh_phase);
      return this.phasesByBatch[batch_id];
    }
  }
});
