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
        console.log(`Fetched ${data?.length || 0} reports`)
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
        console.log('Fetched report:', data)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception fetching report by ID:', err)
      return { data: null, error: err }
    }
  }

  async function create(payload) {
    try {
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
      console.log(`Updating report #${report_id} with:`, payload)
      
      const { data, error: err } = await supabase
        .from('gh_activity_report')
        .update(payload)
        .eq('report_id', report_id)
        .select()
      
      if (err) {
        console.error('Error updating report:', err)
      } else {
        console.log('Report updated successfully:', data)
        await fetchAll(payload.batch_id || null)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception updating report:', err)
      return { data: null, error: err }
    }
  }

  /**
   * ✅ APPROVE REPORT
   * Mengubah status menjadi 'approved' dan menambahkan qty ke gh_type_damage
   */
  async function approve(report_id, approved_by) {
    try {
      // 1. Ambil data report
      const { data: report, error: fetchErr } = await supabase
        .from('gh_activity_report')
        .select('*')
        .eq('report_id', report_id)
        .single()

      if (fetchErr) throw fetchErr
      if (!report) throw new Error('Report tidak ditemukan')

      // 2. Update status report menjadi approved
      const { error: updateErr } = await supabase
        .from('gh_activity_report')
        .update({
          report_status: 'approved',
          approved_by: approved_by,
          approved_at: new Date().toISOString()
        })
        .eq('report_id', report_id)

      if (updateErr) throw updateErr

      // 3. Jika ada typedamage_id dan qty, tambahkan ke total di gh_type_damage
      if (report.typedamage_id && report.qty) {
        // Ambil data type_damage saat ini
        const { data: typeDamage, error: damageErr } = await supabase
          .from('gh_type_damage')
          .select('qty')
          .eq('typedamage_id', report.typedamage_id)
          .single()

        if (damageErr) {
          console.error('Error fetching type_damage:', damageErr)
          throw damageErr
        }

        // Update total qty
        const newQty = (typeDamage.qty || 0) + report.qty
        const { error: updateDamageErr } = await supabase
          .from('gh_type_damage')
          .update({ qty: newQty })
          .eq('typedamage_id', report.typedamage_id)

        if (updateDamageErr) throw updateDamageErr

        console.log(`✅ Type damage #${report.typedamage_id} qty updated: ${typeDamage.qty} → ${newQty}`)
      }

      console.log('✅ Report approved successfully')
      await fetchAll(report.batch_id)
      
      return { data: report, error: null }
    } catch (err) {
      console.error('Exception approving report:', err)
      return { data: null, error: err }
    }
  }

  /**
   * ✅ REQUEST REVISION
   * Mengubah status menjadi 'needRevision' dengan catatan revisi
   */
  async function requestRevision(report_id, revision_notes, requested_by) {
    try {
      const { data, error: err } = await supabase
        .from('gh_activity_report')
        .update({
          report_status: 'needRevision',
          revision_notes: revision_notes,
          revision_requested_by: requested_by,
          revision_requested_at: new Date().toISOString()
        })
        .eq('report_id', report_id)
        .select()

      if (err) {
        console.error('Error requesting revision:', err)
      } else {
        console.log('✅ Revision requested successfully')
        await fetchAll()
      }

      return { data, error: err }
    } catch (err) {
      console.error('Exception requesting revision:', err)
      return { data: null, error: err }
    }
  }

  /**
   * ✅ REVISE REPORT
   * User memperbaiki report yang diminta revisi
   */
  async function revise(report_id, payload, revised_by) {
    try {
      const updatePayload = {
        ...payload,
        report_status: 'onReview', // Kembali ke review setelah diperbaiki
        revised_by: revised_by,
        revised_at: new Date().toISOString(),
        revision_notes: null, // Clear revision notes
        revision_requested_by: null,
        revision_requested_at: null
      }

      const { data, error: err } = await supabase
        .from('gh_activity_report')
        .update(updatePayload)
        .eq('report_id', report_id)
        .select()

      if (err) {
        console.error('Error revising report:', err)
      } else {
        console.log('✅ Report revised successfully')
        await fetchAll(payload.batch_id || null)
      }

      return { data, error: err }
    } catch (err) {
      console.error('Exception revising report:', err)
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
        await fetchAll()
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('Exception deleting report:', err)
      return { data: null, error: err }
    }
  }

  function getStatusDisplay(dbStatus) {
    const statusMap = {
      'onReview': 'Waiting Review',
      'needRevision': 'Need Revision',
      'approved': 'Approved'
    }
    return statusMap[dbStatus] || 'Unknown'
  }

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
    approve,           // ✅ New
    requestRevision,   // ✅ New
    revise,           // ✅ New
    getStatusDisplay,
    getStatusColorClass
  }
})