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
    // 1. Ambil data report utama
    const { data: report, error: fetchErr } = await supabase
      .from('gh_activity_report')
      .select('*')
      .eq('report_id', report_id)
      .single()

    if (fetchErr) throw fetchErr
    if (!report) throw new Error('Report tidak ditemukan')

    console.log('📋 Approving report:', report_id)
    console.log('👤 Approved by:', approved_by)

    // 2. Ambil SEMUA report yang related (batch + date + location yang sama)
    const { data: relatedReports, error: relatedErr } = await supabase
      .from('gh_activity_report')
      .select('*')
      .eq('batch_id', report.batch_id)
      .eq('report_date', report.report_date)
      .eq('location', report.location)
      .eq('report_status', 'onReview')

    if (relatedErr) throw relatedErr

    console.log(`📝 Found ${relatedReports.length} related reports to approve`)

    // 3. Update SEMUA related reports menjadi approved
    const { error: updateErr } = await supabase
      .from('gh_activity_report')
      .update({
        report_status: 'approved',
        approved_by: approved_by,
        approved_at: new Date().toISOString()
      })
      .eq('batch_id', report.batch_id)
      .eq('report_date', report.report_date)
      .eq('location', report.location)
      .eq('report_status', 'onReview')

    if (updateErr) {
      console.error('❌ Error updating reports:', updateErr)
      throw updateErr
    }

    console.log('✅ All related reports updated to approved')

    // 4. Get master type_damage IDs dynamically
    const { data: masterDamages, error: masterErr } = await supabase
      .from('gh_type_damage')
      .select('typedamage_id, type_damage')
      .order('typedamage_id', { ascending: true })

    if (masterErr) {
      console.error('⚠️ Error fetching master damages:', masterErr)
      throw masterErr
    }

    // Create mapping: type_damage name -> typedamage_id
    const damageMap = {}
    masterDamages.forEach(d => {
      damageMap[d.type_damage] = d.typedamage_id
    })

    console.log('🗺️ Damage mapping:', damageMap)

    // 5. Hitung TOTAL damage dari semua related reports
    let totalKuning = 0
    let totalKutilang = 0
    let totalBusuk = 0

    relatedReports.forEach(r => {
      totalKuning += r.type_damage_kuning || 0
      totalKutilang += r.type_damage_kutilang || 0
      totalBusuk += r.type_damage_busuk || 0
    })

    console.log(`📊 Total damages - Kuning: ${totalKuning}, Kutilang: ${totalKutilang}, Busuk: ${totalBusuk}`)

    // 6. Update qty di gh_type_damage (master table)
    // Kuning
    if (totalKuning > 0 && damageMap['Kuning']) {
      const { data: kuningData, error: kuningFetchErr } = await supabase
        .from('gh_type_damage')
        .select('qty')
        .eq('typedamage_id', damageMap['Kuning'])
        .single()

      if (!kuningFetchErr && kuningData) {
        const newQty = (kuningData.qty || 0) + totalKuning
        const { error: kuningUpdateErr } = await supabase
          .from('gh_type_damage')
          .update({ qty: newQty })
          .eq('typedamage_id', damageMap['Kuning'])
        
        if (kuningUpdateErr) {
          console.error('❌ Error updating Kuning:', kuningUpdateErr)
        } else {
          console.log(`✅ Kuning (ID ${damageMap['Kuning']}) updated: ${kuningData.qty} → ${newQty}`)
        }
      }
    }

    // Kutilang
    if (totalKutilang > 0 && damageMap['Kutilang']) {
      const { data: kutilangData, error: kutilangFetchErr } = await supabase
        .from('gh_type_damage')
        .select('qty')
        .eq('typedamage_id', damageMap['Kutilang'])
        .single()

      if (!kutilangFetchErr && kutilangData) {
        const newQty = (kutilangData.qty || 0) + totalKutilang
        const { error: kutilangUpdateErr } = await supabase
          .from('gh_type_damage')
          .update({ qty: newQty })
          .eq('typedamage_id', damageMap['Kutilang'])
        
        if (kutilangUpdateErr) {
          console.error('❌ Error updating Kutilang:', kutilangUpdateErr)
        } else {
          console.log(`✅ Kutilang (ID ${damageMap['Kutilang']}) updated: ${kutilangData.qty} → ${newQty}`)
        }
      }
    }

    // Busuk
    if (totalBusuk > 0 && damageMap['Busuk']) {
      const { data: busukData, error: busukFetchErr } = await supabase
        .from('gh_type_damage')
        .select('qty')
        .eq('typedamage_id', damageMap['Busuk'])
        .single()

      if (!busukFetchErr && busukData) {
        const newQty = (busukData.qty || 0) + totalBusuk
        const { error: busukUpdateErr } = await supabase
          .from('gh_type_damage')
          .update({ qty: newQty })
          .eq('typedamage_id', damageMap['Busuk'])
        
        if (busukUpdateErr) {
          console.error('❌ Error updating Busuk:', busukUpdateErr)
        } else {
          console.log(`✅ Busuk (ID ${damageMap['Busuk']}) updated: ${busukData.qty} → ${newQty}`)
        }
      }
    }

    console.log('✅ Report approved successfully')
    await fetchAll(report.batch_id)
    
    return { data: relatedReports, error: null }
  } catch (err) {
    console.error('❌ Exception approving report:', err)
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
    approve,
    requestRevision,
    revise,
    getStatusDisplay,
    getStatusColorClass
  }
})