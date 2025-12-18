import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

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

      console.log('🔍 Fetching batches...')

      const { data, error } = await supabase
        .from('gh_batch')
        .select('*')
        .order('batch_id', { ascending: true })

      if (error) {
        console.error('❌ Gagal mengambil batch:', error.message)
        this.error = error.message
        this.loading = false
        return []
      }

      console.log('✅ Batches fetched:', data)
      this.batches = data || []
      this.loading = false
      return data
    },

    async addBatch(batch) {
      try {
        const { data, error } = await supabase
          .from('gh_batch')
          .insert([{
            batch_name: batch.batch_name,
            location_id: batch.location_id,
            phase_id: batch.phase_id || null,
            tanggal_mulai: batch.tanggal_mulai || null,
            tanggal_selesai: batch.tanggal_selesai || null
          }])
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
          .from('gh_batch')
          .update({
            batch_name: updatedData.batch_name,
            location_id: updatedData.location_id,
            phase_id: updatedData.phase_id || null,
            tanggal_mulai: updatedData.tanggal_mulai || null,
            tanggal_selesai: updatedData.tanggal_selesai || null
          })
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
          .from('gh_batch')
          .delete()
          .eq('batch_id', batchId)

        if (error) throw error

        this.batches = this.batches.filter(b => b.batch_id !== batchId)
        return { success: true }
      } catch (error) {
        console.error('❌ Gagal menghapus batch:', error.message)
        return { success: false, error }
      }
    },

    // ==================================================
// 🔥 BAHAN BAKU DIGUNAKAN REAL PER BATCH
// ==================================================
async fetchMaterialUsedByBatch(batch_id) {
  // 1. ambil report milik batch
  const { data: reports, error: reportError } = await supabase
    .from('gh_report')
    .select('report_id')
    .eq('batch_id', batch_id)

  if (reportError) throw reportError
  if (!reports || !reports.length) return []

  const reportIds = reports.map(r => r.report_id)

  // 2. ambil activity_id dari gh_activity
  const { data: activities, error: actError } = await supabase
    .from('gh_activity')
    .select('activity_id')
    .in('report_id', reportIds)

  if (actError) throw actError
  if (!activities.length) return []

  const activityIds = activities.map(a => a.activity_id)

  // 3. ambil material yang digunakan
  const { data: materials, error: matError } = await supabase
    .from('gh_material_used')
    .select(`
      material_used_id,
      material_name,
      qty,
      uom,
      unit_price,
      total_price,
      status,
      activity_id
    `)
    .in('activity_id', activityIds)

  if (matError) throw matError

  return materials
},
  // ==================================================
// 🔥 LAPORAN AKTIVITAS + MATERIAL (REAL) PER BATCH
// ==================================================
  async fetchBatchActivityDetail(batch_id) {
    // 1. ambil semua report dalam batch
    const { data: reports, error: reportError } = await supabase
      .from('gh_report')
      .select('report_id, report_date')
      .eq('batch_id', batch_id)
      .order('report_date', { ascending: true })

    if (reportError) throw reportError
    if (!reports || !reports.length) return []

    const results = []

    // 2. LOOP seperti ReportActivityView
    for (const report of reports) {
      // ambil aktivitas
      const { data: activities, error: actError } = await supabase
        .from('gh_activity')
        .select(`
          activity_id,
          activity_name,
          manpower,
          notes
        `)
        .eq('report_id', report.report_id)

      if (actError) throw actError

      for (const act of activities) {
        // ambil material (INI SAMA PERSIS DENGAN ReportActivityView)
        const { data: materials, error: matError } = await supabase
          .from('gh_material_used')
          .select(`
            material_name,
            qty,
            uom,
            unit_price,
            total_price,
            status
          `)
          .eq('activity_id', act.activity_id)

        if (matError) throw matError

        results.push({
          report_id: report.report_id,
          report_date: report.report_date,
          activity_id: act.activity_id,
          activity_name: act.activity_name,
          manpower: act.manpower,
          notes: act.notes,
          materials
        })
      }
    }

    return results
  },

    // ==================================================
// 🔥 LAPORAN AKTIVITAS REAL PER BATCH
// ==================================================
async fetchActivitiesByBatch(batch_id) {
  // 1. ambil report milik batch
  const { data: reports, error: reportError } = await supabase
    .from('gh_report')
    .select('report_id, report_date')
    .eq('batch_id', batch_id)
    .order('report_date', { ascending: true })

  if (reportError) throw reportError
  if (!reports || !reports.length) return []

  const reportIds = reports.map(r => r.report_id)

  // 2. ambil aktivitas REAL
  const { data: activities, error: actError } = await supabase
    .from('gh_activity')
    .select(`
      activity_id,
      activity_name,
      notes,
      manpower,
      report_id
    `)
    .in('report_id', reportIds)

  if (actError) throw actError

  // 3. tempelkan tanggal report
  return activities.map(act => ({
    ...act,
    report_date: reports.find(r => r.report_id === act.report_id)?.report_date
  }))
}

  }
})
