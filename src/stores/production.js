// /src/stores/production.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from "../lib/supabase"

export const useProductionStore = defineStore('production', () => {
  const productions = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true
    error.value = null
    let q = supabase.from('public.gh_production').select('*')
    if (batch_id) q = q.eq('batch_id', batch_id)
    const { data, error: err } = await q.order('production_id', { ascending: false })
    if (err) error.value = err
    else productions.value = data || []
    loading.value = false
    return { data, error: err }
  }

  async function fetchById(id) {
    const { data, error: err } = await supabase
      .from('public.gh_production')
      .select('*')
      .eq('production_id', id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    const { data, error: err } = await supabase
      .from('public.gh_production')
      .insert([payload])
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function update(id, payload) {
    const { data, error: err } = await supabase
      .from('public.gh_production')
      .update(payload)
      .eq('production_id', id)
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function remove(id) {
    const { data, error: err } = await supabase
      .from('public.gh_production')
      .delete()
      .eq('production_id', id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { productions, loading, error, fetchAll, fetchById, create, update, remove }
})