// /src/stores/material.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from "../lib/supabase";

export const useMaterialStore = defineStore('material', () => {
  const materials = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true; error.value = null
    let query = supabase.from('greenhouse.material').select('*')
    if (batch_id) query = query.eq('batch_id', batch_id)
    const { data, err } = await query.order('material_id', { ascending: true })
    if (err) error.value = err; else materials.value = data
    loading.value = false
    return { data, err }
  }

  async function fetchById(id) {
    const { data, err } = await supabase
      .from('greenhouse.material')
      .select('*')
      .eq('material_id', id)
      .single()
    return { data, err }
  }

  async function create(payload) {
    const { data, err } = await supabase
      .from('greenhouse.material')
      .insert([payload])
      .select()
    if (!err) await fetchAll()
    return { data, err }
  }

  async function update(id, payload) {
    const { data, err } = await supabase
      .from('greenhouse.material')
      .update(payload)
      .eq('material_id', id)
      .select()
    if (!err) await fetchAll()
    return { data, err }
  }

  async function remove(id) {
    const { data, err } = await supabase
      .from('greenhouse.material')
      .delete()
      .eq('material_id', id)
    if (!err) await fetchAll()
    return { data, err }
  }

  return { materials, loading, error, fetchAll, fetchById, create, update, remove }
})
