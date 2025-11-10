// /src/stores/activityReport.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useActivityReportStore = defineStore('activityReport', () => {
  const reports = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * ✅ FIXED: Fetch all reports dengan relasi ke type_damage dan activities
   * - Removed 'qty' field dari gh_type_damage (tidak ada di schema)
   * - Fixed order syntax
   */
  async function fetchAll(batch_id = null, location_id = null) {
    loading.value = true
    error.value = null
    
    try {
      let q = supabase
        .from('gh_report')
        .select(`
          *,
          type_damages:gh_type_damage(
            typedamage_id, 
            type_damage,
            kuning, 
            kutilang, 
            busuk
          ),
          activities:gh_activity(
            activity_id, 
            act_name, 
            CoA, 
            manpower,
            materials:gh_material_used(
              material_used_id, 
              material_name, 
              qty, 
              uom
            )
          )
        `)
        .order('report_id', { ascending: false })
      
      if (batch_id) q = q.eq('batch_id', batch_id)
      if (location_id) q = q.eq('location_id', location_id)
      
      const { data, error: err } = await q
      
      if (err) {
        console.error('❌ Error fetching reports:', err)
        error.value = err
      } else {
        reports.value = data || []
        console.log(`✅ Fetched ${data?.length || 0} reports`)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('❌ Exception fetching reports:', err)
      error.value = err
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  /**
   * ✅ FIXED: Fetch single report by ID with relations
   */
  async function fetchById(report_id) {
    try {
      const { data, error: err } = await supabase
        .from('gh_report')
        .select(`
          *,
          type_damages:gh_type_damage(
            typedamage_id,
            type_damage,
            kuning,
            kutilang,
            busuk
          ),
          activities:gh_activity(
            activity_id,
            act_name,
            CoA,
            manpower,
            materials:gh_material_used(
              material_used_id,
              material_name,
              qty,
              uom
            )
          )
        `)
        .eq('report_id', report_id)
        .single()
      
      if (err) {
        console.error('❌ Error fetching report by ID:', err)
      }
      
      return { data, error: err }
    } catch (err) {
      console.error('❌ Exception fetching report by ID:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Get grouped reports by location, batch, and date
   */
  async function fetchGroupedReports(batch_id = null) {
    try {
      const { data, error: err } = await fetchAll(batch_id)
      
      if (err) throw err
      
      const grouped = {}
      
      data.forEach(report => {
        const key = `${report.location_id}_${report.batch_id}_${report.report_date}`
        
        if (!grouped[key]) {
          grouped[key] = {
            location_id: report.location_id,
            batch_id: report.batch_id,
            report_date: report.report_date,
            reports: [],
            hasNeedRevision: false,
            allApproved: true
          }
        }
        
        grouped[key].reports.push(report)
        
        if (report.report_status === 'needRevision') {
          grouped[key].hasNeedRevision = true
        }
        if (report.report_status !== 'approved') {
          grouped[key].allApproved = false
        }
      })
      
      return Object.values(grouped)
    } catch (err) {
      console.error('❌ Error fetching grouped reports:', err)
      return []
    }
  }

  /**
   * ✅ Create new report
   * Material stock validation should be done in the form component before calling this
   */
  async function create(payload) {
    try {
      const reportPayload = {
        batch_id: payload.batch_id,
        location_id: payload.location_id,
        report_date: payload.report_date,
        report_status: 'onReview'
      }
      
      console.log('📝 Creating report with payload:', reportPayload)
      
      // 1. Create report
      const { data: reportData, error: reportErr } = await supabase
        .from('gh_report')
        .insert([reportPayload])
        .select()
        .single()
      
      if (reportErr) {
        console.error('❌ Error creating report:', reportErr)
        throw reportErr
      }
      
      const report_id = reportData.report_id
      console.log('✅ Report created:', report_id)
      
      // 2. Create type_damages if provided
      if (payload.type_damages && payload.type_damages.length > 0) {
        const typeDamagePayloads = payload.type_damages.map(td => ({
          report_id,
          type_damage: td.type_damage || null,
          kuning: td.kuning ? parseInt(td.kuning) : null,
          kutilang: td.kutilang ? parseInt(td.kutilang) : null,
          busuk: td.busuk ? parseInt(td.busuk) : null
        }))
        
        const { error: tdErr } = await supabase
          .from('gh_type_damage')
          .insert(typeDamagePayloads)
        
        if (tdErr) {
          console.error('❌ Error creating type_damages:', tdErr)
          throw tdErr
        }
        console.log('✅ Type damages created')
      }
      
      // 3. Create activities if provided
      if (payload.activities && payload.activities.length > 0) {
        for (const activity of payload.activities) {
          const actPayload = {
            act_name: activity.act_name,
            CoA: activity.CoA || null,
            manpower: activity.manpower || null,
            report_id
          }
          
          const { data: actData, error: actErr } = await supabase
            .from('gh_activity')
            .insert([actPayload])
            .select()
            .single()
          
          if (actErr) {
            console.error('❌ Error creating activity:', actErr)
            throw actErr
          }
          
          const activity_id = actData.activity_id
          console.log('✅ Activity created:', activity_id)
          
          // 4. Create material_used for this activity
          if (activity.materials && activity.materials.length > 0) {
            const materialPayloads = activity.materials.map(mat => ({
              material_name: mat.material_name,
              qty: parseFloat(mat.qty),
              uom: mat.uom,
              activity_id
            }))
            
            const { error: matErr } = await supabase
              .from('gh_material_used')
              .insert(materialPayloads)
            
            if (matErr) {
              console.error('❌ Error creating materials:', matErr)
              throw matErr
            }
            console.log(`✅ ${materialPayloads.length} materials created`)
          }
        }
        
        console.log('✅ All activities and materials created')
      }
      
      await fetchAll(payload.batch_id)
      return { data: reportData, error: null }
    } catch (err) {
      console.error('❌ Exception creating report:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Update report basic info
   */
  async function update(report_id, payload) {
    try {
      console.log(`🔄 Updating report #${report_id}`)
      
      const { data, error: err } = await supabase
        .from('gh_report')
        .update(payload)
        .eq('report_id', report_id)
        .select()
      
      if (err) {
        console.error('❌ Error updating report:', err)
        throw err
      } else {
        console.log('✅ Report updated successfully')
        await fetchAll(payload.batch_id || null)
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('❌ Exception updating report:', err)
      return { data: null, error: err }
    }
  }

  /**
   * ✅ APPROVE SINGLE REPORT
   * Approve report and reduce material stock
   */
  async function approveSingle(report_id, approved_by) {
    try {
      console.log(`📋 Approving report: ${report_id}`)
      
      // 1. Get report with activities and materials
      const { data: report, error: fetchErr } = await fetchById(report_id)
      if (fetchErr) throw fetchErr
      if (!report) throw new Error('Report tidak ditemukan')
      
      // 2. Update status to approved
      const { error: updateErr } = await supabase
        .from('gh_report')
        .update({
          report_status: 'approved',
          approved_by: approved_by,
          approved_at: new Date().toISOString()
        })
        .eq('report_id', report_id)
      
      if (updateErr) throw updateErr
      
      console.log(`✅ Report #${report_id} approved`)
      
      // 3. Process material stock reduction
      if (report.activities && report.activities.length > 0) {
        // Import material store dynamically to avoid circular dependency
        const { useMaterialStore } = await import('./material')
        const materialStore = useMaterialStore()
        
        for (const activity of report.activities) {
          if (activity.materials && activity.materials.length > 0) {
            for (const material of activity.materials) {
              if (material.qty > 0) {
                const result = await materialStore.reduceStock(
                  material.material_name,
                  material.qty,
                  report.location_id
                )
                
                if (result.error) {
                  console.warn(`⚠️ Warning reducing stock for ${material.material_name}:`, result.error)
                } else {
                  console.log(`✅ Stock reduced: ${material.material_name} (-${material.qty})`)
                }
              }
            }
          }
        }
      }
      
      await fetchAll()
      return { data: report, error: null }
    } catch (err) {
      console.error('❌ Error approving report:', err)
      return { data: null, error: err }
    }
  }

  /**
   * ✅ APPROVE ALL REPORTS IN GROUP
   */
  async function approveGroup(location_id, batch_id, report_date, approved_by) {
    try {
      console.log(`📋 Approving group:`, { location_id, batch_id, report_date })
      
      const { data: groupReports, error: fetchErr } = await supabase
        .from('gh_report')
        .select('report_id')
        .eq('location_id', location_id)
        .eq('batch_id', batch_id)
        .eq('report_date', report_date)
        .eq('report_status', 'onReview')
      
      if (fetchErr) throw fetchErr
      
      console.log(`📝 Found ${groupReports.length} reports to approve`)
      
      const results = []
      for (const report of groupReports) {
        const result = await approveSingle(report.report_id, approved_by)
        results.push(result)
      }
      
      console.log('✅ All reports in group approved')
      await fetchAll()
      
      return { data: results, error: null }
    } catch (err) {
      console.error('❌ Error approving group:', err)
      return { data: null, error: err }
    }
  }

  /**
   * ✅ REQUEST REVISION FOR GROUP
   */
  async function requestRevisionGroup(location_id, batch_id, report_date, revision_notes, requested_by) {
    try {
      console.log(`🔄 Requesting revision for group`)
      
      const { error: updateErr } = await supabase
        .from('gh_report')
        .update({
          report_status: 'needRevision',
          revision_notes: revision_notes,
          revision_requested_by: requested_by,
          revision_requested_at: new Date().toISOString()
        })
        .eq('location_id', location_id)
        .eq('batch_id', batch_id)
        .eq('report_date', report_date)
        .in('report_status', ['onReview', 'needRevision'])
      
      if (updateErr) throw updateErr
      
      console.log('✅ Revision requested')
      await fetchAll()
      
      return { data: true, error: null }
    } catch (err) {
      console.error('❌ Error requesting revision:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Delete report and all related data
   */
  async function remove(report_id) {
    try {
      // Note: Cascade delete should handle type_damage, activity, and material_used
      const { data, error: err } = await supabase
        .from('gh_report')
        .delete()
        .eq('report_id', report_id)
      
      if (err) {
        console.error('❌ Error deleting report:', err)
        throw err
      } else {
        console.log('✅ Report deleted successfully')
        await fetchAll()
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('❌ Exception deleting report:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Get display text for status
   */
  function getStatusDisplay(dbStatus) {
    const statusMap = {
      'onReview': 'Waiting Review',
      'needRevision': 'Need Revision',
      'approved': 'Approved'
    }
    return statusMap[dbStatus] || 'Unknown'
  }

  /**
   * Get color class for status badge
   */
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
    fetchGroupedReports,
    create, 
    update, 
    remove,
    approveSingle,
    approveGroup,
    requestRevisionGroup,
    getStatusDisplay,
    getStatusColorClass
  }
})