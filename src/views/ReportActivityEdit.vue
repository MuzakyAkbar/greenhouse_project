// ReportActivityEdit.vue
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { usePotatoActivityStore } from '../stores/potatoActivity'
import { useMaterialStore } from '../stores/material'
import { supabase } from '../lib/supabase'
import openbravoApi from '@/lib/openbravo'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const potatoActivityStore = usePotatoActivityStore()
const materialStore = useMaterialStore()

// ✅ Get report_id from route params with debug
const report_id = ref(route.params.report_id || route.params.id || null)

console.log('🔍 Route Debug Info:')
console.log('  - route.params:', route.params)
console.log('  - route.path:', route.path)
console.log('  - route.name:', route.name)
console.log('  - report_id extracted:', report_id.value)

// ✅ ADD state
const phaseInfo = ref(null);

// ✅ ADD function
const loadPhaseInfo = async (phaseId) => {
  if (!phaseId) return null;
  
  try {
    const { data, error } = await supabase
      .from('gh_phase')
      .select('phase_name')
      .eq('phase_id', phaseId)
      .single();
    
    if (error) throw error;
    return data?.phase_name || 'Unknown Phase';
  } catch (err) {
    console.error('Error loading phase:', err);
    return 'Unknown Phase';
  }
};

const loading = ref(true)
const saving = ref(false)
const error = ref(null)

const currentReport = ref(null)
const revisionNotes = ref([])

// Form data
const form = ref({
  location_id: null,
  batch_id: null,
  report_date: ''
})

// Type damages data
const typeDamages = ref([])

// Activities data
const activities = ref([])

onMounted(async () => {
  console.log('═══════════════════════════════════════')
  console.log('🚀 ReportActivityEdit.vue MOUNTED')
  console.log('═══════════════════════════════════════')
  console.log('📍 Current Route Info:')
  console.log('  - Path:', route.path)
  console.log('  - Name:', route.name)
  console.log('  - Params:', JSON.stringify(route.params))
  console.log('  - Query:', JSON.stringify(route.query))
  console.log('  - Full Path:', route.fullPath)
  console.log('📋 Extracted report_id:', report_id.value)
  console.log('👤 User logged in:', authStore.isLoggedIn)
  console.log('═══════════════════════════════════════')
  
  if (!authStore.isLoggedIn) {
    console.log('❌ User not logged in - Redirecting to login')
    router.push('/')
    return
  }

  if (!report_id.value) {
    alert('⚠️ Report ID tidak ditemukan')
    console.log('🔄 No report_id - Redirecting to /planningReportList')
    router.replace('/planningReportList')
    return
  }

  await loadData()
  
  // 🧩 Sinkronisasi act_name ke master_activity_id agar dropdown terisi otomatis saat revisi
  activities.value.forEach((act) => {
    if (!act.master_activity_id && act.act_name) {
      const matched = potatoActivityStore.activities.find(a => 
        a.activity?.toLowerCase().trim() === act.act_name.toLowerCase().trim() ||
        a.act_name?.toLowerCase().trim() === act.act_name.toLowerCase().trim()
      )

      if (matched) {
        act.master_activity_id = matched.activity_id
        act.CoA = act.CoA || matched.CoA_code
        console.log(`✅ Auto-linked activity "${act.act_name}" to master ID ${matched.activity_id}`)
      } else {
        console.warn(`⚠️ Tidak ditemukan activity di master untuk "${act.act_name}"`)
      }
    }
  })
})

const loadData = async () => {
  try {
    loading.value = true
    
    // ✅ Load master data - TANPA materialStore.fetchStock()
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll(),
      potatoActivityStore.fetchAll()
      // ❌ HAPUS: materialStore.fetchStock() 
    ])
    
    console.log('📋 Master Data Loaded:')
    console.log('  - Batches:', batchStore.batches.length)
    console.log('  - Locations:', locationStore.locations.length)
    console.log('  - Activities:', potatoActivityStore.activities.length)

    // ✅ FETCH REPORT BY report_id
    const { data: report, error: fetchError } = await supabase
      .from('gh_report')
      .select(`
        *,
        type_damages:gh_type_damage(typedamage_id, type_damage, kuning, kutilang, busuk),
        activities:gh_activity(
          activity_id, act_name, CoA, manpower,
          materials:gh_material_used(*)
        )
      `)
      .eq('report_id', report_id.value)
      .single()
    
    if (fetchError) throw fetchError
    if (!report) throw new Error('Laporan tidak ditemukan')

    console.log('✅ Report fetched:', report)

    // ✅ CHECK: Apakah report ini punya approval_record_id?
    if (!report.approval_record_id) {
      alert('⚠️ Laporan ini belum masuk ke flow approval.')
      console.log('🔄 No approval record - Redirecting to /planningReportList')
      router.replace('/planningReportList')
      return
    }

    // ✅ CHECK: Apakah overall_status = needRevision?
    const { data: approvalRecord, error: approvalErr } = await supabase
      .from('gh_approve_record')
      .select('overall_status, current_level_order')
      .eq('record_id', report.approval_record_id)
      .single()

    if (approvalErr) {
      console.error('❌ Error fetching approval record:', approvalErr)
      throw new Error('Gagal mengambil status approval')
    }

    console.log('📊 Approval Record:', approvalRecord)

    if (approvalRecord?.overall_status !== 'needRevision') {
      alert(`⚠️ Laporan ini tidak dalam status Need Revision.\n\nStatus saat ini: ${approvalRecord?.overall_status || 'Unknown'}`)
      console.log(`🔄 Status is ${approvalRecord?.overall_status} - Redirecting to /planningReportList`)
      router.replace('/planningReportList')
      return
    }

    currentReport.value = report
    console.log('✅ Report is in needRevision status, proceeding...')

    // Load phase name
    if (report.phase_id) {
      phaseInfo.value = await loadPhaseInfo(report.phase_id)
    }

    // Set basic form data
    form.value = {
      location_id: report.location_id,
      batch_id: report.batch_id,
      report_date: report.report_date
    }

    // ✅ Load ALL type damages (semua editable karena report needRevision)
    if (report.type_damages && report.type_damages.length > 0) {
      typeDamages.value = report.type_damages.map(td => ({
        typedamage_id: td.typedamage_id,
        type_damage: td.type_damage || '',
        kuning: td.kuning || 0,
        kutilang: td.kutilang || 0,
        busuk: td.busuk || 0,
        editable: true // Semua editable
      }))
      console.log(`✅ Loaded ${typeDamages.value.length} type damages`)
    } else {
      typeDamages.value = []
      console.log('ℹ️ No type damages in report')
    }

    // ✅ Load ALL activities (semua editable karena report needRevision)
    if (report.activities && report.activities.length > 0) {
      activities.value = report.activities.map(act => {
        // Auto-link ke master activity
        const masterActivity = potatoActivityStore.activities.find(a => 
          a.activity?.toLowerCase().trim() === act.act_name?.toLowerCase().trim() ||
          a.act_name?.toLowerCase().trim() === act.act_name?.toLowerCase().trim()
        )
        
        console.log(`📌 Mapping activity "${act.act_name}":`, {
          gh_activity_id: act.activity_id,
          master_match: masterActivity?.activity_id,
          CoA: act.CoA
        })
        
        return {
          gh_activity_id: act.activity_id,
          master_activity_id: masterActivity?.activity_id || null,
          act_name: act.act_name,
          CoA: act.CoA || masterActivity?.CoA_code,
          manpower: act.manpower || 0,
          materials: act.materials && act.materials.length > 0
            ? act.materials.map(mat => ({
                material_used_id: mat.material_used_id,
                material_id: null, // Will be set by user via dropdown
                material_name: mat.material_name,
                qty: mat.qty || 0,
                uom: mat.uom || ''
              }))
            : [{ 
                material_used_id: null, 
                material_id: null, 
                material_name: '', 
                qty: 0, 
                uom: '' 
              }],
          editable: true // Semua editable
        }
      })
      
      console.log(`✅ Loaded ${activities.value.length} activities`)
    } else {
      activities.value = []
      console.log('ℹ️ No activities in report')
    }

    // ✅ SKIP: Material loading karena langsung dari Openbravo via dropdown
    console.log('ℹ️ Materials will be loaded from Openbravo via dropdown on-demand')
    
  } catch (err) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
    alert('❌ Gagal memuat data: ' + err.message)
    console.log('🔄 Error - Redirecting to /planningReportList')
    router.replace('/planningReportList')
  } finally {
    loading.value = false
  }
}

// Helper functions
const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id == batchId)
  return batch?.batch_name || `Batch ${batchId}`
}

const getLocationName = (locationId) => {
  const location = locationStore.locations.find(l => l.location_id == locationId)
  return location?.location || `Location ${locationId}`
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ✅ Watch for activity changes to auto-fill CoA dan act_name
watch(() => activities.value, (acts) => {
  acts.forEach((act) => {
    if (act.master_activity_id) {
      const selected = potatoActivityStore.activities.find(a => a.activity_id == act.master_activity_id)
      if (selected) {
        if (selected.CoA_code) {
          act.CoA = selected.CoA_code
        }
        if (selected.activity || selected.act_name) {
          act.act_name = selected.activity || selected.act_name
        }
        console.log(`✅ Auto-filled from master:`, {
          master_activity_id: act.master_activity_id,
          act_name: act.act_name,
          CoA: act.CoA
        })
      }
    }
  })
}, { deep: true })

// ✅ Handler untuk material change - FIXED VERSION
const onMaterialChange = (activityIndex, materialIndex, material_id) => {
  console.log(`🔄 Material changed:`, {
    activityIndex,
    materialIndex,
    material_id,
    material_id_type: typeof material_id
  })
  
  if (!material_id || material_id === null) {
    console.log('⚠️ No material_id selected')
    const material = activities.value[activityIndex].materials[materialIndex]
    material.material_id = null
    material.material_name = ''
    material.uom = ''
    return
  }
  
  // Convert to number
  const materialIdNum = parseInt(material_id)
  const selectedMaterial = materialStore.materialStock.find(m => parseInt(m.material_id) === materialIdNum)
  
  if (selectedMaterial) {
    const material = activities.value[activityIndex].materials[materialIndex]
    material.material_id = selectedMaterial.material_id
    material.material_name = selectedMaterial.material_name
    material.uom = selectedMaterial.uom || ''
    
    console.log(`✅ Material SAVED:`, {
      material_id: material.material_id,
      material_name: material.material_name,
      qty: material.qty,
      uom: material.uom
    })
    
    // Force update
    activities.value = [...activities.value]
  } else {
    console.error(`❌ Material ID ${materialIdNum} NOT FOUND in stock`)
  }
}

// ======================
// GET MATERIAL PRICE FROM OPENBRAVO
// ======================
const getMaterialPrice = async (materialName) => {
  try {
    console.log('💰 Fetching price for:', materialName);

    // STEP 1: Cari Product dengan mengambil semua data lalu filter di client
    // Karena _identifier tidak bisa di-query langsung
    const productRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Product',
      {
        params: {
          _selectedProperties: 'id,_identifier,name',
          _maxResults: 1000  // Ambil banyak untuk di-filter
        }
      }
    );

    const products = productRes?.data?.response?.data || [];
    
    if (products.length === 0) {
      console.warn(`⚠️ No products found in Openbravo`);
      return 0;
    }

    // Filter di client side untuk cari yang _identifier match
    const matchedProduct = products.find(p => 
      p._identifier?.toLowerCase().trim() === materialName?.toLowerCase().trim()
    );

    if (!matchedProduct) {
      console.warn(`⚠️ Product not found for: "${materialName}"`);
      console.warn(`   Searched in ${products.length} products`);
      console.warn(`   Sample products:`, products.slice(0, 5).map(p => p._identifier));
      return 0;
    }

    const productId = matchedProduct.id;
    
    console.log(`   ✅ Product found:`, {
      id: productId,
      identifier: matchedProduct._identifier,
      name: matchedProduct.name
    });

    // STEP 2: Ambil harga terbaru dari MaterialMgmtCosting
    const costingRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtCosting',
      {
        params: {
          _where: `product='${productId}'`,
          _orderBy: 'updated desc',
          _maxResults: 1
        }
      }
    );

    const costings = costingRes?.data?.response?.data || [];
    
    if (costings.length === 0) {
      console.warn(`⚠️ No costing data found for product: ${materialName}`);
      return 0;
    }

    const latestCosting = costings[0];
    const price = parseFloat(latestCosting.price) || 0;
    
    console.log(`   ✅ Price found:`, {
      identifier: latestCosting._identifier,
      price: price,
      updated: latestCosting.updated
    });
    
    return price;

  } catch (err) {
    console.error(`❌ Error fetching price for ${materialName}:`, err);
    console.error('   - Error details:', err.response?.data || err.message);
    return 0;
  }
};

// Material handlers
const addMaterialRow = (activityIndex) => {
  activities.value[activityIndex].materials.push({
    material_used_id: null,
    material_id: null,
    material_name: '',
    qty: 0,
    uom: ''
  })
}

const removeMaterialRow = (activityIndex, materialIndex) => {
  if (activities.value[activityIndex].materials.length > 1) {
    activities.value[activityIndex].materials.splice(materialIndex, 1)
  }
}

const handleSubmit = async () => {
  try {
    saving.value = true;
    error.value = null;

    // Validate
    if (!form.value.location_id || !form.value.batch_id || !form.value.report_date) {
      throw new Error('Lokasi, Batch, dan Tanggal wajib diisi');
    }

    const username = authStore.user?.username || authStore.user?.email || 'Staff';
    const now = new Date().toISOString();

    console.log('🔄 Starting submit process...');

    // ✅ HAPUS LOGIKA FILTER - Karena tidak ada kolom status di item
    // Kita langsung update/delete semua items

    // ===================================
    // 1. UPDATE TYPE DAMAGES (jika ada)
    // ===================================
    if (typeDamages.value && typeDamages.value.length > 0) {
      console.log(`📝 Updating ${typeDamages.value.length} type damages`);
      
      for (const td of typeDamages.value) {
        const { error: updateErr } = await supabase
          .from('gh_type_damage')
          .update({
            type_damage: td.type_damage,
            kuning: parseInt(td.kuning) || 0,
            kutilang: parseInt(td.kutilang) || 0,
            busuk: parseInt(td.busuk) || 0
          })
          .eq('typedamage_id', td.typedamage_id);
        
        if (updateErr) {
          console.error('❌ Error updating type damage:', updateErr);
          throw new Error(`Gagal update kerusakan: ${updateErr.message}`);
        }
      }
      
      console.log(`✅ Successfully updated ${typeDamages.value.length} type damages`);
    }

    // ===================================
    // 2. DELETE & INSERT ACTIVITIES (jika ada)
    // ===================================
    if (activities.value && activities.value.length > 0) {
      console.log(`📝 Processing ${activities.value.length} activities`);
      
      for (const act of activities.value) {
        if (!act.gh_activity_id) {
          throw new Error('ID aktivitas tidak valid');
        }

        if (!act.act_name || act.act_name.trim() === '') {
          throw new Error('Nama aktivitas wajib diisi');
        }

        console.log(`  - Processing activity ${act.gh_activity_id}: "${act.act_name}"`);

        // DELETE old materials
        const { error: deleteMatErr } = await supabase
          .from('gh_material_used')
          .delete()
          .eq('activity_id', act.gh_activity_id);
        
        if (deleteMatErr) {
          console.error('❌ Error deleting old materials:', deleteMatErr);
          throw new Error(`Gagal hapus material lama: ${deleteMatErr.message}`);
        }

        // DELETE old activity
        const { error: deleteActErr } = await supabase
          .from('gh_activity')
          .delete()
          .eq('activity_id', act.gh_activity_id);
        
        if (deleteActErr) {
          console.error('❌ Error deleting old activity:', deleteActErr);
          throw new Error(`Gagal hapus aktivitas lama: ${deleteActErr.message}`);
        }

        // INSERT new activity
        const { data: newActivity, error: insertActErr } = await supabase
          .from('gh_activity')
          .insert({
            report_id: report_id.value,
            act_name: act.act_name,
            CoA: act.CoA ? parseFloat(act.CoA) : null,
            manpower: parseInt(act.manpower) || 0
          })
          .select()
          .single();
        
        if (insertActErr) {
          console.error('❌ Error inserting new activity:', insertActErr);
          throw new Error(`Gagal insert aktivitas: ${insertActErr.message}`);
        }

        const newActivityId = newActivity.activity_id;
        console.log(`  ✅ New activity inserted with ID: ${newActivityId}`);

        // INSERT new materials (dengan price dari Openbravo)
        if (act.materials && act.materials.length > 0) {
          const validMaterials = act.materials.filter(mat => 
            mat.material_name && mat.qty && parseFloat(mat.qty) > 0
          );

          if (validMaterials.length > 0) {
            const materialPayloads = await Promise.all(
              validMaterials.map(async (mat) => {
                const qty = parseFloat(mat.qty);
                const unitPrice = await getMaterialPrice(mat.material_name);
                const totalPrice = qty * unitPrice;

                return {
                  activity_id: newActivityId,
                  material_name: mat.material_name,
                  qty: qty,
                  uom: mat.uom || null,
                  unit_price: unitPrice,
                  total_price: totalPrice
                };
              })
            );

            const { data: matData, error: matErr } = await supabase
              .from('gh_material_used')
              .insert(materialPayloads)
              .select();

            if (matErr) {
              console.error('❌ Error inserting materials:', matErr);
              throw new Error(`Gagal insert material: ${matErr.message}`);
            }

            console.log(`  ✅ Inserted ${matData.length} materials`);
          }
        }
      }
      
      console.log(`✅ Successfully processed ${activities.value.length} activities`);
    }

    // ===================================
    // 3. UPDATE REPORT STATUS & RESET APPROVAL
    // ===================================
    console.log('🔄 Updating report status to onReview...');
    
    const { error: updateReportErr } = await supabase
      .from('gh_report')
      .update({
        report_status: 'onReview',
        updated_at: now
      })
      .eq('report_id', report_id.value);

    if (updateReportErr) {
      console.error('❌ Error updating report:', updateReportErr);
      throw updateReportErr;
    }

    // ===================================
    // 4. RESET APPROVAL RECORD
    // ===================================
    if (currentReport.value.approval_record_id) {
      console.log('🔄 Resetting approval to level 1...');
      
      // 4.1 Reset current_level_order ke 1
      const { error: recordErr } = await supabase
        .from('gh_approve_record')
        .update({
          current_level_order: 1,
          overall_status: 'onReview',
          updated_at: now
        })
        .eq('record_id', currentReport.value.approval_record_id);

      if (recordErr) {
        console.error('❌ Error updating approve_record:', recordErr);
        throw recordErr;
      }

      // 4.2 Reset all level status to pending
      const { error: resetErr } = await supabase
        .from('gh_approval_level_status')
        .update({
          status: 'pending',
          approved_by: null,
          approved_at: null,
          revision_notes: null,
          revision_requested_by: null,
          revision_requested_at: null,
          updated_at: now
        })
        .eq('record_id', currentReport.value.approval_record_id);

      if (resetErr) {
        console.error('❌ Error resetting level status:', resetErr);
        throw resetErr;
      }

      // 4.3 Insert history: revision completed
      const { data: flowData } = await supabase
        .from('gh_approve_record')
        .select('flow_id')
        .eq('record_id', currentReport.value.approval_record_id)
        .single();

      const { error: historyErr } = await supabase
        .from('gh_approval_history')
        .insert({
          record_id: currentReport.value.approval_record_id,
          flow_id: flowData.flow_id,
          user_id: authStore.user.user_id,
          level_order: 0,
          level_name: 'Staff',
          action: 'submitted',
          comment: `Report revised and resubmitted by ${username}`
        });

      if (historyErr) {
        console.error('❌ Error inserting history:', historyErr);
        // Non-blocking error
      }
      
      console.log('✅ Approval reset to level 1');
    }

    alert('✅ Laporan berhasil diperbarui dan dikirim untuk review ulang!');
    router.replace('/planningReportList');
    
  } catch (err) {
    console.error('❌ Error saving:', err);
    error.value = err.message;
    alert('❌ Gagal menyimpan: ' + err.message);
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  if (confirm('❓ Batalkan perubahan?\n\nData yang belum disimpan akan hilang.')) {
    console.log('🔄 Cancel - Redirecting to /planningReportList')
    router.replace('/planningReportList')  // ✅ Use replace instead of push
  }
}

// Computed
const filteredActivities = computed(() => {
  const activities = potatoActivityStore.activities
  if (!activities || activities.length === 0) {
    console.warn('⚠️ No activities loaded')
    return []
  }
  console.log('⚙️ Available activities:', activities.map(a => ({
    id: a.activity_id,
    name: a.activity || a.act_name
  })))
  return activities
})

const filteredMaterials = computed(() => {
  const materials = materialStore.materialStock
  if (!materials || materials.length === 0) {
    console.warn('⚠️ No materials loaded in materialStore.materialStock')
    return []
  }
  console.log('📦 Available materials for dropdown:', materials.map(m => ({
    id: m.material_id,
    name: m.material_name,
    uom: m.uom
  })))
  return materials
})

// ✅ HAPUS: Reset approval setelah edit berhasil (sekitar line 850)
// if (currentReport.value.approval_record_id) {
//   console.log('🔄 Resetting approval to level 1...');
  
//   const { error: resetErr } = await supabase.rpc('reset_approval_after_revision', {
//     p_record_id: currentReport.value.approval_record_id
//   });

//   if (resetErr) {
//     console.error('❌ Error resetting approval:', resetErr);
//   } else {
//     console.log('✅ Approval reset to level 1');
//   }
// }

</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button 
            @click="handleCancel"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </button>
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-lg">
                🔄
              </span>
              Edit Laporan Aktivitas
            </h1>
            <p class="text-sm text-gray-500 mt-1">Perbaiki item yang memerlukan revisi - Report ID: #{{ report_id }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data...</p>
        </div>
      </div>

      <div v-else-if="error && !saving" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <template v-else-if="!loading">
        
        <div v-if="revisionNotes.length > 0" class="mb-6 space-y-3">
          <div
            v-for="(note, idx) in revisionNotes"
            :key="idx"
            class="bg-red-50 border-2 border-red-200 rounded-2xl p-5"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl flex-shrink-0">
                🔄
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg">
                    {{ note.type }}
                  </span>
                  <span class="text-sm font-bold text-red-900">{{ note.item }}</span>
                </div>
                <div class="bg-white rounded-lg p-4 border-2 border-red-200">
                  <p class="text-red-700 whitespace-pre-wrap font-medium">{{ note.notes }}</p>
                </div>
                <p class="text-xs text-red-600 mt-2">By: {{ note.by }} • {{ formatDateTime(note.at) }}</p>
              </div>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-xl">📋</span>
              Informasi Dasar (Read Only)
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ getLocationName(form.location_id) }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Batch</label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ getBatchName(form.batch_id) }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Phase</label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ phaseInfo || '-' }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Tanggal</label>
                <div class="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                  {{ form.report_date }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="typeDamages.length > 0" class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-xl">🌾</span>
              Kerusakan Tanaman ({{ typeDamages.length }})
            </h2>
            
            <div class="space-y-4">
              <div
                v-for="(td, index) in typeDamages"
                :key="td.typedamage_id"
                :class="[
                  'rounded-xl p-5 border-2',
                  td.editable ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                ]"
              >
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm font-bold text-gray-600">Kerusakan #{{ index + 1 }}</span>
                  <span 
                    :class="[
                      'px-3 py-1 rounded-lg font-bold text-xs border-2',
                      td.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                      td.status === 'needRevision' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-yellow-100 text-yellow-800 border-yellow-200'
                    ]"
                  >
                    {{ td.status === 'approved' ? '✅ Approved' : 
                       td.status === 'needRevision' ? '🔄 Need Revision' : 
                       '⏳ On Review' }}
                  </span>
                </div>

                <div v-if="td.revision_notes && td.editable" class="mb-4 bg-red-100 border-2 border-red-300 rounded-lg p-3">
                  <p class="text-xs text-red-600 font-semibold mb-1">📝 Catatan Revisi:</p>
                  <p class="text-sm text-red-900">{{ td.revision_notes }}</p>
                </div>

                <div v-if="td.status === 'approved' && td.approved_at" class="mb-4 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                  <p class="text-xs text-green-600 font-semibold mb-1">✅ Sudah Disetujui</p>
                  <p class="text-sm text-green-900">By: {{ td.approved_by }} • {{ formatDateTime(td.approved_at) }}</p>
                </div>

                <div class="mb-3">
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Jenis Kerusakan
                  </label>
                  <input
                    v-model="td.type_damage"
                    type="text"
                    placeholder="Contoh: Hama Tikus"
                    :readonly="!td.editable"
                    :class="[
                      'w-full px-4 py-3 border-2 rounded-lg transition',
                      td.editable 
                        ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                        : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                    ]"
                  />
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span class="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs">🟡</span>
                      Kuning
                    </label>
                    <input
                      v-model="td.kuning"
                      type="number"
                      min="0"
                      placeholder="0"
                      :readonly="!td.editable"
                      :class="[
                        'w-full px-4 py-3 border-2 rounded-lg transition',
                        td.editable 
                          ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                      ]"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs">🟠</span>
                      Kutilang
                    </label>
                    <input
                      v-model="td.kutilang"
                      type="number"
                      min="0"
                      placeholder="0"
                      :readonly="!td.editable"
                      :class="[
                        'w-full px-4 py-3 border-2 rounded-lg transition',
                        td.editable 
                          ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                      ]"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">🔴</span>
                      Busuk
                    </label>
                    <input
                      v-model="td.busuk"
                      type="number"
                      min="0"
                      placeholder="0"
                      :readonly="!td.editable"
                      :class="[
                        'w-full px-4 py-3 border-2 rounded-lg transition',
                        td.editable 
                          ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                      ]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activities.length > 0" class="space-y-6">
            <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span class="text-xl">⚙️</span>
                Aktivitas ({{ activities.length }})
              </h2>
              <p class="text-sm text-gray-500">Item dengan border merah bisa diedit, yang abu-abu sudah approved</p>
            </div>

            <div
              v-for="(activity, index) in activities"
              :key="activity.gh_activity_id"
              :class="[
                'rounded-2xl border-2 shadow-sm p-6',
                activity.editable ? 'bg-white border-red-200' : 'bg-gray-50 border-gray-200'
              ]"
            >
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                    {{ index + 1 }}
                  </div>
                  <h3 class="text-lg font-bold text-gray-900">
                    {{ activity.act_name || `Activity ${index + 1}` }}
                  </h3>
                </div>
                <span 
                  :class="[
                    'px-3 py-1 rounded-lg font-bold text-xs border-2',
                    activity.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                    activity.status === 'needRevision' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-yellow-100 text-yellow-800 border-yellow-200'
                  ]"
                >
                  {{ activity.status === 'approved' ? '✅ Approved' : 
                     activity.status === 'needRevision' ? '🔄 Need Revision' : 
                     '⏳ On Review' }}
                </span>
              </div>

              <div v-if="activity.revision_notes && activity.editable" class="mb-4 bg-red-50 border-2 border-red-300 rounded-lg p-3">
                <p class="text-xs text-red-600 font-semibold mb-1">📝 Catatan Revisi:</p>
                <p class="text-sm text-red-900">{{ activity.revision_notes }}</p>
              </div>

              <div v-if="activity.status === 'approved' && activity.approved_at" class="mb-4 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                <p class="text-xs text-green-600 font-semibold mb-1">✅ Sudah Disetujui</p>
                <p class="text-sm text-green-900">By: {{ activity.approved_by }} • {{ formatDateTime(activity.approved_at) }}</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Pilih Activity 
                    <span v-if="activity.editable" class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="activity.master_activity_id"
                    :required="activity.editable"
                    :disabled="!activity.editable"
                    class="w-full px-4 py-3 border-2 rounded-lg transition"
                    :class="activity.editable ? 'border-gray-200 focus:border-[#0071f3] bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'"
                    style="color: #111827 !important; -webkit-text-fill-color: #111827 !important; color-scheme: light !important;"
                  >
                    <option :value="null" style="color: #111827 !important; background-color: #ffffff !important;">
                      {{ activity.act_name || 'Pilih Activity' }}
                    </option>
                    <option
                      v-for="a in filteredActivities"
                      :key="a.activity_id"
                      :value="a.activity_id"
                      style="color: #111827 !important; background-color: #ffffff !important;">
                        {{ a.activity || a.act_name }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Chart of Account (CoA)
                  </label>
                  <input
                    v-model="activity.CoA"
                    type="text"
                    placeholder="Auto-filled"
                    readonly
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-gray-700"
                  />
                </div>
              </div>

              <div class="mb-6 bg-gray-50 rounded-xl p-5">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <span class="text-lg">📦</span>
                  Material
                  <span v-if="!activity.editable" class="ml-auto text-xs text-gray-500 font-normal">(Read Only)</span>
                </h4>
                <div class="space-y-3">
                  <div
                    v-for="(material, matIndex) in activity.materials"
                    :key="matIndex"
                    class="flex flex-col md:flex-row gap-3 items-end bg-white rounded-lg p-4 border border-gray-200"
                  >
                    <div class="flex-1 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                      <select
                        v-model="material.material_id"
                        @change="onMaterialChange(index, matIndex, material.material_id)"
                        :disabled="!activity.editable"
                        :class="[
                          'w-full px-4 py-2.5 border-2 rounded-lg transition',
                          activity.editable 
                            ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white text-gray-900' 
                            : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                        ]"
                      >
                        <option 
                          v-if="!material.material_id" 
                          :value="null" 
                          class="text-gray-900"
                        >
                          {{ material.material_name || 'Pilih Material' }}
                        </option>
                        <option
                          v-for="mat in filteredMaterials"
                          :key="mat.material_id"
                          :value="mat.material_id"
                          :selected="material.material_id === mat.material_id"
                          class="text-gray-900"
                        >
                          {{ mat.material_name }}
                        </option>
                      </select>
                    </div>

                    <div class="w-full md:w-32 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                      <input
                        v-model="material.qty"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        :readonly="!activity.editable"
                        :class="[
                          'w-full px-4 py-2.5 border-2 rounded-lg transition',
                          activity.editable 
                            ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                            : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                        ]"
                      />
                    </div>

                    <div class="w-full md:w-32 flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Unit</label>
                      <input
                        v-model="material.uom"
                        type="text"
                        placeholder="kg"
                        :readonly="!activity.editable"
                        :class="[
                          'w-full px-4 py-2.5 border-2 rounded-lg transition',
                          activity.editable 
                            ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                            : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                        ]"
                      />
                    </div>

                    <button
                      v-if="activity.editable"
                      type="button"
                      @click="removeMaterialRow(index, matIndex)"
                      v-show="activity.materials.length > 1"
                      class="w-full md:w-auto px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition shadow-sm hover:shadow"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <button
                  v-if="activity.editable"
                  type="button"
                  @click="addMaterialRow(index)"
                  class="w-full mt-3 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-4 py-2.5 rounded-lg transition shadow-md hover:shadow-lg text-sm"
                >
                  + Tambah Material
                </button>
              </div>

              <div class="bg-gray-50 rounded-xl p-5">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <span class="text-lg">👷</span>
                  Tenaga Kerja
                  <span v-if="!activity.editable" class="ml-auto text-xs text-gray-500 font-normal">(Read Only)</span>
                </h4>
                <div class="bg-white rounded-lg p-4 border border-gray-200">
                  <div class="flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Jumlah Pekerja</label>
                    <input
                      type="number"
                      v-model="activity.manpower"
                      min="0"
                      placeholder="0"
                      :readonly="!activity.editable"
                      :class="[
                        'w-full px-4 py-2.5 border-2 rounded-lg transition',
                        activity.editable 
                          ? 'border-gray-200 focus:border-[#0071f3] focus:outline-none bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-600'
                      ]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="typeDamages.length === 0 && activities.length === 0" class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
            <div class="flex items-center gap-3">
              <span class="text-3xl">ℹ️</span>
              <div>
                <p class="font-bold text-blue-900">Tidak Ada Item</p>
                <p class="text-sm text-blue-700 mt-1">Laporan ini tidak memiliki data kerusakan atau aktivitas.</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4" v-if="typeDamages.some(td => td.editable) || activities.some(act => act.editable)">
            <button
              type="button"
              @click="handleCancel"
              :disabled="saving"
              class="flex-1 px-6 py-3.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <svg v-if="saving" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ saving ? 'Menyimpan...' : '✅ Simpan Perubahan' }}</span>
            </button>
          </div>

          <div v-else class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
            <div class="flex items-center gap-3">
              <span class="text-3xl">⚠️</span>
              <div>
                <p class="font-bold text-yellow-900">Tidak Ada Item yang Bisa Diedit</p>
                <p class="text-sm text-yellow-700 mt-1">Semua item sudah approved atau sedang direview. Hanya item dengan status "Need Revision" yang bisa diedit.</p>
              </div>
            </div>
            <button
              type="button"
              @click="() => { console.log('🔄 Back button - Redirecting to /planningReportList'); router.replace('/planningReportList'); }"
              class="mt-4 w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition"
            >
              Kembali ke List
            </button>
          </div>
        </form>

        <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mt-6">
          <div class="flex items-start gap-3">
            <span class="text-2xl">💡</span>
            <div class="flex-1">
              <p class="font-bold text-blue-900 mb-2">Panduan Edit</p>
              <ul class="text-sm text-blue-800 space-y-1">
                <li>• <strong>Perbaiki data</strong> sesuai dengan catatan revisi dari admin</li>
                <li>• Hanya item dengan status <strong>"Need Revision"</strong> yang bisa diedit</li>
                <li>• Setelah simpan, status akan berubah menjadi <strong>"On Review"</strong> untuk direview ulang</li>
                <li>• Informasi dasar (Lokasi, Batch, Tanggal) tidak bisa diubah</li>
                <li>• Pastikan semua data sudah benar sebelum menyimpan</li>
              </ul>
            </div>
          </div>
        </div>

      </template>

      <footer class="text-center py-10 mt-8 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-2xl">🌱</span>
          <p class="text-gray-400 font-bold text-sm">GREENHOUSE</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Hapus panah default di input number */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}

select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
  color: #111827 !important;
  background-color: #ffffff !important;
  color-scheme: light !important; /* PAKSA LIGHT MODE */
}

/* Paksa opsi dropdown */
:deep(option) {
  color: #111827 !important;
  background-color: #ffffff !important;
  -webkit-text-fill-color: #111827 !important;
}

/* Fallback untuk browser yang tidak support :deep */
select option {
  color: #111827 !important;
  background: #ffffff !important;
}

@media (max-width: 640px) {
  .ml-13 {
    margin-left: 0;
  }
}
</style>