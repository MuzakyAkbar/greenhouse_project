// /src/stores/typeDamage.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useTypeDamageStore = defineStore('typeDamage', () => {
  const typeDamages = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch all type damages
   * Optionally filter by report_id
   */
  async function fetchAll(report_id = null) {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase
        .from('gh_type_damage')
        .select(`
          *,
          gh_report(
            report_date,
            location_id,
            batch_id
          )
        `)
        .order('typedamage_id', { ascending: true })
      
      if (report_id) {
        query = query.eq('report_id', report_id)
      }
      
      const { data, error: err } = await query
      
      if (err) {
        console.error('Error fetching type damages:', err)
        error.value = err
      } else {
        typeDamages.value = data || []
        console.log(`✅ Fetched ${data?.length || 0} type damages`)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception fetching type damages:', err)
      error.value = err
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch single type damage by ID
   */
  async function fetchById(typedamage_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_type_damage')
        .select(`
          *,
          gh_report(
            report_date,
            location_id,
            batch_id
          )
        `)
        .eq('typedamage_id', typedamage_id)
        .single()
      
      if (err) {
        console.error('Error fetching type damage by ID:', err)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception fetching type damage by ID:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Fetch type damages by report
   */
  async function fetchByReport(report_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_type_damage')
        .select('*')
        .eq('report_id', report_id)
        .order('typedamage_id', { ascending: true })
      
      return { data, error: err }
    } catch (err) {
      console.error('Error fetching type damages by report:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Create new type damage entry
   */
  async function create(payload) {
    try {
      // Validate required fields
      if (!payload.report_id) {
        throw new Error('report_id is required')
      }
      
      // Validate at least one damage quantity > 0
      const hasValidDamage = (payload.kuning && payload.kuning > 0) || 
                             (payload.kutilang && payload.kutilang > 0) || 
                             (payload.busuk && payload.busuk > 0);
      
      if (!hasValidDamage) {
        throw new Error('At least one damage type must have quantity > 0')
      }
      
      const { data, error: err } = await supabase
        .from('gh_type_damage')
        .insert([payload])
        .select()
      
      if (err) {
        console.error('Error creating type damage:', err)
      } else {
        console.log('✅ Type damage created successfully')
        await fetchAll(payload.report_id)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception creating type damage:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Update type damage entry
   */
  async function update(typedamage_id, payload) {
    try {
      const { data, error: err } = await supabase
        .from('gh_type_damage')
        .update(payload)
        .eq('typedamage_id', typedamage_id)
        .select()
      
      if (err) {
        console.error('Error updating type damage:', err)
      } else {
        console.log('✅ Type damage updated successfully')
        if (payload.report_id) {
          await fetchAll(payload.report_id)
        } else {
          await fetchAll()
        }
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception updating type damage:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Delete type damage entry
   */
  async function remove(typedamage_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_type_damage')
        .delete()
        .eq('typedamage_id', typedamage_id)
      
      if (err) {
        console.error('Error deleting type damage:', err)
      } else {
        console.log('✅ Type damage deleted successfully')
        await fetchAll()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception deleting type damage:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Batch create multiple type damages for a report
   */
  async function createBatch(damages) {
    try {
      if (!Array.isArray(damages) || damages.length === 0) {
        throw new Error('damages must be a non-empty array')
      }
      
      const { data, error: err } = await supabase
        .from('gh_type_damage')
        .insert(damages)
        .select()
      
      if (err) {
        console.error('Error batch creating type damages:', err)
      } else {
        console.log(`✅ ${data.length} type damages created successfully`)
        // Refresh for the first report_id
        if (damages[0]?.report_id) {
          await fetchAll(damages[0].report_id)
        }
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception batch creating type damages:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Get damage summary for a report
   */
  async function getDamageSummary(report_id) {
    try {
      const { data, error: err } = await fetchByReport(report_id)
      
      if (err) throw err
      
      const summary = {
        totalKuning: 0,
        totalKutilang: 0,
        totalBusuk: 0,
        totalQty: 0
      }
      
      data?.forEach(damage => {
        if (damage.kuning) summary.totalKuning += 1
        if (damage.kutilang) summary.totalKutilang += 1
        if (damage.busuk) summary.totalBusuk += 1
        summary.totalQty += (damage.qty || 0)
      })
      
      return { data: summary, error: null }
    } catch (err) {
      console.error('Error getting damage summary:', err)
      return { data: null, error: err }
    }
  }

  return { 
    typeDamages, 
    loading, 
    error, 
    fetchAll, 
    fetchById,
    fetchByReport,
    create, 
    update, 
    remove,
    createBatch,
    getDamageSummary
  }
})