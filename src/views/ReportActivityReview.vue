<script setup>
// ===========================================
// 1. IMPORTS
// ===========================================
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { supabase } from '../lib/supabase'
import axios from 'axios'

// ===========================================
// 2. OPENBRAVO API CONFIGURATION (Internal)
// ===========================================
const openbravoApi = axios.create({
  baseURL: '/api-ob',
  auth: {
    username: localStorage.getItem('OB_USER'),
    password: localStorage.getItem('OB_KEY'),
  },
  headers: {
    'Content-Type': 'application/json',
  },
})
// ===========================================


// ===========================================
// 3. STORES & ROUTER
// ===========================================
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

// ===========================================
// 4. REFS (STATE)
// ===========================================
const report_id = ref(route.params.report_id || null)
const sourcePage = ref(route.query.from || '/planningReportList')
const approvalProgress = ref([])
const currentUserLevel = ref(null) 
const canApproveCurrentLevel = ref(false)
const loading = ref(true)
const processing = ref(false)
const error = ref(null)
const phaseInfo = ref(null)
const currentReport = ref(null)
const revisionModal = ref({
  show: false,
  type: null,
  itemId: null,
  notes: ''
})
const warehouseInfo = ref({
  warehouse: null,
  bin: null,
  location_name: null
})


// ===========================================
// 5. HELPER FUNCTIONS (UTILITY)
// ===========================================
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

const getTotalMaterialCost = () => {
  if (!currentReport.value?.activities) return 0
  
  return currentReport.value.activities.reduce((sum, activity) => {
    if (!activity.materials) return sum
    const activityTotal = activity.materials.reduce((matSum, mat) => {
      return matSum + (Number(mat.total_price) || 0) 
    }, 0)
    return sum + activityTotal
  }, 0)
}

const formatNumber = (value) => {
  if (!value && value !== 0) return '0'
  return Number(value).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0'
  return 'Rp ' + Number(value).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

const calculateActivityTotal = (materials) => {
  if (!materials || materials.length === 0) return 0
  return materials.reduce((sum, mat) => sum + (Number(mat.total_price) || 0), 0)
}

const getBatchName = (batchId) => {
  const batch = batchStore.batches.find(b => b.batch_id == batchId)
  return batch?.batch_name || `Batch ${batchId}`
}

const getLocationName = (locationId) => {
  const location = locationStore.locations.find(l => l.location_id == locationId)
  return location?.location || `Location ${locationId}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
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

const getStatusBadge = (status) => {
  const badges = {
    'onReview': {
      text: '⏳ Review',
      class: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    'needRevision': {
      text: '🔄 Revision',
      class: 'bg-red-100 text-red-800 border-red-200'
    },
    'approved': {
      text: '✅ Approved',
      class: 'bg-green-100 text-green-800 border-green-200'
    }
  }
  return badges[status || 'onReview'] || badges['onReview']
}


// ===========================================
// 6. OPENBRAVO LOADERS (Dideklarasikan di awal)
// ===========================================

const loadWarehouseAndBin = async (locationId) => {
  try {
    const location = locationStore.locations.find(l => l.location_id == locationId)
    if (!location) {
      console.warn('⚠️ Location not found:', locationId)
      alert('⚠️ Location tidak ditemukan di database!')
      return
    }

    const locationName = location.location
    warehouseInfo.value.location_name = locationName
    
    console.log('🔍 Searching warehouse for location:', locationName)

    const warehouseRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Warehouse',
      { 
        params: { 
          _where: `name='${locationName}'`,
          _selectedProperties: 'id,name,organization,client'
        } 
      }
    )

    const warehouses = warehouseRes?.data?.response?.data || []
    if (!warehouses.length) {
      console.error('❌ Warehouse not found for location:', locationName)
      alert(`❌ Warehouse "${locationName}" tidak ditemukan di Openbravo!`)
      return
    }

    const warehouse = warehouses[0]
    warehouseInfo.value.warehouse = warehouse
    
    if (!warehouse.client && !warehouse.organization?.client) {
      console.error('❌ Client not found in warehouse response!')
      alert('⚠️ Client ID tidak ditemukan di Warehouse. Hubungi admin untuk konfigurasi Openbravo.')
      return
    }

    const binRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Locator',
      { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } }
    )

    const bins = binRes?.data?.response?.data || []
    if (!bins.length) {
      console.warn('⚠️ Bin not found for warehouse:', warehouse.name)
      alert(`⚠️ Storage Bin tidak ditemukan untuk warehouse "${warehouse.name}"`)
      return
    }

    warehouseInfo.value.bin = bins[0]
    console.log('✅ Bin found:', {
      id: bins[0].id,
      name: bins[0].name
    })

  } catch (err) {
    console.error('❌ Error loading warehouse/bin:', err)
    console.error('Error details:', err.response?.data)
    alert('❌ Gagal memuat warehouse/bin dari Openbravo: ' + err.message)
  }
}


// ===========================================
// 7. APPROVAL LOADERS (Dideklarasikan di awal)
// ===========================================

const loadApprovalProgress = async () => {
  if (!currentReport.value?.approval_record_id) {
    console.log('⚠️ No approval record found');
    
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 0, level_name: 'Staff/No Approval Flow', is_final_level: false };
    
    return;
  }

  try {
    console.log('📊 Loading approval progress for record:', currentReport.value.approval_record_id);

    const { data: recordData, error: recordErr } = await supabase
      .from('gh_approve_record')
      .select(`
        current_level_order, 
        overall_status, 
        flow_id,
        gh_approval_flow!inner(
          last_level,
          first_level
        )
      `)
      .eq('record_id', currentReport.value.approval_record_id)
      .single();

    if (recordErr) throw recordErr;

    const currentLevelOrder = recordData?.current_level_order || 1;
    const lastLevel = recordData.gh_approval_flow?.last_level;
    
    const { data: levelStatuses, error: statusErr } = await supabase
      .from('gh_approval_level_status')
      .select(`
        level_status_id,
        level_order,
        level_name,
        status,
        approved_by,
        approved_at,
        revision_notes,
        revision_requested_by,
        revision_requested_at
      `)
      .eq('record_id', currentReport.value.approval_record_id)
      .order('level_order', { ascending: true });

    if (statusErr) throw statusErr;

    const approverIds = [
      ...levelStatuses.map(s => s.approved_by),
      ...levelStatuses.map(s => s.revision_requested_by)
    ].filter(Boolean);

    let approverNames = {};
    if (approverIds.length > 0) {
      const { data: users } = await supabase
        .from('user')
        .select('user_id, username, email')
        .in('user_id', approverIds);
      
      if (users) {
        approverNames = users.reduce((acc, user) => {
          acc[user.user_id] = user.username || user.email;
          return acc;
        }, {});
      }
    }

    approvalProgress.value = levelStatuses.map(level => ({
      ...level,
      approver_name: level.approved_by ? approverNames[level.approved_by] : null,
      revisor_name: level.revision_requested_by ? approverNames[level.revision_requested_by] : null,
      is_final_level: level.level_order === lastLevel,
      level_status: level.status
    }));

    const currentLevelStatus = levelStatuses.find(s => s.level_order === currentLevelOrder);
    
    const { data: userLevel } = await supabase
      .from('gh_user_approval_level')
      .select('level_order, flow_id')
      .eq('user_id', authStore.user.user_id)
      .eq('flow_id', recordData.flow_id)
      .eq('level_order', currentLevelOrder)
      .eq('is_active', true)
      .maybeSingle(); 

    canApproveCurrentLevel.value = 
      !!userLevel && 
      currentLevelStatus?.status === 'pending' &&
      recordData.overall_status === 'onReview';
    
    currentUserLevel.value = {
      level_order: currentLevelOrder,
      level_name: currentLevelStatus?.level_name || `Level ${currentLevelOrder}`,
      is_final_level: currentLevelOrder === lastLevel,
    };
    
    currentReport.value.report_status = recordData.overall_status;
    
  } catch (err) {
    console.error('❌ Error loading approval progress:', err);
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 1, level_name: 'Error/Unknown', is_final_level: false };
  }
};


// ===========================================
// 8. OPENBRAVO PROCESSOR (Dideklarasikan di awal)
// * DENGAN ERROR HANDLING YANG LEBIH DETAIL
// ===========================================

// ===========================================
// 8. OPENBRAVO PROCESSOR (Refactored dari ReportReview lama)
// ===========================================

const createAndProcessMovement = async (materials, activityName) => {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🔄 CREATING INTERNAL CONSUMPTION (MATERIAL USAGE)');
    console.log(`${'='.repeat(60)}`);
    console.log('Activity:', activityName);
    
    if (!warehouseInfo.value.bin || !warehouseInfo.value.warehouse) {
      throw new Error('Warehouse/Bin tidak ditemukan untuk location ini');
    }

    const warehouse = warehouseInfo.value.warehouse;
    const bin = warehouseInfo.value.bin;
    
    const warehouseId = warehouse.id;
    const binId = bin.id; // Ini adalah Locator ID dari gh_location.id_openbravo
    
    // Ambil organization & client dari warehouse
    const orgId = warehouse.organization?.id || warehouse.organization || '96D7D37973EF450383B8ADCFDB666725';
    const clientId = warehouse.client?.id || warehouse.client || '025F309A89714992995442D9CDE13A15';
    
    console.log('Warehouse ID:', warehouseId);
    console.log('Warehouse Name:', warehouse.name);
    console.log('Bin/Locator ID:', binId);
    console.log('Bin/Locator Name:', bin.searchKey || bin.name);
    console.log('Org ID:', orgId);
    console.log('Client ID:', clientId);
    console.log(`${'='.repeat(60)}\n`);

    // STEP 1: Create Internal Consumption header
    console.log('🔄 STEP 1: Creating Internal Consumption header...');
    
    const now = new Date();
    const movementDate = now.toISOString().split('T')[0];
    const consumptionName = `GH-${activityName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}-${Date.now()}`;
    
    const headerPayload = {
      data: [
        {
          _entityName: 'MaterialMgmtInternalConsumption',
          client: clientId,
          organization: orgId,
          name: consumptionName,
          movementDate: movementDate
        }
      ]
    };

    console.log('📤 Header Payload:', JSON.stringify(headerPayload, null, 2));

    const headerRes = await openbravoApi.post(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalConsumption',
      headerPayload
    );

    console.log('📥 Header Response:', JSON.stringify(headerRes?.data, null, 2));
    
    // Check error
    if (headerRes?.data?.response?.status === -1) {
      const obError = headerRes.data.response.error;
      console.error('❌ Openbravo Error:', obError);
      throw new Error(`Openbravo Error: ${obError?.message || JSON.stringify(obError)}`);
    }

    // Get consumption ID dari response
    let consumptionId = null;
    
    if (headerRes?.data?.response?.data?.[0]?.id) {
      consumptionId = headerRes.data.response.data[0].id;
    } else if (headerRes?.data?.data?.[0]?.id) {
      consumptionId = headerRes.data.data[0].id;
    } else if (headerRes?.data?.id) {
      consumptionId = headerRes.data.id;
    }
    
    if (!consumptionId) {
      console.error('❌ No consumption ID in response');
      throw new Error('Gagal mendapatkan Internal Consumption ID');
    }

    console.log(`✅ Internal Consumption created: ${consumptionId}`);

    // STEP 2: Create consumption lines
    console.log('\n🔄 STEP 2: Creating consumption lines...');
    
    let successCount = 0;
    let errors = [];

    for (const material of materials) {
      try {
        console.log(`\n  📦 Processing: ${material.material_name}`);
        
        // Get product
        const productRes = await openbravoApi.get(
          '/org.openbravo.service.json.jsonrest/Product',
          {
            params: {
              _where: `name='${material.material_name}'`,
              _selectedProperties: 'id,name,uOM',
              _startRow: 0,
              _endRow: 1
            }
          }
        );

        const products = productRes?.data?.response?.data || [];
        if (!products.length) {
          errors.push(`${material.material_name}: Product not found`);
          console.error(`    ❌ Product not found`);
          continue;
        }

        const product = products[0];
        let uomId = product.uOM;

        // Get UOM if specified
        if (material.uom) {
          const uomRes = await openbravoApi.get(
            '/org.openbravo.service.json.jsonrest/UOM',
            {
              params: {
                _where: `name='${material.uom}'`,
                _startRow: 0,
                _endRow: 1
              }
            }
          );

          const uoms = uomRes?.data?.response?.data || [];
          if (uoms.length > 0) {
            uomId = uoms[0].id;
          }
        }

        // Check stock dari bin/locator yang sama dengan id_openbravo
        const stockRes = await openbravoApi.get(
          '/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail',
          {
            params: {
              _where: `storageBin='${binId}' AND product='${product.id}'`,
              _selectedProperties: 'quantityOnHand',
              _startRow: 0,
              _endRow: 1
            }
          }
        );

        const stockDetails = stockRes?.data?.response?.data || [];
        const currentStock = stockDetails[0]?.quantityOnHand || 0;

        console.log(`    📊 Stock di Bin/Locator (${bin.searchKey || bin.name}): ${currentStock}, Need: ${material.qty}`);

        if (currentStock < material.qty) {
          errors.push(`${material.material_name}: Insufficient stock (${currentStock}/${material.qty})`);
          console.warn(`    ⚠️ Insufficient stock`);
          continue;
        }

        // Create line
        const linePayload = {
          data: [
            {
              _entityName: 'MaterialMgmtInternalConsumptionLine',
              client: clientId,
              organization: orgId,
              internalConsumption: consumptionId,
              lineNo: (successCount + 1) * 10,
              product: product.id,
              uOM: uomId,
              movementQuantity: material.qty,
              storageBin: binId // Bin/Locator ID dari gh_location.id_openbravo
            }
          ]
        };

        console.log('    📤 Line Payload:', JSON.stringify(linePayload, null, 2));

        const lineRes = await openbravoApi.post(
          '/org.openbravo.service.json.jsonrest/MaterialMgmtInternalConsumptionLine',
          linePayload
        );

        if (lineRes?.data?.response?.status === -1) {
          const lineError = lineRes.data.response.error;
          throw new Error(lineError?.message || 'Failed to create line');
        }

        console.log(`    ✅ Line created`);
        successCount++;

      } catch (err) {
        console.error(`    ❌ Error:`, err.message);
        errors.push(`${material.material_name}: ${err.message}`);
      }
    }

    if (successCount === 0) {
      throw new Error('No materials were added to the consumption');
    }

    console.log(`\n✅ Lines created: ${successCount}/${materials.length}`);

    // STEP 3: Process Internal Consumption via API
    console.log('\n🔄 STEP 3: Processing Internal Consumption...');
    
    const apiUrl = (import.meta.env.VITE_OPENBRAVO_URL || '').trim();
    const apiPort = (import.meta.env.VITE_API_PORT || '').trim();
    const username = (import.meta.env.VITE_API_USER || '').trim();
    const password = (import.meta.env.VITE_API_PASS || '').trim();

    if (!apiUrl || !apiPort || !username || !password) {
      console.warn('⚠️ API credentials not fully configured - skipping process step');
      console.log(`✅ Internal Consumption created but NOT processed: ${consumptionId}`);
      console.log(`${'='.repeat(60)}\n`);
      
      return {
        success: true,
        movementId: consumptionId,
        successCount,
        totalMaterials: materials.length,
        errors: errors.length > 0 ? errors : null,
        warning: 'Internal Consumption created but not processed. Please process manually in Openbravo.'
      };
    }

    const endpoint = `${apiUrl.replace(/\/+$/, '')}:${apiPort}/api/process`;
    const token = btoa(unescape(encodeURIComponent(`${username}:${password}`)));

    const processPayload = {
      ad_process_id: '800131',
      ad_client_id: clientId,
      ad_org_id: orgId,
      data: [{ id: consumptionId }]
    };

    console.log('📤 Process Payload:', JSON.stringify(processPayload, null, 2));

    try {
      const processRes = await axios.post(endpoint, processPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${token}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: false,
        timeout: 30000
      });

      console.log('📥 Process Response:', JSON.stringify(processRes?.data, null, 2));

      const resultObj = processRes?.data?.data?.[0];
      
      if (!resultObj || resultObj.result !== 1) {
        const errorMsg = resultObj?.errormsg || resultObj?.message || 'Process failed';
        console.error('❌ Process error:', errorMsg);
        
        return {
          success: true,
          movementId: consumptionId,
          successCount,
          totalMaterials: materials.length,
          errors: errors.length > 0 ? errors : null,
          warning: `Internal Consumption created but process failed: ${errorMsg}. Please process manually.`
        };
      }

      console.log(`✅ Internal Consumption processed successfully`);
      console.log(`${'='.repeat(60)}\n`);
      
    } catch (processErr) {
      console.error('❌ Process API error:', processErr.message);
      
      return {
        success: true,
        movementId: consumptionId,
        successCount,
        totalMaterials: materials.length,
        errors: errors.length > 0 ? errors : null,
        warning: `Internal Consumption created but process API failed: ${processErr.message}. Please process manually.`
      };
    }

    return {
      success: true,
      movementId: consumptionId,
      successCount,
      totalMaterials: materials.length,
      errors: errors.length > 0 ? errors : null
    };

  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    
    return {
      success: false,
      error: err.message,
      errors: [],
      fullError: err
    };
  }
};


// ===========================================
// 9. LOADER UTAMA (Memanggil fungsi di atasnya)
// ===========================================

const loadData = async () => {
  try {
    loading.value = true;
    
    await Promise.all([
      batchStore.getBatches(),
      locationStore.fetchAll()
    ]);

    const { data: report, error: fetchError } = await supabase
      .from('gh_report')
      .select(`
        *,
        type_damages:gh_type_damage(*),
        activities:gh_activity(
          *,
          materials:gh_material_used(*)
        )
      `)
      .eq('report_id', report_id.value)
      .single();
    
    if (fetchError) throw fetchError;
    if (!report) throw new Error('Laporan tidak ditemukan');

    currentReport.value = report;
    
    if (report.phase_id) {
      phaseInfo.value = await loadPhaseInfo(report.phase_id);
    }
    
    await loadApprovalProgress();
    
    if (report.location_id) {
      await loadWarehouseAndBin(report.location_id);
    }
    
  } catch (err) {
    console.error('❌ Error loading data:', err);
    error.value = err.message;
    alert('❌ Gagal memuat data: ' + err.message);
    router.push(sourcePage.value);
  } finally {
    loading.value = false;
  }
};


// ===========================================
// 10. APPROVAL ACTION (Memanggil fungsi di atasnya)
// ===========================================

const approveCurrentLevel = async () => {
  if (!canApproveCurrentLevel.value) {
    alert('⚠️ Anda tidak memiliki akses untuk approve di level ini');
    return;
  }

  if (!currentUserLevel.value) {
    alert('⚠️ Level approval tidak ditemukan');
    return;
  }

  const levelName = currentUserLevel.value.level_name;
  
  if (!confirm(`✅ Approve report ini untuk level "${levelName}"?\n\nReport akan ${currentUserLevel.value.is_final_level ? 'FULLY APPROVED dan stock material akan dikurangi' : 'dilanjutkan ke level berikutnya'}.`)) {
    return;
  }

  try {
    processing.value = true;
    
    const currentLevelOrder = currentUserLevel.value.level_order;
    const username = authStore.user?.username || authStore.user?.email || 'Admin';
    
    // 1. Update level status
    const { error: updateLevelErr } = await supabase
      .from('gh_approval_level_status')
      .update({ status: 'approved', approved_by: authStore.user.user_id, approved_at: new Date().toISOString() })
      .eq('record_id', currentReport.value.approval_record_id)
      .eq('level_order', currentLevelOrder);

    if (updateLevelErr) throw updateLevelErr;

    // 2. Insert history
    const { data: recordFlowData, error: flowFetchErr } = await supabase
          .from('gh_approve_record')
          .select('flow_id')
          .eq('record_id', currentReport.value.approval_record_id)
          .single();
    if (flowFetchErr) throw flowFetchErr;

    const { error: historyErr } = await supabase
      .from('gh_approval_history')
      .insert({
        record_id: currentReport.value.approval_record_id,
        flow_id: recordFlowData.flow_id,
        user_id: authStore.user.user_id,
        level_order: currentLevelOrder,
        level_name: levelName,
        action: 'approved',
        comment: `Approved by ${username} at level ${levelName}`
      });

    if (historyErr) throw historyErr;

    // 3. Check final level
    const { data: flowData } = await supabase
      .from('gh_approve_record')
      .select(`flow_id, gh_approval_flow!inner(last_level)`)
      .eq('record_id', currentReport.value.approval_record_id)
      .single();

    const isFinalLevel = currentLevelOrder === flowData.gh_approval_flow.last_level;

    // 4. Update approve_record & process Openbravo
    if (isFinalLevel) {
      console.log('🎯 Final level approval - Processing Openbravo movements...');

      // Update approval record status
      const { error: recordErr } = await supabase
        .from('gh_approve_record')
        .update({ overall_status: 'approved', completed_at: new Date().toISOString() })
        .eq('record_id', currentReport.value.approval_record_id);
      if (recordErr) throw recordErr;

      // Update report status
      const { error: reportErr } = await supabase
        .from('gh_report')
        .update({ report_status: 'approved' })
        .eq('report_id', currentReport.value.report_id);
      if (reportErr) throw reportErr;

      // PROCESS OPENBRAVO MOVEMENT
      let movementSuccessCount = 0;
      let movementFailCount = 0;
      const movementErrors = [];

      for (const activity of currentReport.value.activities) {
        if (!activity.materials || activity.materials.length === 0) continue;
        
        try {
          console.log(`🔄 Processing activity: ${activity.act_name}`);
          
          // Panggilan createAndProcessMovement
          const movementResult = await createAndProcessMovement(activity.materials, activity.act_name);

          if (movementResult.success) {
            // ✅ HANYA UPDATE openbravo_movement_id, TANPA status
            const { error: updateActivityErr } = await supabase
              .from('gh_activity')
              .update({ 
                openbravo_movement_id: movementResult.movementId
                // ❌ HAPUS: status: 'approved' (kolom tidak ada di tabel)
              })
              .eq('activity_id', activity.activity_id);

            if (updateActivityErr) {
              console.error(`❌ Failed to update activity ${activity.act_name}:`, updateActivityErr);
              movementErrors.push(`${activity.act_name}: Failed to update activity in database`);
              movementFailCount++;
            } else {
              console.log(`✅ Activity ${activity.act_name} updated successfully with movement ID: ${movementResult.movementId}`);
              movementSuccessCount++;
              
              // Jika ada warning dari movement result, tambahkan ke errors
              if (movementResult.warning) {
                movementErrors.push(`${activity.act_name}: ${movementResult.warning}`);
              }
            }
          } else {
            // Movement creation failed
            console.error(`❌ Movement failed for ${activity.act_name}:`, movementResult.error);
            movementFailCount++;
            
            const errorMsg = movementResult.error || 
                            (movementResult.errors && Array.isArray(movementResult.errors) 
                              ? movementResult.errors.join('; ') 
                              : 'Movement creation failed');
            
            movementErrors.push(`${activity.act_name}: ${errorMsg}`);
          }
        } catch (err) {
          console.error(`❌ Critical error processing ${activity.act_name}:`, err);
          movementFailCount++;
          movementErrors.push(`${activity.act_name}: ${err.message || 'Unknown error'}`);
        }
      }


      let alertMessage = `✅ Report berhasil disetujui di level terakhir!\n\n`;
      alertMessage += `📊 Summary:\n`;
      alertMessage += `✅ Movements created: ${movementSuccessCount}\n`;
      
      if (movementFailCount > 0) {
        alertMessage += `❌ Movements failed: ${movementFailCount}\n\n`;
        alertMessage += `Errors:\n${movementErrors.join('\n')}`;
      }

      alert(alertMessage);

    } else {
      // Increment current_level_order
      const { error: recordErr } = await supabase
        .from('gh_approve_record')
        .update({ current_level_order: currentLevelOrder + 1 })
        .eq('record_id', currentReport.value.approval_record_id);

      if (recordErr) throw recordErr;

      alert(`✅ Report berhasil disetujui untuk level "${levelName}"!\n\nReport akan dilanjutkan ke level berikutnya.`);
    }

    await loadData();
    router.push(sourcePage.value);
    
  } catch (err) {
    console.error('❌ Error approving level:', err);
    alert('❌ Gagal approve: ' + err.message);
  } finally {
    processing.value = false;
  }
};


// ===========================================
// 11. REVISION ACTION (Memanggil fungsi di atasnya)
// ===========================================

const requestRevisionForLevel = async () => {
  if (!canApproveCurrentLevel.value) {
    alert('⚠️ Anda tidak memiliki akses untuk request revision di level ini');
    return;
  }

  if (!revisionModal.value.notes || revisionModal.value.notes.trim().length < 10) {
    alert('⚠️ Catatan revisi minimal 10 karakter');
    return;
  }

  if (!confirm('🔄 Kirim permintaan revisi report?\n\nReport akan dikembalikan ke staff untuk diperbaiki.')) {
    return;
  }

  try {
    processing.value = true;
    
    const currentLevel = currentUserLevel.value;
    if (!currentLevel) throw new Error('Current approval level not found.');
    
    // 1. Update level status jadi 'needRevision'
    const { error: updateLevelErr } = await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'needRevision',
        revision_notes: revisionModal.value.notes,
        revision_requested_by: authStore.user.user_id,
        revision_requested_at: new Date().toISOString()
      })
      .eq('record_id', currentReport.value.approval_record_id)
      .eq('level_order', currentLevel.level_order);

    if (updateLevelErr) throw updateLevelErr;

    // 2. Insert history
    const { data: recordFlowData, error: flowFetchErr } = await supabase
          .from('gh_approve_record')
          .select('flow_id')
          .eq('record_id', currentReport.value.approval_record_id)
          .single();
    if (flowFetchErr) throw flowFetchErr;

    const { error: historyErr } = await supabase
      .from('gh_approval_history')
      .insert({
        record_id: currentReport.value.approval_record_id,
        flow_id: recordFlowData.flow_id,
        user_id: authStore.user.user_id,
        level_order: currentLevel.level_order,
        level_name: currentLevel.level_name,
        action: 'revision_requested',
        comment: revisionModal.value.notes
      });

    if (historyErr) throw historyErr;

    // 3. Update approve_record overall_status
    const { error: recordErr } = await supabase
      .from('gh_approve_record')
      .update({ overall_status: 'needRevision', current_level_order: 1 }) // Reset ke level 1
      .eq('record_id', currentReport.value.approval_record_id);

    if (recordErr) throw recordErr;

    // 4. Reset semua level status kembali ke pending
    const { error: resetErr } = await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'pending', approved_by: null, approved_at: null,
        revision_notes: null, revision_requested_by: null, revision_requested_at: null
      })
      .eq('record_id', currentReport.value.approval_record_id)
      .neq('level_order', currentLevel.level_order); // Kecuali level yang request revision

    if (resetErr) throw resetErr;

    // 5. Update report status
    const { error: reportErr } = await supabase
      .from('gh_report')
      .update({ report_status: 'needRevision' })
      .eq('report_id', currentReport.value.report_id);

    if (reportErr) throw reportErr;
    
    await loadData();
    closeRevisionModal();
    
    alert('✅ Permintaan revisi berhasil dikirim! Status report dikembalikan ke needRevision.');
    router.push(sourcePage.value);
    
  } catch (err) {
    console.error('❌ Error requesting revision:', err);
    alert('❌ Gagal mengirim revisi: ' + err.message);
  } finally {
    processing.value = false;
  }
};


// ===========================================
// 12. MODAL HANDLERS
// ===========================================

const handleRevision = async () => {
  const { type } = revisionModal.value
  
  if (type === 'level') {
    await requestRevisionForLevel();
  } else {
    // Item revision tidak didukung
    alert('⚠️ Item revision tidak tersedia. Gunakan revision report saja.');
    closeRevisionModal();
  }
}

const openRevisionModal = (type, itemId) => {
  if (!canApproveCurrentLevel.value) {
    alert('⚠️ Anda tidak memiliki akses untuk melakukan aksi ini di level saat ini.');
    return;
  }
  
  if (type !== 'level') {
    alert('⚠️ Hanya revision report yang didukung. Gunakan tombol "Request Revision Report".');
    return;
  }

  revisionModal.value = {
    show: true,
    type,
    itemId,
    notes: ''
  }
}

const closeRevisionModal = () => {
  revisionModal.value = {
    show: false,
    type: null,
    itemId: null,
    notes: ''
  }
}


// ===========================================
// 13. ON MOUNTED (Startup)
// ===========================================

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/')
    return
  }

  if (!report_id.value) {
    alert('⚠️ Report ID tidak ditemukan')
    router.push(sourcePage.value)
    return
  }

  await loadData()
})


// ===========================================
// 14. COMPUTED PROPERTIES
// ===========================================

const reportInfo = computed(() => {
  if (!currentReport.value) return null;
  
  const report = currentReport.value;
  let totalTypeDamages = 0;
  let totalActivities = 0;
  
  if (report.type_damages) {
    totalTypeDamages = report.type_damages.length;
  }
  if (report.activities) {
    totalActivities = report.activities.length;
  }
  
  return {
    report_id: report.report_id,
    location_id: report.location_id,
    location_name: getLocationName(report.location_id),
    batch_id: report.batch_id,
    batch_name: getBatchName(report.batch_id),
    report_date: report.report_date,
    report_status: report.report_status,
    phase_id: report.phase_id,
    phase_name: phaseInfo.value || 'Unknown Phase', 
    totalTypeDamages,
    totalActivities,
    current_level_order: currentUserLevel.value?.level_order || 1,
    current_level_name: currentUserLevel.value?.level_name || 'Level 1',
    can_approve: canApproveCurrentLevel.value,
    is_final_level: currentUserLevel.value?.is_final_level || false,
    revision_notes: report.revision_notes,
    revision_requested_by: report.revision_requested_by,
    revision_requested_at: report.revision_requested_at,
    approved_by: report.approved_by,
    approved_at: report.approved_at,
  };
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button
              @click="() => router.push(sourcePage)"
              class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-lg">
                  ⏳
                </span>
                Review Activity Report
              </h1>
              <p class="text-sm text-gray-500 mt-1">Report ID: #{{ report_id }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-600 font-semibold">Memuat data laporan...</p>
        </div>
      </div>

      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <p class="font-bold text-red-900">Terjadi Kesalahan</p>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <template v-else-if="reportInfo && currentReport">
        
        <div class="mb-6">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📍 Lokasi</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo.location_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">🏷️ Batch</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo.batch_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">🌱 Fase</p>
                <p class="text-lg font-bold text-gray-900">{{ reportInfo?.phase_name || '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📅 Tanggal</p>
                <p class="text-lg font-bold text-gray-900">{{ formatDate(reportInfo.report_date) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-semibold mb-1">📊 Status</p>
                <span 
                  :class="getStatusBadge(reportInfo.report_status).class"
                  class="inline-block px-3 py-1 rounded-lg font-bold text-xs border-2"
                >
                  {{ getStatusBadge(reportInfo.report_status).text }}
                </span>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">🌾 Kerusakan Tanaman</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.totalTypeDamages }}</span>
                  <span class="text-sm text-gray-500">items</span>
                </div>
              </div>
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">⚙️ Aktivitas</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.totalActivities }}</span>
                  <span class="text-sm text-gray-500">items</span>
                </div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                <p class="text-sm text-green-600 font-semibold mb-2">💰 Total Material Cost</p>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold text-green-700">
                    {{ formatCurrency(getTotalMaterialCost()) }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="reportInfo.report_status === 'needRevision'" class="mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p class="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                  <span class="text-lg">🔄</span>
                  Catatan Revisi Report
                </p>
                <p class="text-sm text-red-900 whitespace-pre-wrap">
                  {{ approvalProgress.find(p => p.level_status === 'needRevision')?.revision_notes || 'Revisi diminta.' }}
                </p>
                <p class="text-xs text-red-600 mt-2">
                  Requested by: {{ approvalProgress.find(p => p.level_status === 'needRevision')?.revisor_name || 'System' }} 
                  • {{ formatDateTime(approvalProgress.find(p => p.level_status === 'needRevision')?.revision_requested_at) }}
                </p>
              </div>
            </div>

            <div v-if="reportInfo.report_status === 'approved'" class="mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p class="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                  <span class="text-lg">✅</span>
                  Report Fully Approved
                </p>
                <p class="text-sm text-green-900">
                  Approved by: {{ approvalProgress.find(p => p.is_final_level)?.approver_name || 'System' }} 
                  • {{ formatDateTime(approvalProgress.find(p => p.is_final_level)?.approved_at) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="approvalProgress.length > 0" class="mb-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            📊 Approval Progress
          </h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
            <div class="space-y-3">
              <div
                v-for="level in approvalProgress"
                :key="level.level_status_id"
                class="flex items-center gap-4 p-4 rounded-lg"
                :class="{
                  'bg-green-50 border-2 border-green-200': level.level_status === 'approved',
                  'bg-yellow-50 border-2 border-yellow-200': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                  'bg-red-50 border-2 border-red-200': level.level_status === 'needRevision',
                  'bg-gray-50 border-2 border-gray-200': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order,
                }"
              >
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    :class="{
                      'bg-green-500': level.level_status === 'approved',
                      'bg-blue-500': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                      'bg-red-500': level.level_status === 'needRevision',
                      'bg-gray-400': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                    }">
                  {{ level.level_order }}
                </div>

                <div class="flex-1">
                  <p class="font-bold text-gray-900">{{ level.level_name || currentUserLevel?.level_name || `Level ${level.level_order}` }}</p>
                  <p class="text-sm text-gray-600">
                    <span v-if="level.level_status === 'approved'">
                      ✅ Approved by {{ level.approver_name || 'Admin' }}
                    </span>
                    <span v-else-if="level.level_status === 'needRevision'">
                      🔄 Revision requested by {{ level.revisor_name || 'Admin' }}
                    </span>
                    <span v-else-if="level.level_order === currentUserLevel?.level_order">
                      ⏳ Menunggu approval Anda
                    </span>
                    <span v-else>
                      ⏸️ Pending
                    </span>
                  </p>
                  <p v-if="level.approved_at" class="text-xs text-gray-500">
                    {{ formatDateTime(level.approved_at) }}
                  </p>
                   <div v-if="level.revision_notes && level.level_status === 'needRevision'" class="mt-2 bg-red-100 p-2 rounded-lg">
                    <p class="text-xs font-semibold text-red-700">Catatan Revisi:</p>
                    <p class="text-xs text-red-800">{{ level.revision_notes }}</p>
                  </div>
                </div>

                <span
                  class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                  :class="{
                    'bg-green-100 text-green-800 border-green-200': level.status === 'approved',
                    'bg-yellow-100 text-yellow-800 border-yellow-200': level.status === 'pending' && level.level_order === currentUserLevel?.level_order,
                    'bg-red-100 text-red-800 border-red-200': level.status === 'needRevision',
                    'bg-gray-100 text-gray-800 border-gray-200': level.status === 'pending' && level.level_order !== currentUserLevel?.level_order,
                  }">
                  {{ level.status === 'approved' ? '✅ Approved' : level.status === 'needRevision' ? '🔄 Revision' : '⏳ Pending' }}
                </span>
              </div>
            </div>

            <div v-if="canApproveCurrentLevel && currentUserLevel && reportInfo.report_status !== 'approved'" class="mt-6 pt-6 border-t-2 border-gray-100">
              <div class="flex flex-col sm:flex-row gap-3">
                <button
                  @click="approveCurrentLevel"
                  :disabled="processing"
                  class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                  
                >
                  ✅ Approve Level {{ currentUserLevel.level_order }}
                </button>
                <button
                  @click="openRevisionModal('level', null)"
                  :disabled="processing"
                  class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                >
                  🔄 Request Revision Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
          <div class="bg-gradient-to-r from-gray-50 to-white p-5 border-b-2 border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                #
              </div>
              <div>
                <p class="text-sm text-gray-500 font-semibold">Report ID</p>
                <p class="text-lg font-bold text-gray-900">#{{ currentReport.report_id }}</p>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-6">
            
            <div v-if="currentReport.type_damages && currentReport.type_damages.length > 0">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span class="text-2xl">🌾</span>
                Kerusakan Tanaman ({{ currentReport.type_damages.length }})
              </h4>
              <div class="space-y-3">
                <div
                  v-for="damage in currentReport.type_damages"
                  :key="damage.typedamage_id"
                  class="bg-gray-50 rounded-xl p-5 border-2 border-gray-200"
                >
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex-1">
                      <p class="font-bold text-gray-900 text-lg mb-3">{{ damage.type_damage || 'Kerusakan' }}</p> 
                      <div class="grid grid-cols-3 gap-3">
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🟡 Kuning</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.kuning || 0 }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🟠 Kutilang</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.kutilang || 0 }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">🔴 Busuk</p>
                          <p class="text-2xl font-bold text-gray-900">{{ damage.busuk || 0 }}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-2">
                       <span 
                        :class="getStatusBadge(damage.status).class"
                        class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                      >
                        {{ getStatusBadge(damage.status).text }}
                      </span>
                      
                      </div>
                  </div>
                  
                  <div v-if="damage.revision_notes && damage.status === 'needRevision'" class="mt-3 bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p class="text-xs text-red-600 font-semibold mb-1">Revision Notes:</p>
                    <p class="text-sm text-red-900">{{ damage.revision_notes }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="currentReport.activities && currentReport.activities.length > 0">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span class="text-2xl">⚙️</span>
                Aktivitas ({{ currentReport.activities.length }})
              </h4>
              <div class="space-y-4">
                <div
                  v-for="activity in currentReport.activities"
                  :key="activity.activity_id"
                  class="bg-gray-50 rounded-xl p-5 border-2 border-gray-200"
                >
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex-1">
                      <p class="font-bold text-gray-900 text-lg mb-3">{{ activity.act_name }}</p>
                      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">CoA</p>
                          <p class="text-sm font-medium text-gray-900">{{ activity.CoA || '-' }}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3">
                          <p class="text-xs text-gray-500 font-semibold mb-1">👷 Manpower</p>
                          <p class="text-sm font-medium text-gray-900">{{ activity.manpower || 0 }} pekerja</p>
                        </div>
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-200">
                          <p class="text-xs text-green-600 font-semibold mb-1">💰 Material Cost</p>
                          <p class="text-base font-bold text-green-700">
                            {{ formatCurrency(calculateActivityTotal(activity.materials || [])) }}
                          </p>
  </div>
                      </div>

                      <div v-if="activity.materials && activity.materials.length > 0" class="bg-white rounded-lg p-4">
                        <p class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <span class="text-base">📦</span>
                          Materials ({{ activity.materials.length }})
                        </p>
                        
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead>
                              <tr class="border-b-2 border-gray-200">
                                <th class="text-left py-2 px-3 font-semibold text-gray-600">Material</th>
                                <th class="text-right py-2 px-3 font-semibold text-gray-600">Qty</th>
                                <th class="text-right py-2 px-3 font-semibold text-gray-600">UOM</th>
                                <th class="text-right py-2 px-3 font-semibold text-gray-600">Unit Price</th>
                                <th class="text-right py-2 px-3 font-semibold text-gray-600">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="material in activity.materials"
                                :key="material.material_used_id"
                                class="border-b border-gray-100 hover:bg-blue-50 transition"
                              >
                                <td class="py-2 px-3 font-medium text-gray-900">
                                  {{ material.material_name }}
                                </td>
                                <td class="py-2 px-3 text-right font-semibold text-gray-900">
                                  {{ formatNumber(material.qty) }}
                                </td>
                                <td class="py-2 px-3 text-right text-gray-600">
                                  {{ material.uom }}
                                </td>
                                <td class="py-2 px-3 text-right text-gray-700">
                                  {{ formatCurrency(material.unit_price || 0) }}
                                </td>
                                <td class="py-2 px-3 text-right font-bold text-blue-700">
                                  {{ formatCurrency(material.total_price || 0) }}
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr class="border-t-2 border-gray-300 bg-gray-50">
                                <td colspan="4" class="py-3 px-3 text-right font-bold text-gray-700">
                                  Grand Total:
                                </td>
                                <td class="py-3 px-3 text-right font-bold text-green-700 text-base">
                                  {{ formatCurrency(calculateActivityTotal(activity.materials)) }}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-2">
                       <span 
                        :class="getStatusBadge(activity.status).class"
                        class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                      >
                        {{ getStatusBadge(activity.status).text }}
                      </span>
                      
                      </div>
                  </div>

                  <div v-if="activity.openbravo_movement_id && activity.status === 'approved'" class="mt-3 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                    <p class="text-xs text-green-600 font-semibold mb-1">✅ Approved</p>
                    <p class="text-sm text-green-900">Openbravo Document ID: {{ activity.openbravo_movement_id }}</p>
                  </div>
                  
                  <div v-if="activity.revision_notes && activity.status === 'needRevision'" class="mt-3 bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p class="text-xs text-red-600 font-semibold mb-1">Revision Notes:</p>
                    <p class="text-sm text-red-900">{{ activity.revision_notes }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mt-6">
          <div class="flex items-start gap-3">
            <span class="text-2xl">💡</span>
            <div class="flex-1">
              <p class="font-bold text-blue-900 mb-2">Cara Review</p>
              <ul class="text-sm text-blue-800 space-y-1">
                <li>• **Review Items:** Periksa semua kerusakan tanaman dan aktivitas yang dilaporkan di bawah ini.</li>
                <li>• **Level Approval:** Klik tombol "**Approve Level**" untuk menyetujui seluruh report di level Anda dan melanjutkannya ke level berikutnya.</li>
                <li>• **Request Revision:** Jika ada yang tidak sesuai, gunakan tombol "**Request Revision Report**" untuk mengembalikan report ke staff dan mereset status approval.</li>
                <li>• **Material Stock:** Pengurangan stock material (Openbravo Movement) akan diproses oleh sistem setelah report disetujui di level terakhir.</li>
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

    <div v-if="revisionModal.show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span class="text-2xl">🔄</span>
            Request Revision
          </h3>
          <button 
            @click="closeRevisionModal" 
            class="text-gray-400 hover:text-gray-600 transition"
            :disabled="processing"
          >
            <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
            </svg>
          </button>
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Item Type
          </label>
          <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
            📋 Seluruh Report (Level {{ currentUserLevel?.level_order }})
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Catatan Revisi <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="revisionModal.notes"
            rows="6"
            placeholder="Tuliskan dengan jelas apa yang perlu diperbaiki...&#10;&#10;Contoh:&#10;- Data kuning di Type Damage 1 perlu diverifikasi ulang&#10;- Quantity material A di Aktivitas 'Penyemprotan' terlalu banyak. Cek kembali"
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0071f3] focus:outline-none transition resize-none"
            :disabled="processing"
          ></textarea>
          <p class="text-xs text-gray-500 mt-2">
            Minimal 10 karakter. Berikan penjelasan yang detail.
          </p>
          <div class="mt-3 flex items-center gap-2 text-sm">
            <span class="font-semibold" :class="revisionModal.notes.trim().length < 10 ? 'text-red-600' : 'text-green-600'">
              {{ revisionModal.notes.trim().length }} / 10
            </span>
            <span class="text-gray-500">karakter</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="closeRevisionModal"
            :disabled="processing"
            class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            @click="handleRevision"
            :disabled="!revisionModal.notes.trim() || revisionModal.notes.trim().length < 10 || processing"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="processing" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ processing ? 'Mengirim...' : 'Kirim Revisi' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>