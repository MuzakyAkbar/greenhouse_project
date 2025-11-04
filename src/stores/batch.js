//src/stores/batch.js
import { defineStore } from 'pinia'
import { supabase } from "../lib/supabase"

export const useBatchStore = defineStore('batch', {
  state: () => ({
    batches: [],
    loading: false,
    error: null
  }),

  actions: {
    async getBatches() {
      this.loading = true
      this.error = null
      const { data, error } = await supabase
        .from('public.gh_batch')
        .select('*')
        .order('batch_id', { ascending: true })

      if (error) {
        console.error('❌ Gagal mengambil batch:', error.message)
        this.error = error.message
        this.loading = false
        return []
      }

      this.batches = data || []
      this.loading = false
      return data
    },

    async addBatch(batch) {
      try {
        const { data, error } = await supabase
          .from('public.gh_batch')
          .insert([batch])
          .select()

        if (error) throw error
        if (data && data.length > 0) {
          this.batches.push(data[0])
        }

        return { success: true, data }
      } catch (error) {
        console.error('❌ Gagal menambah batch:', error.message)
        return { success: false, error }
      }
    },

    async updateBatch(batchId, updatedData) {
      try {
        const { error } = await supabase
          .from('public.gh_batch')
          .update(updatedData)
          .eq('batch_id', batchId)

        if (error) throw error

        const index = this.batches.findIndex(b => b.batch_id === batchId)
        if (index !== -1) {
          this.batches[index] = { ...this.batches[index], ...updatedData }
        }

        return { success: true }
      } catch (error) {
        console.error('❌ Gagal mengedit batch:', error.message)
        return { success: false, error }
      }
    },

    async deleteBatch(batchId) {
      try {
        const { error } = await supabase
          .from('public.gh_batch')
          .delete()
          .eq('batch_id', batchId)

        if (error) throw error

        this.batches = this.batches.filter(b => b.batch_id !== batchId)
        return { success: true }
      } catch (error) {
        console.error('❌ Gagal menghapus batch:', error.message)
        return { success: false, error }
      }
    }
  }
})