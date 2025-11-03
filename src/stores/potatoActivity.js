// /src/stores/potatoActivity.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from "../lib/supabase";

export const usePotatoActivityStore = defineStore('potatoActivity', () => {
  const activities = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true; error.value = null
    let q = supabase.from('greenhouse.potato_activity').select('*')
    if (batch_id) q = q.eq('batch_id', batch_id)
    const { data, err } = await q.order('activity_id', { ascending: true })
    if (err) error.value = err; else activities.value = data
    loading.value = false
    return { data, err }
  }

  async function fetchById(id) {
    const { data, err } = await supabase
      .from('greenhouse.potato_activity')
      .select('*')
      .eq('activity_id', id)
      .single()
    return { data, err }
  }

  async function create(payload) {
    const { data, err } = await supabase
      .from('greenhouse.potato_activity')
      .insert([payload])
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, err }
  }

  async function update(id, payload) {
    const { data, err } = await supabase
      .from('greenhouse.potato_activity')
      .update(payload)
      .eq('activity_id', id)
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, err }
  }

  async function remove(id) {
    const { data, err } = await supabase
      .from('greenhouse.potato_activity')
      .delete()
      .eq('activity_id', id)
    if (!err) await fetchAll()
    return { data, err }
  }

  return { activities, loading, error, fetchAll, fetchById, create, update, remove }
})
