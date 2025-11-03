// /src/stores/warehouse.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from "../lib/supabase";

export const useWarehouseStore = defineStore('warehouse', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(location_id = null) {
    loading.value = true; error.value = null
    let q = supabase.from('greenhouse.main_warehouse').select('*')
    if (location_id) q = q.eq('location_id', location_id)
    const { data, err } = await q.order('warehouse_id', { ascending: true })
    if (err) error.value = err; else items.value = data
    loading.value = false
    return { data, err }
  }

  async function create(payload) {
    const { data, err } = await supabase.from('greenhouse.main_warehouse').insert([payload]).select()
    if (!err) await fetchAll(payload.location_id)
    return { data, err }
  }

  async function update(id, payload) {
    const { data, err } = await supabase.from('greenhouse.main_warehouse').update(payload).eq('warehouse_id', id).select()
    if (!err) await fetchAll(payload.location_id)
    return { data, err }
  }

  async function remove(id) {
    const { data, err } = await supabase.from('greenhouse.main_warehouse').delete().eq('warehouse_id', id)
    if (!err) await fetchAll()
    return { data, err }
  }

  return { items, loading, error, fetchAll, create, update, remove }
})
