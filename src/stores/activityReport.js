// /src/stores/activityReport.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export const useActivityReportStore = defineStore('activityReport', () => {
  const reports = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true
    error.value = null
    let q = supabase.from('public.gh_activity_report').select('*')
    if (batch_id) q = q.eq('batch_id', batch_id)
    const { data, error: err } = await q.order('report_id', { ascending: false })
    if (err) error.value = err
    else reports.value = data || []
    loading.value = false
    return { data, error: err }
  }

  async function fetchById(report_id) {
    const { data, error: err } = await supabase
      .from('public.gh_activity_report')
      .select('*')
      .eq('report_id', report_id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    const { data, error: err } = await supabase
      .from('public.gh_activity_report')
      .insert([payload])
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function update(report_id, payload) {
    const { data, error: err } = await supabase
      .from('public.gh_activity_report')
      .update(payload)
      .eq('report_id', report_id)
      .select()
    if (!err) await fetchAll(payload.batch_id || null)
    return { data, error: err }
  }

  async function remove(report_id) {
    const { data, error: err } = await supabase
      .from('public.gh_activity_report')
      .delete()
      .eq('report_id', report_id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { reports, loading, error, fetchAll, fetchById, create, update, remove }
})