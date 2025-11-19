// /src/stores/sales.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useSalesStore = defineStore('sales', () => {
  const sales = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true
    error.value = null
    // ✅ FIXED: Hapus 'public.'
    let q = supabase.from('gh_sales').select('*')
    if (batch_id) q = q.eq('batch_id', batch_id)
    const { data, error: err } = await q.order('sales_id', { ascending: false })
    if (err) error.value = err
    else sales.value = data || []
    loading.value = false
    return { data, error: err }
  }

  async function fetchById(id) {
    const { data, error: err } = await supabase
      .from('gh_sales')
      .select('*')
      .eq('sales_id', id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    const { data, error: err } = await supabase
      .from('gh_sales')
      .insert([payload])
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function update(id, payload) {
    const { data, error: err } = await supabase
      .from('gh_sales')
      .update(payload)
      .eq('sales_id', id)
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function remove(id) {
    const { data, error: err } = await supabase
      .from('gh_sales')
      .delete()
      .eq('sales_id', id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { sales, loading, error, fetchAll, fetchById, create, update, remove }
})