// /src/stores/typeDamage.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useTypeDamageStore = defineStore('typeDamage', () => {
  const typeDamages = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    // ✅ FIXED: Hapus 'public.'
    const { data, error: err } = await supabase
      .from('gh_type_damage')
      .select('*')
      .order('typedamage_id', { ascending: true })

    if (err) error.value = err
    else typeDamages.value = data || []

    loading.value = false
    return { data, error: err }
  }

  async function fetchById(id) {
    const { data, error: err } = await supabase
      .from('gh_type_damage')
      .select('*')
      .eq('typedamage_id', id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    const { data, error: err } = await supabase
      .from('gh_type_damage')
      .insert([payload])
      .select()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function update(id, payload) {
    const { data, error: err } = await supabase
      .from('gh_type_damage')
      .update(payload)
      .eq('typedamage_id', id)
      .select()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function remove(id) {
    const { data, error: err } = await supabase
      .from('gh_type_damage')
      .delete()
      .eq('typedamage_id', id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { typeDamages, loading, error, fetchAll, fetchById, create, update, remove }
})