import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from "../lib/supabase"

export const usePotatoActivityStore = defineStore('potatoActivity', () => {
  const activities = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true
    error.value = null
<<<<<<< HEAD

    let query = supabase.from('gh_potato_activity').select('*')
    if (batch_id) query = query.eq('batch_id', batch_id)

    const { data, error: err } = await query.order('activity_id', { ascending: true })

=======
    // ✅ FIXED: Hapus 'public.'
    let q = supabase.from('gh_potato_activity').select('*')
    if (batch_id) q = q.eq('batch_id', batch_id)
    const { data, error: err } = await q.order('activity_id', { ascending: true })
>>>>>>> 8175f7ff635de1c79113717bf65c6b1c8a4a7f39
    if (err) error.value = err
    else activities.value = data || []

    loading.value = false
    return { data, error: err }
  }

  async function fetchById(id) {
    const { data, error: err } = await supabase
      .from('gh_potato_activity')
      .select('*')
      .eq('activity_id', id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    const { data, error: err } = await supabase
      .from('gh_potato_activity')
      .insert([payload])
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function update(id, payload) {
    const { data, error: err } = await supabase
      .from('gh_potato_activity')
      .update(payload)
      .eq('activity_id', id)
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function remove(id) {
    const { data, error: err } = await supabase
      .from('gh_potato_activity')
      .delete()
      .eq('activity_id', id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { activities, loading, error, fetchAll, fetchById, create, update, remove }
})
