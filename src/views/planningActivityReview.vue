<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { supabase } from '../lib/supabase'
import openbravoApi from '@/lib/openbravo'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

const report_id = ref(route.params.report_id || null)
const sourcePage = ref(route.query.from || '/planningReportList')

// State untuk approval
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
  notes: ''
})

const warehouseInfo = ref({
  warehouse: null,
  bin: null,
  location_name: null
})

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

// Helper: Get all materials from all activities for Openbravo
const getAllMaterialsForMovement = computed(() => {
  if (!currentReport.value?.activities) return [];

  return currentReport.value.activities.reduce((allMaterials, activity) => {
    if (activity.materials && activity.materials.length > 0) {
      activity.materials.forEach(mat => {
        allMaterials.push({
          material_name: mat.material_name,
          qty: parseFloat(mat.qty) || 0,
          uom: mat.uom,
          unit_price: parseFloat(mat.unit_price) || 0,
          total_price: parseFloat(mat.total_price) || 0,
          activity_name: activity.act_name
        });
      });
    }
    return allMaterials;
  }, []);
});

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

const reportTotalCost = computed(() => {
  if (!currentReport.value?.activities) return 0
  
  return currentReport.value.activities.reduce((sum, activity) => {
    const activityTotal = calculateActivityTotal(activity.materials || [])
    return sum + activityTotal
  }, 0)
})

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
        type_damages:gh_type_damage(typedamage_id, report_id, type_damage, kuning, kutilang, busuk),
        activities:gh_activity(
          activity_id, report_id, act_name, CoA, manpower, openbravo_movement_id,
          materials:gh_material_used(*)
        )
      `)
      .eq('report_id', report_id.value)
      .single();
    
    if (fetchError) throw fetchError;
    if (!report) throw new Error('Laporan tidak ditemukan');

    currentReport.value = report;
    console.log('✅ Loaded report:', report);
    
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

const loadWarehouseAndBin = async (locationId) => {
  try {
    const location = locationStore.locations.find(l => l.location_id == locationId)
    if (!location) {
      console.warn('⚠️ Location not found:', locationId)
      return
    }

    const locationName = location.location
    warehouseInfo.value.location_name = locationName
    
    console.log('🏢 Loading warehouse for location:', locationName)

    const warehouseRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Warehouse',
      { params: { _where: `name='${locationName}'` } }
    )

    const warehouses = warehouseRes?.data?.response?.data || []
    if (!warehouses.length) {
      console.warn('⚠️ Warehouse not found for location:', locationName)
      return
    }

    const warehouse = warehouses[0]
    warehouseInfo.value.warehouse = warehouse
    console.log('✅ Warehouse found:', warehouse.name)

    const binRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Locator',
      { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } }
    )

    const bins = binRes?.data?.response?.data || []
    if (!bins.length) {
      console.warn('⚠️ Bin not found for warehouse:', warehouse.name)
      return
    }

    warehouseInfo.value.bin = bins[0]
    console.log('✅ Bin found:', bins[0].name)

  } catch (err) {
    console.error('❌ Error loading warehouse/bin:', err)
  }
}

// ✅ CREATE INTERNAL CONSUMPTION (MOVEMENT) DI OPENBRAVO
const createInternalConsumption = async (materials) => {
  if (!materials || materials.length === 0) {
    console.log('ℹ️ No materials to process');
    return { success: true, movementId: 'NO_MATERIALS', successCount: 0, totalMaterials: 0 };
  }

  if (!warehouseInfo.value.warehouse || !warehouseInfo.value.bin) {
    throw new Error('Warehouse/Bin information not available');
  }

  try {
    console.log(`📤 Creating Internal Consumption for ${materials.length} materials...`);
    
    const warehouse = warehouseInfo.value.warehouse;
    const bin = warehouseInfo.value.bin;
    const documentNo = `IC-${currentReport.value.report_id}-${Date.now()}`;
    
    // 1. Get Organization
    const orgRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Organization',
      { params: { _where: `name='${warehouse.organization$_identifier}'` } }
    );
    const org = orgRes?.data?.response?.data?.[0];
    if (!org) throw new Error('Organization not found');

    console.log('✅ Organization found:', org.name);

    // 2. Create Movement Header
    const movementHeader = {
      organization: org.id,
      client: org.client,
      warehouse: warehouse.id,
      movementType: 'M-',
      movementDate: new Date().toISOString().split('T')[0],
      documentNo: documentNo,
      description: `Internal Consumption for Report #${currentReport.value.report_id}`,
      posted: 'N'
    };

    const headerResponse = await openbravoApi.post(
      '/org.openbravo.service.json.jsonrest/MaterialMgmtMaterialMovement',
      { data: movementHeader }
    );

    const movementId = headerResponse?.data?.response?.data?.[0]?.id;
    if (!movementId) throw new Error('Failed to create movement header');

    console.log(`✅ Movement header created: ${movementId}`);

    // 3. Get all products in one request (optimization)
    const productRes = await openbravoApi.get(
      '/org.openbravo.service.json.jsonrest/Product',
      {
        params: {
          _selectedProperties: 'id,_identifier,name',
          _maxResults: 1000
        }
      }
    );

    const allProducts = productRes?.data?.response?.data || [];
    console.log(`📦 Loaded ${allProducts.length} products from Openbravo`);

    // 4. Create Movement Lines
    let successCount = 0;
    const errors = [];

    for (const mat of materials) {
      try {
        // Find product by material name (case-insensitive, trimmed)
        const product = allProducts.find(p => 
          p._identifier?.toLowerCase().trim() === mat.material_name?.toLowerCase().trim() ||
          p.name?.toLowerCase().trim() === mat.material_name?.toLowerCase().trim()
        );

        if (!product) {
          console.warn(`⚠️ Product not found in Openbravo: ${mat.material_name}`);
          errors.push(`Product not found: ${mat.material_name}`);
          continue;
        }

        // Create movement line with negative quantity for consumption
        const lineData = {
          organization: org.id,
          client: org.client,
          movement: movementId,
          product: product.id,
          movementQuantity: -Math.abs(parseFloat(mat.qty)), // Negative for consumption
          uOM: mat.uom || 'EA',
          storageBin: bin.id,
          description: `${mat.material_name} for ${mat.activity_name || 'Activity'}`
        };

        await openbravoApi.post(
          '/org.openbravo.service.json.jsonrest/MaterialMgmtMovementLine',
          { data: lineData }
        );

        successCount++;
        console.log(`✅ Line created for: ${mat.material_name} (${mat.qty} ${mat.uom})`);
        
      } catch (lineErr) {
        console.error(`❌ Failed to create line for ${mat.material_name}:`, lineErr);
        errors.push(`${mat.material_name}: ${lineErr.message}`);
      }
    }

    console.log(`📊 Created ${successCount}/${materials.length} movement lines`);

    // 5. Process/Post Movement
    if (successCount > 0) {
      try {
        await openbravoApi.post(
          `/org.openbravo.service.json.jsonrest/MaterialMgmtMaterialMovement/${movementId}/process`,
          {}
        );
        console.log('✅ Movement processed (posted) successfully');
      } catch (processErr) {
        console.warn('⚠️ Movement created but failed to process (post):', processErr.message);
        // Don't throw - movement is created, just not posted
      }
    }

    return {
      success: successCount > 0,
      movementId: documentNo,
      successCount,
      totalMaterials: materials.length,
      errors: errors.length > 0 ? errors.join('; ') : null
    };

  } catch (err) {
    console.error('❌ Error creating internal consumption:', err);
    return {
      success: false,
      movementId: null,
      successCount: 0,
      totalMaterials: materials.length,
      errors: err.message
    };
  }
};

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

    const { data: userLevel } = await supabase
      .from('gh_user_approval_level')
      .select('level_order, flow_id')
      .eq('user_id', authStore.user.user_id)
      .eq('flow_id', recordData.flow_id)
      .eq('level_order', currentLevelOrder)
      .eq('is_active', true)
      .maybeSingle();

    const currentLevelStatus = levelStatuses.find(s => s.level_order === currentLevelOrder);
    
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
    
    console.log('🔐 Can approve current level:', canApproveCurrentLevel.value);
    console.log('📍 Current level:', currentUserLevel.value);
    
  } catch (err) {
    console.error('❌ Error loading approval progress:', err);
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 1, level_name: 'Error/Unknown', is_final_level: false };
  }
};

// Helper functions
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

const reportInfo = computed(() => {
  if (!currentReport.value) return null;
  
  const report = currentReport.value;
  
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
    totalTypeDamages: report.type_damages?.length || 0,
    totalActivities: report.activities?.length || 0,
    current_level_order: currentUserLevel.value?.level_order || 1,
    current_level_name: currentUserLevel.value?.level_name || 'Level 1',
    can_approve: canApproveCurrentLevel.value,
    is_final_level: currentUserLevel.value?.is_final_level || false,
  };
});

// ✅ APPROVE CURRENT LEVEL - Satu tombol untuk semua
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
  const isFinalLevel = currentUserLevel.value.is_final_level;
  
  if (!confirm(`✅ Approve report ini untuk level "${levelName}"?\n\n${isFinalLevel ? '⚠️ FINAL LEVEL: Stok material akan dikurangi di Openbravo!' : 'Report akan dilanjutkan ke level berikutnya.'}`)) {
    return;
  }

  try {
    processing.value = true;
    
    const currentLevelOrder = currentUserLevel.value.level_order;
    const username = authStore.user?.username || authStore.user?.email || 'Admin';
    let movementResult = { success: true, movementId: 'N/A' };

    // ✅ PENGURANGAN STOK HANYA DI FINAL LEVEL
    // Di dalam approveCurrentLevel, bagian FINAL LEVEL:
    if (isFinalLevel) {
        console.log('🔄 FINAL LEVEL: Processing stock reduction...');
        
        // Validasi warehouse/bin
        if (!warehouseInfo.value.warehouse || !warehouseInfo.value.bin) {
            throw new Error('❌ Informasi Warehouse/Bin Openbravo tidak lengkap. Tidak dapat mengurangi stok.');
        }

        const materials = getAllMaterialsForMovement.value;
        
        if (materials.length > 0) {
            console.log(`📦 Processing ${materials.length} materials for stock reduction...`);
            
            movementResult = await createInternalConsumption(materials);

            if (!movementResult.success) {
                // Jangan lempar error langsung, beri pilihan
                const confirmProceed = confirm(
                    `⚠️ Gagal memproses sebagian/semua material di Openbravo:\n\n${movementResult.errors}\n\n` +
                    `Berhasil: ${movementResult.successCount}/${movementResult.totalMaterials}\n\n` +
                    `Tetap lanjutkan approval?`
                );
                
                if (!confirmProceed) {
                    throw new Error('Approval dibatalkan oleh user');
                }
            } else {
                console.log(`✅ Internal Consumption created: ${movementResult.movementId}`);
            }
            
            // Update Openbravo Document ID di semua aktivitas
            if (movementResult.movementId && movementResult.movementId !== 'NO_MATERIALS') {
                const { error: updateActErr } = await supabase
                    .from('gh_activity')
                    .update({ openbravo_movement_id: movementResult.movementId })
                    .eq('report_id', currentReport.value.report_id);
                
                if (updateActErr) {
                    console.error('❌ Failed to update openbravo_movement_id:', updateActErr);
                } else {
                    console.log('✅ Updated openbravo_movement_id for all activities');
                }
            }
        } else {
            console.log('ℹ️ No materials to process in final level');
        }
    }

    // 2. Update level status jadi 'approved'
    const { error: updateLevelErr } = await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'approved',
        approved_by: authStore.user.user_id,
        approved_at: new Date().toISOString()
      })
      .eq('record_id', currentReport.value.approval_record_id)
      .eq('level_order', currentLevelOrder);

    if (updateLevelErr) throw updateLevelErr;

    // 3. Insert history
    const { data: flowDataHistory } = await supabase
      .from('gh_approve_record')
      .select('flow_id')
      .eq('record_id', currentReport.value.approval_record_id)
      .single();
    
    const { error: historyErr } = await supabase
      .from('gh_approval_history')
      .insert({
        record_id: currentReport.value.approval_record_id,
        flow_id: flowDataHistory.flow_id,
        user_id: authStore.user.user_id,
        level_order: currentLevelOrder,
        level_name: levelName,
        action: 'approved',
        comment: `Approved by ${username} at level ${levelName}`
      });

    if (historyErr) throw historyErr;

    // 4. Update approve_record
    if (isFinalLevel) {
      const { error: recordErr } = await supabase
        .from('gh_approve_record')
        .update({
          overall_status: 'approved',
          completed_at: new Date().toISOString()
        })
        .eq('record_id', currentReport.value.approval_record_id);

      if (recordErr) throw recordErr;

      const { error: reportErr } = await supabase
        .from('gh_report')
        .update({ report_status: 'approved' })
        .eq('report_id', currentReport.value.report_id);

      if (reportErr) throw reportErr;

    } else {
      const { error: recordErr } = await supabase
        .from('gh_approve_record')
        .update({
          current_level_order: currentLevelOrder + 1
        })
        .eq('record_id', currentReport.value.approval_record_id);

      if (recordErr) throw recordErr;
    }

    console.log('✅ Level approved');

    await loadData();

    if (isFinalLevel) {
      alert(`✅ Report berhasil disetujui di level terakhir!\n\n✅ FULLY APPROVED\n📦 Movement ID: ${movementResult.movementId}\n📊 Materials processed: ${movementResult.successCount}/${movementResult.totalMaterials}`);
    } else {
      alert(`✅ Report berhasil disetujui untuk level "${levelName}"!\n\nReport akan dilanjutkan ke level berikutnya.`);
    }
    
    router.push(sourcePage.value);
    
  } catch (err) {
    console.error('❌ Error approving level:', err);
    alert('❌ Gagal approve: ' + err.message);
  } finally {
    processing.value = false;
  }
};

// ✅ REQUEST REVISION
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
    
    const username = authStore.user?.username || authStore.user?.email || 'Admin';
    
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

    const { data: flowDataHistory } = await supabase
      .from('gh_approve_record')
      .select('flow_id')
      .eq('record_id', currentReport.value.approval_record_id)
      .single();

    const { error: historyErr } = await supabase
      .from('gh_approval_history')
      .insert({
        record_id: currentReport.value.approval_record_id,
        flow_id: flowDataHistory.flow_id,
        user_id: authStore.user.user_id,
        level_order: currentLevel.level_order,
        level_name: currentLevel.level_name,
        action: 'revision_requested',
        comment: revisionModal.value.notes
      });

    if (historyErr) throw historyErr;

    const { error: recordErr } = await supabase
      .from('gh_approve_record')
      .update({
        overall_status: 'needRevision',
        current_level_order: 1
      })
      .eq('record_id', currentReport.value.approval_record_id);

    if (recordErr) throw recordErr;

    const { error: resetErr } = await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'pending',
        approved_by: null,
        approved_at: null,
        revision_notes: null,
        revision_requested_by: null,
        revision_requested_at: null
      })
      .eq('record_id', currentReport.value.approval_record_id)
      .neq('level_order', currentLevel.level_order);

    if (resetErr) throw resetErr;

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

const openRevisionModal = () => {
  if (!canApproveCurrentLevel.value) {
    alert('⚠️ Anda tidak memiliki akses untuk melakukan aksi ini di level saat ini.');
    return;
  }
  
  revisionModal.value = {
    show: true,
    notes: ''
  }
}

const closeRevisionModal = () => {
  revisionModal.value = {
    show: false,
    notes: ''
  }
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
                  <span class="text-sm text-gray-500">item(s)</span>
                </div>
              </div>
              <div class="bg-white rounded-lg p-4">
                <p class="text-sm text-gray-600 font-semibold mb-2">⚙️ Aktivitas</p>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-gray-900">{{ reportInfo.totalActivities }}</span>
                  <span class="text-sm text-gray-500">item(s)</span>
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
                  ✅ Approve Level {{ currentUserLevel.level_order }} ({{ currentUserLevel.is_final_level ? 'Final Approval & Stock' : 'Lanjutkan' }})
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
                        :class="getStatusBadge(currentReport.report_status).class"
                        class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                      >
                        {{ getStatusBadge(currentReport.report_status).text }} (Item)
                      </span>
                      
                      </div>
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
                        :class="getStatusBadge(currentReport.report_status).class"
                        class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap"
                      >
                        {{ getStatusBadge(currentReport.report_status).text }} (Item)
                      </span>
                      
                      </div>
                  </div>

                  <div v-if="activity.openbravo_movement_id" class="mt-3 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                    <p class="text-xs text-green-600 font-semibold mb-1">Openbravo Movement</p>
                    <p class="text-sm text-green-900">Document ID: {{ activity.openbravo_movement_id }}</p>
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
              <p class="font-bold text-blue-900 mb-2">Cara Review (Approval Level)</p>
              <ul class="text-sm text-blue-800 space-y-1">
                <li>• **Approval Global:** Report disetujui per **level** (bukan per item). Setelah tombol "Approve Level" ditekan, report akan lanjut ke level berikutnya.</li>
                <li>• **Pengurangan Stok:** Stok material di Openbravo **hanya akan dikurangi** secara otomatis saat report disetujui di **Level Final** (terakhir).</li>
                <li>• **Revisi:** Gunakan "Request Revision Report" untuk mengembalikan seluruh laporan ke Staff.</li>
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
            <template>
              📋 Seluruh Report (Level {{ currentUserLevel?.level_order }})
            </template>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Catatan Revisi <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="revisionModal.notes"
            rows="6"
            placeholder="Tuliskan dengan jelas apa yang perlu diperbaiki...&#10;&#10;Contoh untuk kerusakan:&#10;- Data kuning perlu diverifikasi ulang&#10;- Jumlah busuk tidak sesuai dengan kondisi aktual"
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