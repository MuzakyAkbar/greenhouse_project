// /src/stores/location.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useLocationStore = defineStore('location', () => {
  const locations = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('public.gh_location')
      .select('*')
      .order('location_id', { ascending: true })

    if (err) error.value = err
    else locations.value = data || []

    loading.value = false
    return { data, error: err }
  }

  async function fetchById(id) {
    const { data, error: err } = await supabase
      .from('public.gh_location')
      .select('*')
      .eq('location_id', id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    const { data, error: err } = await supabase
      .from('public.gh_location')
      .insert([payload])
      .select()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function update(id, payload) {
    const { data, error: err } = await supabase
      .from('public.gh_location')
      .update(payload)
      .eq('location_id', id)
      .select()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function remove(id) {
    const { data, error: err } = await supabase
      .from('public.gh_location')
      .delete()
      .eq('location_id', id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { locations, loading, error, fetchAll, fetchById, create, update, remove }
})