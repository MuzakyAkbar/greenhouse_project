// /src/stores/activity.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useMaterialStore } from './material'

export const useActivityStore = defineStore('activity', () => {
  const activities = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch all activities
   * Optionally filter by report_id
   */
  async function fetchAll(report_id = null) {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase
        .from('gh_activity')
        .select(`
          *,
          gh_report(
            report_date,
            location_id,
            batch_id
          ),
          gh_material_used(*)
        `)
        .order('activity_id', { ascending: true })
      
      if (report_id) {
        query = query.eq('report_id', report_id)
      }
      
      const { data, error: err } = await query
      
      if (err) {
        console.error('Error fetching activities:', err)
        error.value = err
      } else {
        activities.value = data || []
        console.log(`✅ Fetched ${data?.length || 0} activities`)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception fetching activities:', err)
      error.value = err
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch single activity by ID
   */
  async function fetchById(activity_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_activity')
        .select(`
          *,
          gh_report(
            report_date,
            location_id,
            batch_id
          ),
          gh_material_used(*)
        `)
        .eq('activity_id', activity_id)
        .single()
      
      if (err) {
        console.error('Error fetching activity by ID:', err)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception fetching activity by ID:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Fetch activities by report
   */
  async function fetchByReport(report_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_activity')
        .select(`
          *,
          gh_material_used(*)
        `)
        .eq('report_id', report_id)
        .order('activity_id', { ascending: true })
      
      return { data, error: err }
    } catch (err) {
      console.error('Error fetching activities by report:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Create new activity with materials
   * @param {Object} payload - Activity data
   * @param {Array} materials - Array of material usage records
   */
  async function create(payload, materials = []) {
    try {
      // Validate required fields
      if (!payload.report_id) {
        throw new Error('report_id is required')
      }
      if (!payload.act_name) {
        throw new Error('act_name is required')
      }
      
      // 1. Create activity
      const { data: activityData, error: activityErr } = await supabase
        .from('gh_activity')
        .insert([payload])
        .select()
        .single()
      
      if (activityErr) {
        console.error('Error creating activity:', activityErr)
        throw activityErr
      }
      
      console.log('✅ Activity created:', activityData)
      
      // 2. Create material used records if provided
      if (materials.length > 0) {
        const materialStore = useMaterialStore()
        
        for (const material of materials) {
          await materialStore.createUsed({
            ...material,
            activity_id: activityData.activity_id
          })
        }
        
        console.log(`✅ ${materials.length} material records created`)
      }
      
      await fetchAll(payload.report_id)
      return { data: activityData, error: null }
    } catch (err) {
      console.error('Exception creating activity:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Update activity
   * Note: Material updates should be handled separately via material store
   */
  async function update(activity_id, payload) {
    try {
      const { data, error: err } = await supabase
        .from('gh_activity')
        .update(payload)
        .eq('activity_id', activity_id)
        .select()
      
      if (err) {
        console.error('Error updating activity:', err)
      } else {
        console.log('✅ Activity updated successfully')
        if (payload.report_id) {
          await fetchAll(payload.report_id)
        } else {
          await fetchAll()
        }
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception updating activity:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Delete activity (cascade will delete related materials)
   */
  async function remove(activity_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_activity')
        .delete()
        .eq('activity_id', activity_id)
      
      if (err) {
        console.error('Error deleting activity:', err)
      } else {
        console.log('✅ Activity deleted successfully')
        await fetchAll()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception deleting activity:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Batch create multiple activities for a report
   */
  async function createBatch(activitiesWithMaterials) {
    try {
      if (!Array.isArray(activitiesWithMaterials) || activitiesWithMaterials.length === 0) {
        throw new Error('activitiesWithMaterials must be a non-empty array')
      }
      
      const createdActivities = []
      
      for (const item of activitiesWithMaterials) {
        const { activity, materials = [] } = item
        const result = await create(activity, materials)
        
        if (result.error) {
          throw result.error
        }
        
        createdActivities.push(result.data)
      }
      
      console.log(`✅ ${createdActivities.length} activities created successfully`)
      
      // Refresh for the first report_id
      if (activitiesWithMaterials[0]?.activity?.report_id) {
        await fetchAll(activitiesWithMaterials[0].activity.report_id)
      }
      
      return { data: createdActivities, error: null }
    } catch (err) {
      console.error('Exception batch creating activities:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Get activity summary for a report
   */
  async function getActivitySummary(report_id) {
    try {
      const { data, error: err } = await fetchByReport(report_id)
      
      if (err) throw err
      
      const summary = {
        totalActivities: data?.length || 0,
        totalCoA: 0,
        totalMaterials: 0,
        activities: []
      }
      
      data?.forEach(activity => {
        summary.totalCoA += (parseFloat(activity.CoA) || 0)
        summary.totalMaterials += (activity.gh_material_used?.length || 0)
        
        summary.activities.push({
          name: activity.act_name,
          coa: activity.CoA,
          manpower: activity.manpower,
          materialsCount: activity.gh_material_used?.length || 0
        })
      })
      
      return { data: summary, error: null }
    } catch (err) {
      console.error('Error getting activity summary:', err)
      return { data: null, error: err }
    }
  }

  return { 
    activities, 
    loading, 
    error, 
    fetchAll, 
    fetchById,
    fetchByReport,
    create, 
    update, 
    remove,
    createBatch,
    getActivitySummary
  }
})