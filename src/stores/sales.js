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
    let q = supabase.from('public.gh_sales').select('*')
    if (batch_id) q = q.eq('batch_id', batch_id)
    const { data, error: err } = await q.order('sales_id', { ascending: false })
    if (err) error.value = err
    else sales.value = data || []
    loading.value = false
    return { data, error: err }
  }

  async function fetchById(id) {
    const { data, error: err } = await supabase
      .from('public.gh_sales')
      .select('*')
      .eq('sales_id', id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    const { data, error: err } = await supabase
      .from('public.gh_sales')
      .insert([payload])
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function update(id, payload) {
    const { data, error: err } = await supabase
      .from('public.gh_sales')
      .update(payload)
      .eq('sales_id', id)
      .select()
    if (!err) await fetchAll(payload.batch_id)
    return { data, error: err }
  }

  async function remove(id) {
    const { data, error: err } = await supabase
      .from('public.gh_sales')
      .delete()
      .eq('sales_id', id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { sales, loading, error, fetchAll, fetchById, create, update, remove }
})

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
    const { data, error: err } = await supabase
      .from('public.gh_type_damage')
      .select('*')
      .order('typedamage_id', { ascending: true })

    if (err) error.value = err
    else typeDamages.value = data || []

    loading.value = false
    return { data, error: err }
  }

  async function fetchById(id) {
    const { data, error: err } = await supabase
      .from('public.gh_type_damage')
      .select('*')
      .eq('typedamage_id', id)
      .single()
    return { data, error: err }
  }

  async function create(payload) {
    const { data, error: err } = await supabase
      .from('public.gh_type_damage')
      .insert([payload])
      .select()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function update(id, payload) {
    const { data, error: err } = await supabase
      .from('public.gh_type_damage')
      .update(payload)
      .eq('typedamage_id', id)
      .select()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function remove(id) {
    const { data, error: err } = await supabase
      .from('public.gh_type_damage')
      .delete()
      .eq('typedamage_id', id)
    if (!err) await fetchAll()
    return { data, error: err }
  }

  return { typeDamages, loading, error, fetchAll, fetchById, create, update, remove }
})