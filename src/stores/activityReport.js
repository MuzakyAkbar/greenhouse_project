// /src/stores/activityReport.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useActivityReportStore = defineStore('activityReport', () => {
  const reports = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll(batch_id = null) {
    loading.value = true
    error.value = null
    
    try {
      let q = supabase
        .from('gh_activity_report')
        .select('*')
        .order('report_id', { ascending: false })
      
      if (batch_id) q = q.eq('batch_id', batch_id)
      
      const { data, error: err } = await q
      
      if (err) {
        console.error('Error fetching activity reports:', err)
        error.value = err
      } else {
        reports.value = data || []
        console.log(`Fetched ${data?.length || 0} reports`) // Debug
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception fetching activity reports:', err)
      error.value = err
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  async function fetchById(report_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_activity_report')
        .select('*')
        .eq('report_id', report_id)
        .single()
      
      if (err) {
        console.error('Error fetching report by ID:', err)
      } else {
        console.log('Fetched report:', data) // Debug
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception fetching report by ID:', err)
      return { data: null, error: err }
    }
  }

  async function create(payload) {
    try {
      // Ensure report_status is set to onReview for new reports
      const newPayload = {
        ...payload,
        report_status: 'onReview'
      }
      
      const { data, error: err } = await supabase
        .from('gh_activity_report')
        .insert([newPayload])
        .select()
      
      if (err) {
        console.error('Error creating report:', err)
      } else {
        console.log('Report created successfully:', data)
        // Refresh list after creation
        await fetchAll(payload.batch_id)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception creating report:', err)
      return { data: null, error: err }
    }
  }

  async function update(report_id, payload) {
    try {
      console.log(`Updating report #${report_id} with:`, payload) // Debug
      
      const { data, error: err } = await supabase
        .from('gh_activity_report')
        .update(payload)
        .eq('report_id', report_id)
        .select()
      
      if (err) {
        console.error('Error updating report:', err)
      } else {
        console.log('Report updated successfully:', data)
        // Refresh list after update
        await fetchAll(payload.batch_id || null)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception updating report:', err)
      return { data: null, error: err }
    }
  }

  async function remove(report_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_activity_report')
        .delete()
        .eq('report_id', report_id)
      
      if (err) {
        console.error('Error deleting report:', err)
      } else {
        console.log('Report deleted successfully')
        // Refresh list after deletion
        await fetchAll()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception deleting report:', err)
      return { data: null, error: err }
    }
  }

  // Helper function to get report status display text
  function getStatusDisplay(dbStatus) {
    const statusMap = {
      'onReview': 'Waiting Review',
      'needRevision': 'Need Revision',
      'approved': 'Approved'
    }
    return statusMap[dbStatus] || 'Unknown'
  }

  // Helper function to get status color class
  function getStatusColorClass(dbStatus) {
    const colorMap = {
      'onReview': 'bg-yellow-100 text-yellow-800',
      'needRevision': 'bg-red-100 text-red-800',
      'approved': 'bg-green-100 text-green-800'
    }
    return colorMap[dbStatus] || 'bg-gray-100 text-gray-800'
  }

  return { 
    reports, 
    loading, 
    error, 
    fetchAll, 
    fetchById, 
    create, 
    update, 
    remove,
    getStatusDisplay,
    getStatusColorClass
  }
})