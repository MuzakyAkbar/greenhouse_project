<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { supabase } from '../lib/supabase'
import openbravoApi from '@/lib/openbravo'
import axios from 'axios'
import logoPG from '../assets/logoPG.svg'

// ===========================================
// CONFIG & STORES
// ===========================================
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

const report_id = ref(route.params.report_id || null)
const sourcePage = ref(route.query.from || '/planningReportList')

// ===========================================
// STATE MANAGEMENT
// ===========================================
const approvalHistory = ref([])
const approvalProgress = ref([])
const currentUserLevel = ref(null) 
const canApproveCurrentLevel = ref(false)

const loading = ref(true)
const processing = ref(false)
const error = ref(null)
const phaseInfo = ref(null)
const currentReport = ref(null)

// Warehouse Info
const warehouseInfo = ref({
  warehouse: null,
  bin: null,
  location_name: null
})

// Revision Modal
const revisionModal = ref({
  show: false,
  type: null,
  itemId: null,
  notes: ''
})

// Environment Log State
const envLogData = ref(null)
const sessionLabels = {
  morning: { label: 'Pagi', icon: '🌅', colorClass: 'text-orange-700 bg-orange-50 border-orange-200' },
  noon: { label: 'Siang', icon: '☀️', colorClass: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  afternoon: { label: 'Sore', icon: '🌥️', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  night: { label: 'Malam', icon: '🌙', colorClass: 'text-slate-700 bg-slate-50 border-slate-200' }
}
const paramLabels = {
  temp: { label: 'Suhu', unit: '°C' },
  humid: { label: 'Kelembapan', unit: '%' },
  co2: { label: 'CO2', unit: 'PPM' }
}

// Image Preview State
const imagePreview = ref({
  show: false,
  images: [],
  currentIndex: 0,
  title: ''
})

// ===========================================
// HELPER FUNCTIONS (UTILITY)
// ===========================================

const formatNumber = (value) => {
  if (!value && value !== 0) return '0'
  return Number(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0'
  return 'Rp ' + Number(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
const formatDateTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

const getBatchName = (batchId) => batchStore.batches.find(b => b.batch_id == batchId)?.batch_name || `Batch ${batchId}`
const getLocationName = (locationId) => locationStore.locations.find(l => l.location_id == locationId)?.location || `Location ${locationId}`

const getStatusBadge = (status) => {
  const badges = {
    'onReview': { text: '⏳ Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'needRevision': { text: '🔄 Revision', class: 'bg-red-100 text-red-800 border-red-200' },
    'approved': { text: '✅ Approved', class: 'bg-green-100 text-green-800 border-green-200' },
    'rejected': { text: '❌ Rejected', class: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
  return badges[status || 'onReview'] || badges['onReview']
}

// --- Image Utils ---
const openImagePreview = (images, title, startIndex = 0) => {
  if (!images || images.length === 0) return
  imagePreview.value = {
    show: true,
    images: images,
    currentIndex: startIndex,
    title: title || 'Image Detail'
  }
  document.body.style.overflow = 'hidden'
}

const openEnvImagePreview = (imageUrl, title) => {
  if (!imageUrl) return
  openImagePreview([{ url: imageUrl }], title, 0)
}

const closeImagePreview = () => {
  imagePreview.value = { show: false, images: [], currentIndex: 0, title: '' }
  document.body.style.overflow = 'auto'
}

const nextImage = () => {
  if (imagePreview.value.currentIndex < imagePreview.value.images.length - 1) {
    imagePreview.value.currentIndex++
  } else {
    imagePreview.value.currentIndex = 0
  }
}

const prevImage = () => {
  if (imagePreview.value.currentIndex > 0) {
    imagePreview.value.currentIndex--
  } else {
    imagePreview.value.currentIndex = imagePreview.value.images.length - 1
  }
}

const getImageUrl = (imageData) => {
  if (typeof imageData === 'string') return imageData
  return imageData?.url || imageData?.supabaseUrl || ''
}

const downloadCurrentImage = async () => {
  const currentImgData = imagePreview.value.images[imagePreview.value.currentIndex]
  const url = getImageUrl(currentImgData)
  let rawTitle = imagePreview.value.title || 'evidence'
  const safeTitle = rawTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const fileName = `gh-evidence-${safeTitle}-${imagePreview.value.currentIndex + 1}.jpg`

  try {
    const response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-cache' })
    if (!response.ok) throw new Error('Network response was not ok')
    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  } catch (err) {
    window.open(url, '_blank')
  }
}

const handleKeydown = (e) => {
  if (!imagePreview.value.show) return
  if (e.key === 'Escape') closeImagePreview()
  if (e.key === 'ArrowRight') nextImage()
  if (e.key === 'ArrowLeft') prevImage()
}

// --- Calculation Utils ---
const calculateActivityTotal = (materials) => {
  if (!materials || materials.length === 0) return 0
  return materials.reduce((sum, mat) => sum + (Number(mat.total_price) || 0), 0)
}

const loadPhaseInfo = async (phaseId) => {
  if (!phaseId) return null;
  try {
    const { data, error } = await supabase.from('gh_phase').select('phase_name').eq('phase_id', phaseId).single();
    if (error) throw error;
    return data?.phase_name || 'Unknown Phase';
  } catch (err) { return 'Unknown Phase'; }
};

// ===========================================
// DATA LOADERS
// ===========================================

const loadEnvironmentLog = async (locationId, dateStr) => {
  try {
    const { data } = await supabase.from('gh_environment_log')
      .select('*')
      .eq('location_id', locationId)
      .eq('log_date', dateStr)
      .maybeSingle()
    envLogData.value = data
  } catch (err) {
    console.error('Error fetching environment log:', err)
  }
}

const loadWarehouseAndBin = async (locationId) => {
  try {
    const location = locationStore.locations.find(l => l.location_id == locationId)
    if (!location) return
    const locationName = location.location
    warehouseInfo.value.location_name = locationName
    
    const warehouseRes = await openbravoApi.get('/Warehouse', { params: { _where: `name='${locationName}'` } })
    const warehouses = warehouseRes?.data?.response?.data || []
    if (!warehouses.length) return
    const warehouse = warehouses[0]
    warehouseInfo.value.warehouse = warehouse
    
    const binRes = await openbravoApi.get('/Locator', { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } })
    const bins = binRes?.data?.response?.data || []
    if (!bins.length) return
    warehouseInfo.value.bin = bins[0]
  } catch (err) { console.error('❌ Error loading warehouse/bin:', err) }
}

const loadApprovalProgress = async () => {
  if (!currentReport.value?.approval_record_id) {
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 0, level_name: 'Staff/No Approval Flow', is_final_level: false };
    return;
  }
  try {
    const { data: recordData, error: recordErr } = await supabase
      .from('gh_approve_record')
      .select(`current_level_order, overall_status, flow_id, gh_approval_flow!inner(last_level, first_level)`)
      .eq('record_id', currentReport.value.approval_record_id)
      .single();
    if (recordErr) throw recordErr;

    const currentLevelOrder = recordData?.current_level_order || 1;
    const lastLevel = recordData.gh_approval_flow?.last_level;
    
    const { data: levelStatuses, error: statusErr } = await supabase
      .from('gh_approval_level_status')
      .select(`level_status_id, level_order, level_name, status, approved_by, approved_at, revision_notes, revision_requested_by, revision_requested_at`)
      .eq('record_id', currentReport.value.approval_record_id)
      .order('level_order', { ascending: true });
    if (statusErr) throw statusErr;

    const approverIds = [...levelStatuses.map(s => s.approved_by), ...levelStatuses.map(s => s.revision_requested_by)].filter(Boolean);
    let approverNames = {};
    if (approverIds.length > 0) {
      const { data: users } = await supabase.from('user').select('user_id, username, email').in('user_id', approverIds);
      if (users) { approverNames = users.reduce((acc, user) => { acc[user.user_id] = user.username || user.email; return acc; }, {}); }
    }

    approvalProgress.value = levelStatuses.map(level => ({
      ...level,
      approver_name: level.approved_by ? approverNames[level.approved_by] : null,
      revisor_name: level.revision_requested_by ? approverNames[level.revision_requested_by] : null,
      is_final_level: level.level_order === lastLevel,
      level_status: level.status
    }));

    const currentLevelStatus = levelStatuses.find(s => s.level_order === currentLevelOrder);
    const { data: userLevel } = await supabase.from('gh_user_approval_level')
      .select('level_order, flow_id')
      .eq('user_id', authStore.user.user_id)
      .eq('flow_id', recordData.flow_id)
      .eq('level_order', currentLevelOrder)
      .eq('is_active', true)
      .maybeSingle(); 

    canApproveCurrentLevel.value = !!userLevel && currentLevelStatus?.status === 'pending' && recordData.overall_status === 'onReview';
    currentUserLevel.value = { level_order: currentLevelOrder, level_name: currentLevelStatus?.level_name || `Level ${currentLevelOrder}`, is_final_level: currentLevelOrder === lastLevel };
    currentReport.value.report_status = recordData.overall_status;
    
  } catch (err) {
    canApproveCurrentLevel.value = false;
    currentUserLevel.value = { level_order: 1, level_name: 'Error', is_final_level: false };
  }
};

const loadApprovalHistory = async () => {
  if (!currentReport.value?.approval_record_id) {
    approvalHistory.value = [];
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('gh_approval_history')
      .select('*')
      .eq('record_id', currentReport.value.approval_record_id)
      .order('action_at', { ascending: true });
    
    if (error) throw error;
    
    const userIds = [...new Set(data.map(h => h.user_id).filter(Boolean))];
    let userNames = {};
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('user')
        .select('user_id, username, email')
        .in('user_id', userIds);
      
      if (users) {
        userNames = users.reduce((acc, user) => {
          acc[user.user_id] = user.username || user.email;
          return acc;
        }, {});
      }
    }
    
    approvalHistory.value = data.map(h => ({
      ...h,
      user_name: h.user_id ? (userNames[h.user_id] || 'Unknown') : 'System'
    }));
    
  } catch (err) {
    console.error('❌ Error loading approval history:', err);
    approvalHistory.value = [];
  }
};

const loadData = async () => {
  try {
    loading.value = true;
    await Promise.all([batchStore.getBatches(), locationStore.fetchAll()]);

    const { data: report, error: fetchError } = await supabase
      .from('gh_report')
      .select(`*, type_damages:gh_type_damage(*), activities:gh_activity(*, materials:gh_material_used(*))`)
      .eq('report_id', report_id.value)
      .single();
    
    if (fetchError) throw fetchError;
    if (!report) throw new Error('Laporan tidak ditemukan');

    currentReport.value = report;
    if (report.phase_id) phaseInfo.value = await loadPhaseInfo(report.phase_id);
    
    await loadApprovalProgress();
    await loadApprovalHistory();
    
    if (report.location_id && report.report_date) {
      await loadEnvironmentLog(report.location_id, report.report_date)
    }

    if (report.location_id) await loadWarehouseAndBin(report.location_id);
    
  } catch (err) {
    error.value = err.message;
    alert('❌ Gagal memuat data: ' + err.message);
    router.push(sourcePage.value);
  } finally {
    loading.value = false;
  }
};

// ===========================================
// API PROCESSING LOGIC (FIXED FOR 415)
// ===========================================

const createAndProcessMovement = async (materials, activityName) => {
  // 1. Validasi Awal
  if (!materials || materials.length === 0) {
    return { success: false, errors: 'No materials provided' };
  }
  
  const obUser = localStorage.getItem('OB_USER');
  const obKey = localStorage.getItem('OB_KEY');
  
  if (!obUser || !obKey) {
    return { success: false, errors: 'Kredensial Openbravo hilang. Silakan Logout & Login ulang.' };
  }

  if (!warehouseInfo.value.bin || !warehouseInfo.value.warehouse) {
    return { success: false, errors: 'Warehouse/Bin tidak ditemukan untuk location ini' };
  }

  const warehouse = warehouseInfo.value.warehouse;
  const bin = warehouseInfo.value.bin;
  const warehouseId = warehouse.id;
  const binId = bin.id; 
  
  const DEFAULT_CLIENT_ID = '025F309A89714992995442D9CDE13A15';
  const DEFAULT_ORG_ID = '96D7D37973EF450383B8ADCFDB666725';

  const orgId = warehouse.organization?.id || warehouse.organization || DEFAULT_ORG_ID;
  const clientId = warehouse.client?.id || warehouse.client || DEFAULT_CLIENT_ID;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 CREATING INTERNAL CONSUMPTION`);
  console.log(`${'='.repeat(60)}`);

  try {
    // ============================================
    // STEP 1: CREATE HEADER (Masih pakai helper openbravoApi karena ini endpoint standar)
    // ============================================
    console.log('🔄 STEP 1: Creating Header...');
    
    const now = new Date();
    const movementDate = now.toISOString().split('T')[0];
    const consumptionName = `GH-${activityName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}-${Date.now()}`;
    
    const consumptionPayload = {
      data: [{
        _entityName: 'MaterialMgmtInternalConsumption',
        organization: orgId,
        client: clientId,
        warehouse: warehouseId,
        movementDate: movementDate,
        name: consumptionName,
        description: `Auto: ${activityName}`
      }]
    };

    const createRes = await openbravoApi.post('/MaterialMgmtInternalConsumption', consumptionPayload);

    if (createRes.data.response && createRes.data.response.status !== 0) {
      throw new Error(`Openbravo Reject: ${createRes.data.response.error?.message}`);
    }

    let consumptionId = null;
    if (createRes.data && createRes.data.id) {
      consumptionId = createRes.data.id;
    } else if (createRes.data.response?.data?.[0]?.id) {
      consumptionId = createRes.data.response.data[0].id;
    }

    if (!consumptionId) throw new Error('Gagal mendapatkan ID Header');
    console.log(`✅ Header Created: ${consumptionId}`);


    // ============================================
    // STEP 2: CREATE LINES (Masih pakai helper)
    // ============================================
    console.log('\n🔄 STEP 2: Creating Lines...');
    
    let successCount = 0;
    const errors = [];

    for (const material of materials) {
      try {
        const escapedName = material.material_name.replace(/'/g, "''");
        const prodRes = await openbravoApi.get(`/Product`, { 
          params: { _where: `name='${escapedName}'`, _selectedProperties: 'id,name,uOM', _startRow: 0, _endRow: 1 } 
        });
        
        const products = prodRes.data.response?.data || [];
        if (!products.length) {
          errors.push(`Produk '${material.material_name}' tidak ditemukan`);
          continue;
        }

        const product = products[0];
        let uomId = product.uOM?.id || product.uOM;

        if (material.uom) {
          const uomRes = await openbravoApi.get(`/UOM`, { params: { _where: `name='${material.uom}'`, _startRow: 0, _endRow: 1 } });
          const uoms = uomRes?.data?.response?.data || [];
          if (uoms.length > 0) uomId = uoms[0].id;
        }

        // Check Stock
        const stockRes = await openbravoApi.get(`/MaterialMgmtStorageDetail`, {
          params: { _where: `storageBin='${binId}' AND product='${product.id}'`, _selectedProperties: 'quantityOnHand', _startRow: 0, _endRow: 1 }
        });

        const stockDetails = stockRes?.data?.response?.data || [];
        const currentStock = stockDetails[0]?.quantityOnHand || 0;
        const qty = Math.abs(Number(material.qty) || 0);

        if (currentStock < qty) {
          errors.push(`${material.material_name}: Stok kurang (${currentStock}/${qty})`);
          continue;
        }

        const linePayload = {
          data: [{
            _entityName: 'MaterialMgmtInternalConsumptionLine',
            organization: orgId,
            client: clientId,
            internalConsumption: consumptionId,
            lineNo: (successCount + 1) * 10,
            product: product.id,
            uOM: uomId,
            movementQuantity: qty,
            storageBin: binId
          }]
        };

        const lineRes = await openbravoApi.post(`/MaterialMgmtInternalConsumptionLine`, linePayload);
        if (lineRes?.data?.response?.status === -1) throw new Error('Failed to create line');
        
        successCount++;
      } catch (err) {
        errors.push(`${material.material_name}: ${err.message}`);
      }
    }

    if (successCount === 0) {
      await openbravoApi.delete(`/MaterialMgmtInternalConsumption/${consumptionId}`).catch(() => {});
      throw new Error(`Gagal insert item: ${errors.join(', ')}`);
    }

   // ============================================
    // STEP 3: PROCESS (FIXED: USE LOCALSTORAGE AUTH + AXIOS)
    // ============================================
    console.log('\n🔄 STEP 3: Processing (Direct Axios)...');
    // 1. Gunakan URL Proxy (Sesuai Referensi) untuk hindari CORS
    const endpoint = 'https://mhnproc.pirantisolusi.com/api/process';

    // 2. Gunakan Kredensial Admin (Sesuai instruksi sebelumnya agar permission valid)
    //    Kita hardcode di sini agar pasti pakai akun admin, bukan akun user login.
    const apiUser = 'admin';
    const apiPass = '$2a$12$IezF1Wq519tcc.x.BA5Ame4OSstZm6kJ8b7u3lhWelwg6/6zr8U3y'; 

    // 3. Generate Basic Auth Token
    const authToken = btoa(unescape(encodeURIComponent(`${apiUser}:${apiPass}`)));

    // 4. Payload (Sesuai Referensi)
    const processPayload = {
      ad_process_id: "800131",
      ad_client_id: String(clientId),
      ad_org_id: String(orgId),
      data: [
        { id: String(consumptionId) }
      ]
    };

    console.log('🔗 Endpoint:', endpoint);
    console.log('🔑 Auth User:', apiUser); 
    console.log('📤 Sending Payload:', JSON.stringify(processPayload, null, 2));

    try {
      // 5. Request via Axios
      const processRes = await axios.post(endpoint, processPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`
        },
        timeout: 60000 // 60 detik
      });

      console.log('📥 Response:', JSON.stringify(processRes.data, null, 2));

      // 6. Validasi Response (Sesuai Referensi)
      const resultData = processRes.data?.data?.[0];
      
      if (resultData && resultData.result === 1) {
        console.log('✅ Processing Success!');
        return {
          success: true,
          movementId: consumptionId,
          successCount,
          totalMaterials: materials.length,
          errors: errors.length > 0 ? errors : null
        };
      } else {
        const msg = resultData?.errormsg || 'Unknown Error (Result not 1)';
        console.error('❌ Processing Failed:', msg);
        throw new Error(msg);
      }

    } catch (procErr) {
      const errorMsg = procErr.response?.data?.error?.message || procErr.message;
      console.error('❌ API Error:', errorMsg);
      console.error('❌ Status:', procErr.response?.status);
      
      return { 
        success: true, // Header & Lines aman (Step 1 & 2 sukses)
        movementId: consumptionId, 
        successCount, 
        totalMaterials: materials.length,
        errors: errors.length > 0 ? errors : null,
        warning: `Processing Failed: ${errorMsg}. Silakan cek dokumen ${consumptionId} manual.`
      };
    }

  } catch (err) {
    console.error(`❌ CRITICAL ERROR:`, err);
    return { success: false, errors: err.message };
  }
};

// ===========================================
// APPROVAL & REVISION HANDLERS
// ===========================================

const approveCurrentLevel = async () => {
  if (!canApproveCurrentLevel.value || !currentUserLevel.value) return;
  const levelName = currentUserLevel.value.level_name;
  
  const comment = prompt(
    `Tambahkan komentar untuk approval Level ${currentUserLevel.value.level_order} (opsional):`, 
    ''
  );
  
  if (comment === null) return;
  
  if (!confirm(`✅ Approve report ini untuk level "${levelName}"?`)) return;

  try {
    processing.value = true;
    const currentLevelOrder = currentUserLevel.value.level_order;
    const username = authStore.user?.username || authStore.user?.email || 'Admin';

    // 1. Update Current Level Status
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

    // 2. Insert History
    const { data: recData } = await supabase
      .from('gh_approve_record')
      .select('flow_id')
      .eq('record_id', currentReport.value.approval_record_id)
      .single();
    
    await supabase
      .from('gh_approval_history')
      .insert({
        record_id: currentReport.value.approval_record_id, 
        flow_id: recData.flow_id, 
        user_id: authStore.user.user_id,
        level_order: currentLevelOrder, 
        level_name: levelName, 
        action: 'approved', 
        comment: comment.trim() || `Approved by ${username}`
      });

    // 3. Check if Final Level
    const { data: flowData } = await supabase
      .from('gh_approve_record')
      .select(`flow_id, gh_approval_flow!inner(last_level)`)
      .eq('record_id', currentReport.value.approval_record_id)
      .single();
    
    const isFinalLevel = currentLevelOrder === flowData.gh_approval_flow.last_level;

    if (isFinalLevel) {
      console.log('🎉 FINAL APPROVAL - Processing Internal Consumption...');
      
      await supabase
        .from('gh_approve_record')
        .update({ 
          overall_status: 'approved', 
          completed_at: new Date().toISOString() 
        })
        .eq('record_id', currentReport.value.approval_record_id);
      
      await supabase
        .from('gh_report')
        .update({ report_status: 'approved' })
        .eq('report_id', currentReport.value.report_id);

      if (currentReport.value.type_damages?.length > 0) {
        const damageIds = currentReport.value.type_damages.map(d => d.typedamage_id);
        await supabase
          .from('gh_type_damage')
          .update({ status: 'approved' })
          .in('typedamage_id', damageIds);
      }

      // ✅ PROCESS MATERIALS
      const processResults = { total: 0, successful: [], failed: [], manualRequired: [] };
      
      for (const activity of currentReport.value.activities) {
        await supabase.from('gh_activity').update({ status: 'approved' }).eq('activity_id', activity.activity_id);
        
        if (activity.materials?.length > 0) {
          processResults.total++;
          console.log(`\n📦 Processing materials for: ${activity.act_name}`);
          
          const res = await createAndProcessMovement(activity.materials, activity.act_name);
          
          if (res.success) {
            await supabase
              .from('gh_activity')
              .update({ openbravo_movement_id: res.movementId })
              .eq('activity_id', activity.activity_id);
            
            const materialIds = activity.materials.map(m => m.material_used_id);
            await supabase
              .from('gh_material_used')
              .update({ status: res.warning ? 'pending' : 'consumed', consumed_at: new Date().toISOString() })
              .in('material_used_id', materialIds);
            
            if (res.warning) {
              processResults.manualRequired.push({ activity: activity.act_name, movementId: res.movementId, items: res.successCount, warning: res.warning });
            } else {
              processResults.successful.push({ activity: activity.act_name, movementId: res.movementId, items: res.successCount });
            }
          } else {
            processResults.failed.push({ activity: activity.act_name, error: res.errors || res.error });
          }
        }
      }

      // Summary Alert
      let message = `✅ REPORT FULLY APPROVED!\n${'='.repeat(30)}\n`;
      if (processResults.successful.length) message += `\n✅ Processed: ${processResults.successful.length} activities`;
      if (processResults.manualRequired.length) message += `\n⚠️ Manual Action: ${processResults.manualRequired.length} activities (Check Openbravo)`;
      if (processResults.failed.length) message += `\n❌ Failed: ${processResults.failed.length} activities`;
      
      alert(message);
      
    } else {
      // Next Level
      await supabase
        .from('gh_approve_record')
        .update({ current_level_order: currentLevelOrder + 1 })
        .eq('record_id', currentReport.value.approval_record_id);
      
      await supabase
        .from('gh_approval_level_status')
        .update({ status: 'pending' })
        .eq('record_id', currentReport.value.approval_record_id)
        .eq('level_order', currentLevelOrder + 1);
      
      alert(`✅ Level ${currentLevelOrder} Approved.\n\nProceeding to Level ${currentLevelOrder + 1}.`);
    }

    await loadData();
    router.push(sourcePage.value);

  } catch (err) {
    console.error('❌ Approval Error:', err);
    alert(`❌ Gagal approve:\n\n${err.message}`);
  } finally {
    processing.value = false;
  }
};

const requestRevisionForLevel = async () => {
  if (!canApproveCurrentLevel.value) return;
  if (!revisionModal.value.notes || revisionModal.value.notes.trim().length < 10) {
    alert('⚠️ Catatan revisi minimal 10 karakter'); 
    return;
  }
  if (!confirm('🔄 Kirim permintaan revisi report?')) return;

  try {
    processing.value = true;
    const currentLevel = currentUserLevel.value;
    
    const { data: recData } = await supabase
      .from('gh_approve_record')
      .select('flow_id')
      .eq('record_id', currentReport.value.approval_record_id)
      .single();

    await supabase
      .from('gh_approval_level_status')
      .update({
        status: 'needRevision', 
        revision_notes: revisionModal.value.notes,
        revision_requested_by: authStore.user.user_id, 
        revision_requested_at: new Date().toISOString()
      })
      .eq('record_id', currentReport.value.approval_record_id)
      .eq('level_order', currentLevel.level_order);

    await supabase
      .from('gh_approval_history')
      .insert({
        record_id: currentReport.value.approval_record_id, 
        flow_id: recData.flow_id, 
        user_id: authStore.user.user_id,
        level_order: currentLevel.level_order, 
        level_name: currentLevel.level_name, 
        action: 'revision_requested', 
        comment: revisionModal.value.notes
      });

    await supabase
      .from('gh_approve_record')
      .update({ overall_status: 'needRevision', current_level_order: 1 })
      .eq('record_id', currentReport.value.approval_record_id);

    await supabase
      .from('gh_report')
      .update({ report_status: 'needRevision' })
      .eq('report_id', currentReport.value.report_id);
    
    await supabase
      .from('gh_approval_level_status')
      .update({ status: 'pending', approved_by: null, approved_at: null })
      .eq('record_id', currentReport.value.approval_record_id)
      .neq('level_order', currentLevel.level_order);

    // Reset Child Tables
    if (currentReport.value.type_damages?.length) {
      await supabase.from('gh_type_damage').update({ status: 'needRevision' }).in('typedamage_id', currentReport.value.type_damages.map(d => d.typedamage_id));
    }
    if (currentReport.value.activities?.length) {
      await supabase.from('gh_activity').update({ status: 'needRevision' }).in('activity_id', currentReport.value.activities.map(a => a.activity_id));
    }

    await loadData();
    closeRevisionModal();
    alert('✅ Permintaan revisi dikirim! Status direset ke Level 1.');
    router.push(sourcePage.value);

  } catch (err) {
    console.error('❌ Revision Error:', err);
    alert('❌ Gagal revisi: ' + err.message);
  } finally {
    processing.value = false;
  }
};

// UI Handlers
const handleRevision = async () => {
  if (revisionModal.value.type === 'level') await requestRevisionForLevel();
  else { alert('Gunakan revision report.'); closeRevisionModal(); }
}

const openRevisionModal = (type, itemId) => {
  if (type !== 'level') return;
  revisionModal.value = { show: true, type, itemId, notes: '' }
}

const closeRevisionModal = () => {
  revisionModal.value = { show: false, type: null, itemId: null, notes: '' }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  if (!authStore.isLoggedIn) { router.push('/'); return }
  if (!report_id.value) { router.push(sourcePage.value); return }
  await loadData()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const reportInfo = computed(() => {
  if (!currentReport.value) return null;
  return {
    report_id: currentReport.value.report_id,
    location_id: currentReport.value.location_id,
    location_name: getLocationName(currentReport.value.location_id),
    batch_id: currentReport.value.batch_id,
    batch_name: getBatchName(currentReport.value.batch_id),
    report_date: currentReport.value.report_date,
    report_status: currentReport.value.report_status,
    phase_id: currentReport.value.phase_id,
    phase_name: phaseInfo.value || 'Unknown Phase', 
    current_level_order: currentUserLevel.value?.level_order || 1,
    can_approve: canApproveCurrentLevel.value,
  };
});
</script>

<template>
  <div class="min-h-screen bg-gray-50/50">
    <div class="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-3xl mx-auto px-4 py-3">
        <div class="flex items-center gap-3">
          <button @click="() => router.push(sourcePage)" class="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-lg transition border border-gray-200 active:scale-95">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-base font-bold text-gray-900 truncate">Review Report #{{ report_id }}</h1>
            <p class="text-xs text-gray-500 truncate">{{ reportInfo?.location_name || 'Loading...' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">
      
      <div v-if="loading" class="flex flex-col items-center justify-center py-16">
        <div class="w-10 h-10 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-3 text-sm text-gray-500 font-medium">Memuat data...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4">
        <p class="text-sm font-bold text-red-800">Gagal memuat data</p>
        <p class="text-xs text-red-600 mt-1">{{ error }}</p>
      </div>

      <template v-else-if="reportInfo && currentReport">
        
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-4 grid grid-cols-2 gap-y-4 gap-x-4">
            <div class="col-span-2 sm:col-span-1">
              <span class="text-xs text-gray-500 block mb-1">Lokasi</span>
              <p class="font-bold text-gray-900 text-sm leading-tight">{{ reportInfo.location_name }}</p>
            </div>
            <div>
              <span class="text-xs text-gray-500 block mb-1">Batch</span>
              <p class="font-bold text-gray-900 text-sm">{{ reportInfo.batch_name }}</p>
            </div>
            <div>
              <span class="text-xs text-gray-500 block mb-1">Fase</span>
              <p class="font-bold text-gray-900 text-sm">{{ reportInfo.phase_name }}</p>
            </div>
            <div>
              <span class="text-xs text-gray-500 block mb-1">Tanggal</span>
              <p class="font-bold text-gray-900 text-sm">{{ formatDate(reportInfo.report_date) }}</p>
            </div>
            <div>
              <span class="text-xs text-gray-500 block mb-1">Status</span>
              <span :class="getStatusBadge(reportInfo.report_status).class" class="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border">
                {{ getStatusBadge(reportInfo.report_status).text }}
              </span>
            </div>
          </div>
          
          <div v-if="reportInfo.report_status === 'needRevision'" class="bg-red-50 p-4 border-t border-red-100">
             <div class="flex gap-3">
               <span class="text-lg">⚠️</span>
               <div>
                 <p class="text-xs font-bold text-red-800">Perlu Revisi</p>
                 <p class="text-xs text-red-700 mt-1 italic">"{{ approvalProgress.find(p => p.level_status === 'needRevision')?.revision_notes || '-' }}"</p>
               </div>
             </div>
          </div>
        </div>

        <div v-if="approvalProgress.length > 0">
          <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Approval Progress</h2>
          <div class="space-y-3">
            <div v-for="level in approvalProgress" :key="level.level_status_id" 
                class="bg-white rounded-xl border p-4 shadow-sm relative overflow-hidden transition-all"
                :class="{
                  'border-green-200 ring-1 ring-green-100': level.level_status === 'approved',
                  'border-blue-300 ring-2 ring-blue-100': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order,
                  'border-red-200 bg-red-50/30': level.level_status === 'needRevision',
                  'border-gray-200 opacity-80': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                }">
                
                <div v-if="level.level_order !== approvalProgress.length" class="absolute left-[27px] top-[48px] bottom-[-20px] w-0.5 bg-gray-100 z-0"></div>

                <div class="relative z-10">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0"
                          :class="{
                            'bg-green-500': level.level_status === 'approved', 
                            'bg-blue-600': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order, 
                            'bg-red-500': level.level_status === 'needRevision', 
                            'bg-gray-300': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                          }">
                        {{ level.level_order }}
                      </div>
                      <span class="font-bold text-gray-900 text-sm leading-tight">{{ level.level_name }}</span>
                    </div>

                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border ml-2" 
                          :class="{
                            'bg-green-100 text-green-700 border-green-200': level.status === 'approved', 
                            'bg-blue-50 text-blue-700 border-blue-200': level.status === 'pending' && level.level_order === currentUserLevel?.level_order, 
                            'bg-red-100 text-red-700 border-red-200': level.status === 'needRevision', 
                            'bg-gray-100 text-gray-500 border-gray-200': level.status === 'pending' && level.level_order !== currentUserLevel?.level_order
                          }">
                      {{ level.status === 'approved' ? 'Approved' : level.status === 'needRevision' ? 'Revision' : 'Pending' }}
                    </span>
                  </div>

                  <div class="pl-11">
                    <p class="text-xs text-gray-600 mb-1">
                      <span v-if="level.level_status === 'approved'">Oleh: <span class="font-medium text-gray-900">{{ level.approver_name || 'Admin' }}</span></span>
                      <span v-else-if="level.level_status === 'needRevision'">Revisi dari: <span class="font-medium text-gray-900">{{ level.revisor_name || 'Admin' }}</span></span>
                      <span v-else-if="level.level_order === currentUserLevel?.level_order" class="text-blue-600 font-medium">Menunggu persetujuan Anda</span>
                      <span v-else>Menunggu giliran</span>
                    </p>
                    <p v-if="level.approved_at" class="text-[10px] text-gray-400">{{ formatDateTime(level.approved_at) }}</p>

                    <div v-if="approvalHistory.some(h => h.level_order === level.level_order)" class="mt-3 space-y-2">
                      <div v-for="history in approvalHistory.filter(h => h.level_order === level.level_order)" :key="history.history_id" 
                           class="text-xs bg-gray-50 border rounded-lg p-2.5"
                           :class="history.action === 'approved' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'">
                        <div class="flex justify-between items-center mb-1">
                          <span class="font-bold" :class="history.action === 'approved' ? 'text-green-800' : 'text-red-800'">
                            {{ history.action === 'approved' ? 'Komentar' : 'Catatan Revisi' }}
                          </span>
                        </div>
                        <p class="text-gray-700 whitespace-pre-wrap leading-relaxed">{{ history.comment || '-' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>

        <div v-if="canApproveCurrentLevel && currentUserLevel && reportInfo.report_status !== 'approved'" 
             class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
          <div class="max-w-3xl mx-auto flex gap-3">
             <button @click="openRevisionModal('level', null)" :disabled="processing" class="flex-1 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl transition text-sm active:scale-95">
               Tolak / Revisi
             </button>
             <button @click="approveCurrentLevel" :disabled="processing" class="flex-[2] bg-[#0071f3] hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition text-sm active:scale-95 flex items-center justify-center gap-2">
               <span v-if="processing" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
               <span>Setujui (Level {{ currentUserLevel.level_order }})</span>
             </button>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 class="font-bold text-gray-800 text-sm">Detail Laporan</h3>
          </div>
          
          <div class="p-4 space-y-6">
            <div v-if="envLogData">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🌡️</span>
                <h4 class="font-bold text-gray-900 text-sm">Environment Log</h4>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                 <div v-for="sessionKey in ['morning', 'noon', 'afternoon', 'night']" :key="sessionKey" 
                      class="rounded-lg border overflow-hidden bg-white shadow-sm flex flex-col">
                    <div class="px-2 py-1.5 border-b flex justify-between items-center bg-gray-50">
                       <span class="text-[10px] font-bold uppercase text-gray-600">{{ sessionLabels[sessionKey].label }}</span>
                       <span class="text-[10px] text-gray-400">{{ envLogData[`time_${sessionKey}`] || '-' }}</span>
                    </div>
                    <div class="p-2 space-y-2 flex-1">
                       <div v-for="(param, pKey) in paramLabels" :key="pKey" class="flex justify-between items-center">
                          <span class="text-[10px] text-gray-500">{{ param.label }}</span>
                          <span class="text-xs font-bold text-gray-800">{{ envLogData[`${pKey}_${sessionKey}`] || '-' }}</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            <hr class="border-gray-100" />

            <div v-if="currentReport.type_damages && currentReport.type_damages.length > 0">
               <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🌾</span>
                <h4 class="font-bold text-gray-900 text-sm">Kerusakan Tanaman</h4>
              </div>
              <div class="space-y-3">
                <div v-for="damage in currentReport.type_damages" :key="damage.typedamage_id" class="border rounded-lg p-3 bg-white">
                  <div class="flex justify-between items-start mb-2">
                    <p class="font-bold text-gray-900 text-sm">{{ damage.type_damage }}</p>
                    <span :class="getStatusBadge(damage.status).class" class="text-[9px] px-1.5 py-0.5 rounded border font-bold">{{ getStatusBadge(damage.status).text }}</span>
                  </div>
                  <div class="grid grid-cols-3 gap-2 mb-3">
                    <div class="bg-gray-50 rounded p-2 text-center border">
                      <span class="block text-[10px] text-gray-500">Kuning</span>
                      <span class="block text-sm font-bold text-gray-800">{{ damage.kuning || 0 }}</span>
                    </div>
                    <div class="bg-gray-50 rounded p-2 text-center border">
                      <span class="block text-[10px] text-gray-500">Kutilang</span>
                      <span class="block text-sm font-bold text-gray-800">{{ damage.kutilang || 0 }}</span>
                    </div>
                    <div class="bg-gray-50 rounded p-2 text-center border">
                      <span class="block text-[10px] text-gray-500">Busuk</span>
                      <span class="block text-sm font-bold text-gray-800">{{ damage.busuk || 0 }}</span>
                    </div>
                  </div>
                   <div v-if="damage.images?.length" class="flex gap-2 overflow-x-auto pb-1">
                     <img v-for="(img, idx) in damage.images" :key="idx" :src="getImageUrl(img)" @click="openImagePreview(damage.images, damage.type_damage, idx)" class="w-10 h-10 rounded object-cover border flex-shrink-0" />
                   </div>
                </div>
              </div>
            </div>

            <div v-if="currentReport.activities && currentReport.activities.length > 0">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">⚙️</span>
                <h4 class="font-bold text-gray-900 text-sm">Aktivitas</h4>
              </div>
              <div class="space-y-4">
                <div v-for="activity in currentReport.activities" :key="activity.activity_id" class="border rounded-lg p-3 bg-white">
                   <div class="flex justify-between items-start mb-3">
                    <p class="font-bold text-gray-900 text-sm">{{ activity.act_name }}</p>
                    <span :class="getStatusBadge(activity.status).class" class="text-[9px] px-1.5 py-0.5 rounded border font-bold">{{ getStatusBadge(activity.status).text }}</span>
                  </div>
                  
                  <div class="flex flex-wrap gap-2 mb-3 text-xs">
                     <span class="px-2 py-1 bg-gray-100 rounded text-gray-600">Manpower: <b>{{ activity.manpower }}</b></span>
                     <span class="px-2 py-1 bg-green-50 text-green-700 border border-green-100 rounded">Cost: <b>{{ formatCurrency(calculateActivityTotal(activity.materials)) }}</b></span>
                  </div>

                  <div v-if="activity.materials?.length" class="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <p class="text-[10px] font-bold text-gray-500 uppercase mb-2">Materials Used</p>
                    <div class="space-y-2">
                       <div v-for="mat in activity.materials" :key="mat.material_used_id" class="flex justify-between text-xs border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                          <span class="text-gray-700 truncate max-w-[50%]">{{ mat.material_name }}</span>
                          <div class="text-right">
                             <span class="font-bold text-gray-900 mr-1">{{ formatNumber(mat.qty) }} {{ mat.uom }}</span>
                             <span class="text-[10px] text-gray-400 block">{{ formatCurrency(mat.total_price) }}</span>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </template>

      <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
           <span class="w-6 h-6 p-0.5">
             <img :src="logoPG" alt="Potato Grow Logo" class="w-full h-full object-contain" />
          </span>
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>

    <div v-if="revisionModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl animate-slide-up sm:animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-900">Minta Revisi</h3>
          <button @click="closeRevisionModal" class="p-2 -mr-2 text-gray-400">✕</button>
        </div>
        <textarea v-model="revisionModal.notes" rows="4" placeholder="Alasan revisi..." class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none mb-2"></textarea>
        <div class="flex justify-end text-xs text-gray-400 mb-4">{{ revisionModal.notes.trim().length }}/10 Karakter</div>
        <button @click="handleRevision" :disabled="revisionModal.notes.length < 10 || processing" class="w-full bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">Kirim Revisi</button>
      </div>
    </div>

    <div v-if="imagePreview.show" class="fixed inset-0 z-[70] bg-black flex flex-col justify-center" @click.self="closeImagePreview">
      <button @click="closeImagePreview" class="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 z-[80]">✕</button>
      <div class="flex-1 flex items-center justify-center overflow-hidden relative">
        <button v-if="imagePreview.images.length > 1" @click.stop="prevImage" class="absolute left-2 text-white p-4 text-3xl z-[80]">‹</button>
        <img :src="getImageUrl(imagePreview.images[imagePreview.currentIndex])" class="max-w-full max-h-full object-contain" />
        <button v-if="imagePreview.images.length > 1" @click.stop="nextImage" class="absolute right-2 text-white p-4 text-3xl z-[80]">›</button>
      </div>
      <div class="p-4 text-center text-white bg-black/50">
        <p class="font-bold">{{ imagePreview.title }}</p>
        <p class="text-xs text-gray-400">{{ imagePreview.currentIndex + 1 }} / {{ imagePreview.images.length }}</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
</style>