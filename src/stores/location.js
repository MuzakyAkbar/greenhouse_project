
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
    
    console.log('🔍 Fetching locations...')
    
    const { data, error: err } = await supabase
<<<<<<< HEAD
      .from('gh_location') // ✅ Nama tabel benar
=======
      .from('gh_location') 
>>>>>>> 8175f7ff635de1c79113717bf65c6b1c8a4a7f39
      .select('*')
      .order('location_id', { ascending: true })

    if (err) {
      console.error('❌ Gagal fetch locations:', err)
      error.value = err
    } else {
      console.log('✅ Locations fetched:', data)
      locations.value = data || []
    }

    loading.value = false
    return { data, error: err }
  }

  async function fetchById(id) {
    const { data, error: err } = await supabase
      .from('gh_location')
      .select('*')
      .eq('location_id', id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    // ✅ Mapping: location_name -> location
    const dbPayload = {
      location: payload.location_name || payload.location,
      id_openbravo: payload.id_openbravo || null
    }
    
    const { data, error: err } = await supabase
      .from('gh_location')
      .insert([dbPayload])
      .select()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function update(id, payload) {
    // ✅ Mapping: location_name -> location
    const dbPayload = {
      location: payload.location_name || payload.location,
      id_openbravo: payload.id_openbravo || null
    }
    
    const { data, error: err } = await supabase
      .from('gh_location')
      .update(dbPayload)
      .eq('location_id', id)
      .select()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function remove(id) {
    const { data, error: err } = await supabase
      .from('gh_location')
      .delete()
      .eq('location_id', id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { locations, loading, error, fetchAll, fetchById, create, update, remove }
})
