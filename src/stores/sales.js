// /src/stores/sales.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useSalesStore = defineStore('sales', () => {
  const sales = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true; error.value = null
    let q = supabase.from('greenhouse.sales').select('*')
    if (batch_id) q = q.eq('batch_id', batch_id)
    const { data, err } = await q.order('sales_id', { ascending: false })
    if (err) error.value = err; else sales.value = data
    loading.value = false
    return { data, err }
  }

  async function fetchById(id) {
    const { data, err } = await supabase.from('greenhouse.sales').select('*').eq('sales_id', id).single()
    return { data, err }
  }

  async function create(payload) {
    const { data, err } = await supabase.from('greenhouse.sales').insert([payload]).select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, err }
  }

  async function update(id, payload) {
    const { data, err } = await supabase.from('greenhouse.sales').update(payload).eq('sales_id', id).select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, err }
  }

  async function remove(id) {
    const { data, err } = await supabase.from('greenhouse.sales').delete().eq('sales_id', id)
    if (!err) await fetchAll()
    return { data, err }
  }

  return { sales, loading, error, fetchAll, fetchById, create, update, remove }
})
