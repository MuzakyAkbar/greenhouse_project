// /src/stores/material.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useMaterialStore = defineStore('material', () => {
  const materials = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase.from('gh_material').select('*')
      if (batch_id) {
        query = query.eq('batch_id', batch_id)
      }
      
      const { data, error: err } = await query.order('material_id', { ascending: true })
      
      if (err) {
        console.error('Error fetching materials:', err)
        error.value = err
        return { data: null, error: err }
      }
      
      materials.value = data || []
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error in fetchAll:', err)
      error.value = err
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material')
        .select('*')
        .eq('material_id', id)
        .single()
      
      return { data, error: err }
    } catch (err) {
      console.error('Error fetching material by ID:', err)
      return { data: null, error: err }
    }
  }

  async function create(payload) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material')
        .insert([payload])
        .select()
      
      if (!err && payload.batch_id) {
        await fetchAll(payload.batch_id)
      } else if (!err) {
        await fetchAll()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Error creating material:', err)
      return { data: null, error: err }
    }
  }

  async function update(id, payload) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material')
        .update(payload)
        .eq('material_id', id)
        .select()
      
      if (!err && payload.batch_id) {
        await fetchAll(payload.batch_id)
      } else if (!err) {
        await fetchAll()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Error updating material:', err)
      return { data: null, error: err }
    }
  }

  async function remove(id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_material')
        .delete()
        .eq('material_id', id)
      
      if (!err) {
        await fetchAll()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Error removing material:', err)
      return { data: null, error: err }
    }
  }

  return { 
    materials, 
    loading, 
    error, 
    fetchAll, 
    fetchById, 
    create, 
    update, 
    remove 
  }
})