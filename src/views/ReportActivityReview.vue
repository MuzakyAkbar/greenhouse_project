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

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()
const approvalComment = ref('')
const approvalHistory = ref([])

const report_id = ref(route.params.report_id || null)
const sourcePage = ref(route.query.from || '/planningReportList')

// State Approval
const approvalProgress = ref([])
const currentUserLevel = ref(null) 
const canApproveCurrentLevel = ref(false)

const loading = ref(true)
const processing = ref(false)
const error = ref(null)
const phaseInfo = ref(null)
const currentReport = ref(null)

// State Revision Modal
const revisionModal = ref({
  show: false,
  type: null,
  itemId: null,
  notes: ''
})

// Warehouse Info
const warehouseInfo = ref({
  warehouse: null,
  bin: null,
  location_name: null
})

// --- ENVIRONMENT LOG STATE & CONFIG ---
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

// --- IMAGE PREVIEW STATE ---
const imagePreview = ref({
  show: false,
  images: [],
  currentIndex: 0,
  title: ''
})

// ===========================================
// HELPER FUNCTIONS (IMAGE & UTILS)
// ===========================================

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

const formatNumber = (value) => {
  if (!value && value !== 0) return '0'
  return Number(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0'
  return 'Rp ' + Number(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const calculateActivityTotal = (materials) => {
  if (!materials || materials.length === 0) return 0
  return materials.reduce((sum, mat) => sum + (Number(mat.total_price) || 0), 0)
}

const getTotalMaterialCost = () => {
  if (!currentReport.value?.activities) return 0
  return currentReport.value.activities.reduce((sum, activity) => {
    if (!activity.materials) return sum
    const activityTotal = calculateActivityTotal(activity.materials)
    return sum + activityTotal
  }, 0)
}

const loadPhaseInfo = async (phaseId) => {
  if (!phaseId) return null;
  try {
    const { data, error } = await supabase.from('gh_phase').select('phase_name').eq('phase_id', phaseId).single();
    if (error) throw error;
    return data?.phase_name || 'Unknown Phase';
  } catch (err) { return 'Unknown Phase'; }
};

const getBatchName = (batchId) => batchStore.batches.find(b => b.batch_id == batchId)?.batch_name || `Batch ${batchId}`
const getLocationName = (locationId) => locationStore.locations.find(l => l.location_id == locationId)?.location || `Location ${locationId}`
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
const formatDateTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

const getStatusBadge = (status) => {
  const badges = {
    'onReview': { text: '⏳ Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'needRevision': { text: '🔄 Revision', class: 'bg-red-100 text-red-800 border-red-200' },
    'approved': { text: '✅ Approved', class: 'bg-green-100 text-green-800 border-green-200' }
  }
  return badges[status || 'onReview'] || badges['onReview']
}

// ===========================================
// LOADERS (Data & Openbravo)
// ===========================================

// --- Environment Log Loader ---
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
    
    const warehouseRes = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Warehouse', { params: { _where: `name='${locationName}'` } })
    const warehouses = warehouseRes?.data?.response?.data || []
    if (!warehouses.length) return
    const warehouse = warehouses[0]
    warehouseInfo.value.warehouse = warehouse
    
    const binRes = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } })
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
    await loadApprovalHistory(); // ✅ LOAD HISTORY
    
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
// APPROVAL LOGIC (Fixed for API Process)
// ===========================================

const createAndProcessMovement = async (materials, activityName) => {
  // 1. Validasi Awal
  if (!materials || materials.length === 0) {
    return { success: false, errors: 'No materials provided' };
  }
  
  // Check credentials for Standard REST (Step 1 & 2)
  const obUser = localStorage.getItem('OB_USER');
  const obKey = localStorage.getItem('OB_KEY');
  
  if (!obUser || !obKey) {
    return { 
      success: false, 
      errors: 'Kredensial Openbravo hilang. Silakan Logout & Login ulang.' 
    };
  }

  // Check warehouse & bin info
  if (!warehouseInfo.value.bin || !warehouseInfo.value.warehouse) {
    return { 
      success: false, 
      errors: 'Warehouse/Bin tidak ditemukan untuk location ini' 
    };
  }

  const warehouse = warehouseInfo.value.warehouse;
  const bin = warehouseInfo.value.bin;
  const warehouseId = warehouse.id;
  const binId = bin.id; 
  
  // ✅ FIX: Gunakan ID Default jika object client/org tidak terbaca sempurna
  const DEFAULT_CLIENT_ID = '025F309A89714992995442D9CDE13A15';
  const DEFAULT_ORG_ID = '96D7D37973EF450383B8ADCFDB666725';

  const orgId = warehouse.organization?.id || warehouse.organization || DEFAULT_ORG_ID;
  const clientId = warehouse.client?.id || warehouse.client || DEFAULT_CLIENT_ID;
  
  const PATH_SERVICE = '/org.openbravo.service.json.jsonrest';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 CREATING INTERNAL CONSUMPTION`);
  console.log(`${'='.repeat(60)}`);
  console.log('Activity:', activityName);
  console.log('Org ID:', orgId);
  console.log('Client ID:', clientId);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // ============================================
    // STEP 1: CREATE HEADER
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

    const createRes = await openbravoApi.post(`${PATH_SERVICE}/MaterialMgmtInternalConsumption`, consumptionPayload);

    if (createRes.data.response && createRes.data.response.status !== 0) {
      throw new Error(`Openbravo Reject: ${createRes.data.response.error?.message}`);
    }

    let consumptionId = null;
    const rData = createRes.data.response?.data || createRes.data.data;
    if (Array.isArray(rData) && rData.length > 0) consumptionId = rData[0].id;
    else if (rData && rData.id) consumptionId = rData.id;

    if (!consumptionId) throw new Error('Gagal mendapatkan ID Header');
    console.log(`✅ Header Created: ${consumptionId}`);

    // ============================================
    // STEP 2: CREATE LINES
    // ============================================
    console.log('\n🔄 STEP 2: Creating Lines...');
    
    let successCount = 0;
    const errors = [];

    for (const material of materials) {
      try {
        const escapedName = material.material_name.replace(/'/g, "''");
        const prodRes = await openbravoApi.get(`${PATH_SERVICE}/Product`, { 
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
          const uomRes = await openbravoApi.get(`${PATH_SERVICE}/UOM`, { params: { _where: `name='${material.uom}'`, _startRow: 0, _endRow: 1 } });
          const uoms = uomRes?.data?.response?.data || [];
          if (uoms.length > 0) uomId = uoms[0].id;
        }

        // Check Stock
        const stockRes = await openbravoApi.get(`${PATH_SERVICE}/MaterialMgmtStorageDetail`, {
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

        const lineRes = await openbravoApi.post(`${PATH_SERVICE}/MaterialMgmtInternalConsumptionLine`, linePayload);
        if (lineRes?.data?.response?.status === -1) throw new Error('Failed to create line');
        
        successCount++;
      } catch (err) {
        errors.push(`${material.material_name}: ${err.message}`);
      }
    }

    if (successCount === 0) {
      await openbravoApi.delete(`${PATH_SERVICE}/MaterialMgmtInternalConsumption/${consumptionId}`).catch(() => {});
      throw new Error(`Gagal insert item: ${errors.join(', ')}`);
    }

   // ============================================
    // STEP 3: PROCESS (UPDATED: PROXY DOMAIN)
    // ============================================
    console.log('\n🔄 STEP 3: Processing (Via Proxy)...');
    
    // Gunakan Env Vars untuk Auth Process API (Credentials tetap diambil dari ENV)
    const apiUser = import.meta.env.VITE_API_USER;
    const apiPass = import.meta.env.VITE_API_PASS;

    // UPDATE: URL sekarang menggunakan domain proxy khusus, tidak lagi rakitan IP:Port
    const endpoint = 'https://mhnproc.pirantisolusi.com/api/process';

    if (!apiUser || !apiPass) {
      return {
        success: true, movementId: consumptionId, successCount, totalMaterials: materials.length,
        errors: errors.length > 0 ? errors : null,
        warning: 'Credential ENV missing for Processing.'
      };
    }
    
    // Basic Auth
    const authToken = btoa(unescape(encodeURIComponent(`${apiUser}:${apiPass}`)));

    // 🔥 PAYLOAD PERSIS SEPERTI PERMINTAAN
    const processPayload = {
      ad_process_id: "800131",
      ad_client_id: clientId, // Menggunakan ID yang sudah divalidasi
      ad_org_id: orgId,       // Menggunakan ID yang sudah divalidasi
      data: [
        { id: consumptionId }
      ]
    };

    console.log('🔗 Endpoint:', endpoint);
    console.log('📤 Sending Payload:', JSON.stringify(processPayload, null, 2));

    try {
      const processRes = await axios.post(endpoint, processPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`
        },
        timeout: 45000 // Extended timeout
      });

      console.log('📥 Response:', JSON.stringify(processRes.data, null, 2));

      // ✅ Validasi response persis seperti permintaan: "result": 1
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
      console.error('❌ API Error:', procErr.message);
      
      return { 
        success: true,
        movementId: consumptionId, 
        successCount, 
        totalMaterials: materials.length,
        errors: errors.length > 0 ? errors : null,
        warning: `Processing Failed: ${procErr.message}. Silakan proses manual dokumen ${consumptionId}`
      };
    }

  } catch (err) {
    console.error(`❌ CRITICAL ERROR:`, err);
    return { success: false, errors: err.message };
  }
};

const loadApprovalHistory = async () => {
  if (!currentReport.value?.approval_record_id) {
    approvalHistory.value = [];
    return;
  }
  
  try {
    // ✅ Query tanpa relasi dulu (lebih aman)
    const { data, error } = await supabase
      .from('gh_approval_history')
      .select('*')
      .eq('record_id', currentReport.value.approval_record_id)
      .order('action_at', { ascending: true });
    
    if (error) throw error;
    
    // ✅ Manual fetch user names
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
    
    console.log('✅ Approval History Loaded:', approvalHistory.value);
    
  } catch (err) {
    console.error('❌ Error loading approval history:', err);
    approvalHistory.value = [];
  }
};

// ✅ IMPROVED APPROVAL HANDLER - Better error reporting
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

    // 2. Insert History WITH COMMENT
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

      // ✅ PROCESS MATERIALS WITH DETAILED TRACKING
      const processResults = {
        total: 0,
        successful: [],
        failed: [],
        manualRequired: []
      };
      
      for (const activity of currentReport.value.activities) {
        await supabase
          .from('gh_activity')
          .update({ status: 'approved' })
          .eq('activity_id', activity.activity_id);
        
        if (activity.materials?.length > 0) {
          processResults.total++;
          
          console.log(`\n📦 Processing materials for: ${activity.act_name}`);
          
          const res = await createAndProcessMovement(activity.materials, activity.act_name);
          
          if (res.success) {
            // ✅ SUCCESS or PARTIAL SUCCESS
            await supabase
              .from('gh_activity')
              .update({ 
                openbravo_movement_id: res.movementId 
              })
              .eq('activity_id', activity.activity_id);
            
            const materialIds = activity.materials.map(m => m.material_used_id);
            await supabase
              .from('gh_material_used')
              .update({ 
                status: res.warning ? 'pending' : 'consumed',
                consumed_at: new Date().toISOString()
              })
              .in('material_used_id', materialIds);
            
            if (res.warning) {
              // Header created but not processed
              processResults.manualRequired.push({
                activity: activity.act_name,
                movementId: res.movementId,
                items: res.successCount,
                warning: res.warning,
                errors: res.errors
              });
            } else {
              // Fully successful
              processResults.successful.push({
                activity: activity.act_name,
                movementId: res.movementId,
                items: res.successCount
              });
            }
            
            console.log(`✅ ${activity.act_name}: ${res.movementId}`);
          } else {
            // ❌ FAILED
            processResults.failed.push({
              activity: activity.act_name,
              error: res.errors || res.error
            });
            console.error(`❌ ${activity.act_name}: ${res.errors || res.error}`);
          }
        }
      }

      // ============================================
      // ✅ DISPLAY COMPREHENSIVE SUMMARY
      // ============================================
      let message = '';
      
      // Header
      message += `✅ REPORT FULLY APPROVED!\n`;
      message += `${'='.repeat(50)}\n\n`;
      
      // Summary Stats
      message += `📊 SUMMARY:\n`;
      message += `• Activities Processed: ${processResults.total}\n`;
      message += `• Successful: ${processResults.successful.length}\n`;
      message += `• Manual Action Required: ${processResults.manualRequired.length}\n`;
      message += `• Failed: ${processResults.failed.length}\n\n`;
      
      // Successful Items
      if (processResults.successful.length > 0) {
        message += `✅ SUCCESSFULLY PROCESSED:\n`;
        processResults.successful.forEach(item => {
          message += `   • ${item.activity}\n`;
          message += `     ID: ${item.movementId} (${item.items} items)\n`;
          message += `     Stock: ✅ Reduced in Openbravo\n\n`;
        });
      }
      
      // Manual Action Required
      if (processResults.manualRequired.length > 0) {
        message += `⚠️ MANUAL ACTION REQUIRED:\n`;
        message += `The following Internal Consumptions were created but\n`;
        message += `need to be processed manually in Openbravo:\n\n`;
        
        processResults.manualRequired.forEach(item => {
          message += `   📋 ${item.activity}\n`;
          message += `      Document ID: ${item.movementId}\n`;
          message += `      Items Created: ${item.items}\n`;
          if (item.errors) {
            message += `      Issues: ${item.errors.length} material(s)\n`;
          }
          message += `\n`;
        });
        
        message += `📝 STEPS TO COMPLETE:\n`;
        message += `1. Login to Openbravo\n`;
        message += `2. Open "Internal Consumption" menu\n`;
        message += `3. Find documents by ID above\n`;
        message += `4. Click "Process" → Select "Complete" (CO)\n`;
        message += `5. Confirm to reduce stock\n\n`;
      }
      
      // Failed Items
      if (processResults.failed.length > 0) {
        message += `❌ FAILED ACTIVITIES:\n`;
        message += `These activities could not create Internal Consumption.\n`;
        message += `Please create manually in Openbravo:\n\n`;
        
        processResults.failed.forEach(item => {
          message += `   • ${item.activity}\n`;
          message += `     Error: ${item.error}\n\n`;
        });
      }
      
      alert(message);
      
    } else {
      // Not final level - proceed to next level
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
    
    // 1. Get Flow Info
    const { data: recData } = await supabase
      .from('gh_approve_record')
      .select('flow_id')
      .eq('record_id', currentReport.value.approval_record_id)
      .single();

    // 2. Update Current Level Status to needRevision
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

    // 3. Insert History
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

    // 4. ✅ FIX: Update gh_approve_record - Reset to Level 1
    await supabase
      .from('gh_approve_record')
      .update({ 
        overall_status: 'needRevision', 
        current_level_order: 1 
      })
      .eq('record_id', currentReport.value.approval_record_id);

    // 5. ✅ FIX: Update gh_report Status
    await supabase
      .from('gh_report')
      .update({ report_status: 'needRevision' })
      .eq('report_id', currentReport.value.report_id);
    
    // 6. ✅ FIX: Reset ALL Approval Levels (except current)
    await supabase
      .from('gh_approval_level_status')
      .update({ 
        status: 'pending', 
        approved_by: null, 
        approved_at: null 
      })
      .eq('record_id', currentReport.value.approval_record_id)
      .neq('level_order', currentLevel.level_order);

    // 7. ✅ NEW: Update Child Tables Status to needRevision
    
    // 7a. Update gh_type_damage
    if (currentReport.value.type_damages?.length > 0) {
      const damageIds = currentReport.value.type_damages.map(d => d.typedamage_id);
      await supabase
        .from('gh_type_damage')
        .update({ status: 'needRevision' })
        .in('typedamage_id', damageIds);
    }
    
    // 7b. Update gh_activity
    if (currentReport.value.activities?.length > 0) {
      const activityIds = currentReport.value.activities.map(a => a.activity_id);
      await supabase
        .from('gh_activity')
        .update({ status: 'needRevision' })
        .in('activity_id', activityIds);
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

// ===========================================
// UI HANDLERS
// ===========================================
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
    totalTypeDamages: currentReport.value.type_damages?.length || 0,
    totalActivities: currentReport.value.activities?.length || 0,
    current_level_order: currentUserLevel.value?.level_order || 1,
    current_level_name: currentUserLevel.value?.level_name || 'Level 1',
    can_approve: canApproveCurrentLevel.value,
    is_final_level: currentUserLevel.value?.is_final_level || false,
    revision_notes: currentReport.value.revision_notes,
    revision_requested_by: currentReport.value.revision_requested_by,
    revision_requested_at: currentReport.value.revision_requested_at,
    approved_by: currentReport.value.approved_by,
    approved_at: currentReport.value.approved_at,
  };
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <button @click="() => router.push(sourcePage)" class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-lg">⏳</span>
              Review Activity Report
            </h1>
            <p class="text-sm text-gray-500 mt-1">Report ID: #{{ report_id }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center"><div class="inline-block w-12 h-12 border-4 border-[#0071f3] border-t-transparent rounded-full animate-spin"></div><p class="mt-4 text-gray-600 font-semibold">Memuat data laporan...</p></div>
      </div>

      <div v-else-if="error" class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div class="flex items-center gap-3"><span class="text-3xl">❌</span><div><p class="font-bold text-red-900">Terjadi Kesalahan</p><p class="text-sm text-red-700 mt-1">{{ error }}</p></div></div>
      </div>

      <template v-else-if="reportInfo && currentReport">
        <div class="mb-6">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div><p class="text-sm text-gray-600 font-semibold mb-1">📍 Lokasi</p><p class="text-lg font-bold text-gray-900">{{ reportInfo.location_name }}</p></div>
              <div><p class="text-sm text-gray-600 font-semibold mb-1">🏷️ Batch</p><p class="text-lg font-bold text-gray-900">{{ reportInfo.batch_name }}</p></div>
              <div><p class="text-sm text-gray-600 font-semibold mb-1">🌱 Fase</p><p class="text-lg font-bold text-gray-900">{{ reportInfo?.phase_name || '-' }}</p></div>
              <div><p class="text-sm text-gray-600 font-semibold mb-1">📅 Tanggal</p><p class="text-lg font-bold text-gray-900">{{ formatDate(reportInfo.report_date) }}</p></div>
              <div><p class="text-sm text-gray-600 font-semibold mb-1">📊 Status</p><span :class="getStatusBadge(reportInfo.report_status).class" class="inline-block px-3 py-1 rounded-lg font-bold text-xs border-2">{{ getStatusBadge(reportInfo.report_status).text }}</span></div>
            </div>
            
            <div v-if="reportInfo.report_status === 'needRevision'" class="mt-4 pt-4 border-t-2 border-blue-200">
              <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p class="text-sm font-bold text-red-900 mb-2 flex items-center gap-2"><span class="text-lg">🔄</span>Catatan Revisi Report</p>
                <p class="text-sm text-red-900 whitespace-pre-wrap">{{ approvalProgress.find(p => p.level_status === 'needRevision')?.revision_notes || 'Revisi diminta.' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="approvalProgress.length > 0" class="mb-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">📊 Approval Progress</h2>
          <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
             <div class="space-y-3">
              <div v-for="level in approvalProgress" :key="level.level_status_id" 
                  class="flex items-start gap-4 p-4 rounded-lg" 
                  :class="{
                    'bg-green-50 border-2 border-green-200': level.level_status === 'approved', 
                    'bg-yellow-50 border-2 border-yellow-200': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order, 
                    'bg-red-50 border-2 border-red-200': level.level_status === 'needRevision', 
                    'bg-gray-50 border-2 border-gray-200': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                  }">
                
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" 
                    :class="{
                      'bg-green-500': level.level_status === 'approved', 
                      'bg-blue-500': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order, 
                      'bg-red-500': level.level_status === 'needRevision', 
                      'bg-gray-400': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order
                    }">
                  {{ level.level_order }}
                </div>
                
                <div class="flex-1">
                  <p class="font-bold text-gray-900">{{ level.level_name || `Level ${level.level_order}` }}</p>
                  
                  <p class="text-sm text-gray-600">
                    <span v-if="level.level_status === 'approved'">✅ Disetujui oleh {{ level.approver_name || 'Admin' }}</span>
                    <span v-else-if="level.level_status === 'needRevision'">🔄 Revisi diminta oleh {{ level.revisor_name || 'Admin' }}</span>
                    <span v-else-if="level.level_order === currentUserLevel?.level_order">⏳ Menunggu Disetujui Anda</span>
                    <span v-else>⏸️ Menunggu</span>
                  </p>
                  
                  <p v-if="level.approved_at" class="text-xs text-gray-500 mt-1">{{ formatDateTime(level.approved_at) }}</p>
                  
                  <div v-if="approvalHistory.length > 0" class="mt-3 space-y-2">
                    <template v-for="history in approvalHistory.filter(h => h.level_order === level.level_order)" :key="history.history_id">
                      <div v-if="history.action === 'approved'" class="p-3 bg-white border-2 border-green-300 rounded-lg shadow-sm">
                        <div class="flex items-start justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <p class="text-xs font-bold text-green-700">Komentar oleh {{ history.user_name }}</p>
                          </div>
                          <p class="text-xs text-gray-500">{{ formatDateTime(history.action_at) }}</p>
                        </div>
                        <p class="text-sm text-gray-700 whitespace-pre-wrap pl-6">{{ history.comment || 'Tidak ada komentar' }}</p>
                      </div>
                      
                      <div v-else-if="history.action === 'revision_requested'" class="p-3 bg-white border-2 border-red-300 rounded-lg shadow-sm">
                        <div class="flex items-start justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <span class="text-red-600 font-bold">🔄</span>
                            <p class="text-xs font-bold text-red-700">Revisi diminta oleh {{ history.user_name }}</p>
                          </div>
                          <p class="text-xs text-gray-500">{{ formatDateTime(history.action_at) }}</p>
                        </div>
                        <p class="text-sm text-gray-700 whitespace-pre-wrap pl-6">{{ history.comment || 'Tidak ada catatan' }}</p>
                      </div>
                    </template>
                  </div>
                </div>
                
                <span class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap self-start" 
                      :class="{
                        'bg-green-100 text-green-800 border-green-200': level.status === 'approved', 
                        'bg-yellow-100 text-yellow-800 border-yellow-200': level.status === 'pending' && level.level_order === currentUserLevel?.level_order, 
                        'bg-red-100 text-red-800 border-red-200': level.status === 'needRevision', 
                        'bg-gray-100 text-gray-800 border-gray-200': level.status === 'pending' && level.level_order !== currentUserLevel?.level_order
                      }">
                  {{ level.status === 'approved' ? '✅ Approved' : level.status === 'needRevision' ? '🔄 Revision' : '⏳ Pending' }}
                </span>
              </div>
            </div>
            <div v-if="canApproveCurrentLevel && currentUserLevel && reportInfo.report_status !== 'approved'" class="mt-6 pt-6 border-t-2 border-gray-100">
              <div class="flex flex-col sm:flex-row gap-3">
                <button @click="approveCurrentLevel" :disabled="processing" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">✅ Approve Level {{ currentUserLevel.level_order }}</button>
                <button @click="openRevisionModal('level', null)" :disabled="processing" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">🔄 Request Revision Report</button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
          <div class="bg-gradient-to-r from-gray-50 to-white p-5 border-b-2 border-gray-100">
            <h3 class="font-bold text-gray-900 text-lg">Detail Laporan #{{ currentReport.report_id }}</h3>
          </div>

          <div class="p-6 space-y-8">
            <div v-if="envLogData">
              <div class="flex justify-between items-center mb-4">
                 <h4 class="text-lg font-bold text-gray-900 flex items-center gap-2"><span class="text-2xl">🌡️</span> Environment Log</h4>
                 <span class="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded border">Reference Data Only</span>
              </div>
              <div class="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                 <span class="text-lg">ℹ️</span><p class="mt-0.5">Data lingkungan ini sebagai referensi kondisi saat laporan dibuat. <b>Status approval laporan tidak mempengaruhi data ini.</b></p>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div v-for="sessionKey in ['morning', 'noon', 'afternoon', 'night']" :key="sessionKey" class="rounded-xl border-2 overflow-hidden" :class="sessionLabels[sessionKey].colorClass">
                    <div class="p-3 border-b border-black/10 flex justify-between items-center font-bold">
                       <span class="flex items-center gap-2">{{ sessionLabels[sessionKey].icon }} {{ sessionLabels[sessionKey].label }}</span>
                       <span class="text-sm bg-white/50 px-2 py-0.5 rounded">{{ envLogData[`time_${sessionKey}`] || '--:--' }}</span>
                    </div>
                    <div class="p-4 space-y-3 bg-white h-full">
                       <div v-for="(param, pKey) in paramLabels" :key="pKey" class="flex justify-between items-start">
                          <div class="flex-1">
                             <p class="text-[10px] uppercase font-bold text-gray-400">{{ param.label }}</p>
                             <p class="text-sm font-bold text-gray-800">{{ envLogData[`${pKey}_${sessionKey}`] }} <span class="text-gray-400 text-xs font-normal" v-if="envLogData[`${pKey}_${sessionKey}`]">{{ param.unit }}</span><span class="text-gray-300" v-else>-</span></p>
                          </div>
                          <button v-if="envLogData[`img_${pKey}_${sessionKey}`]" @click="openEnvImagePreview(envLogData[`img_${pKey}_${sessionKey}`], `${sessionLabels[sessionKey].label} - ${param.label}`)" class="w-10 h-10 rounded-lg border overflow-hidden hover:opacity-80 transition shadow-sm bg-gray-50 flex-shrink-0" title="Lihat Foto">
                            <img :src="envLogData[`img_${pKey}_${sessionKey}`]" class="w-full h-full object-cover">
                          </button>
                          <div v-else class="w-10 h-10 rounded-lg border border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0"><span class="text-[10px] text-gray-300 italic">No Img</span></div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
            <div v-else class="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-gray-400 text-sm">Data Environment Log tidak tersedia.</div>

            <div v-if="currentReport.type_damages && currentReport.type_damages.length > 0">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><span class="text-2xl">🌾</span> Kerusakan Tanaman</h4>
              <div class="space-y-3">
                <div v-for="damage in currentReport.type_damages" :key="damage.typedamage_id" class="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex-1">
                      <p class="font-bold text-gray-900 text-lg mb-3">{{ damage.type_damage || 'Kerusakan' }}</p> 
                      <div class="grid grid-cols-3 gap-3">
                        <div class="bg-white rounded-lg p-3"><p class="text-xs text-gray-500 font-semibold mb-1">🟡 Kuning</p><p class="text-2xl font-bold text-gray-900">{{ damage.kuning || 0 }}</p></div>
                        <div class="bg-white rounded-lg p-3"><p class="text-xs text-gray-500 font-semibold mb-1">🟠 Kutilang</p><p class="text-2xl font-bold text-gray-900">{{ damage.kutilang || 0 }}</p></div>
                        <div class="bg-white rounded-lg p-3"><p class="text-xs text-gray-500 font-semibold mb-1">🔴 Busuk</p><p class="text-2xl font-bold text-gray-900">{{ damage.busuk || 0 }}</p></div>
                      </div>
                      <div v-if="damage.images && damage.images.length > 0" class="mt-4">
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📷 Bukti Foto</p>
                        <div class="flex flex-wrap gap-2">
                          <div v-for="(img, idx) in damage.images" :key="idx" @click="openImagePreview(damage.images, damage.type_damage, idx)" class="relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer border hover:opacity-90 transition">
                            <img :src="getImageUrl(img)" class="w-full h-full object-cover" loading="lazy" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-2"><span :class="getStatusBadge(damage.status).class" class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap">{{ getStatusBadge(damage.status).text }}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="currentReport.activities && currentReport.activities.length > 0">
              <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><span class="text-2xl">⚙️</span> Aktivitas</h4>
              <div class="space-y-4">
                <div v-for="activity in currentReport.activities" :key="activity.activity_id" class="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                  <div class="flex items-start justify-between gap-4 mb-4">
                    <div class="flex-1">
                      <p class="font-bold text-gray-900 text-lg mb-3">{{ activity.act_name }}</p>
                      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        <div class="bg-white rounded-lg p-3"><p class="text-xs text-gray-500 font-semibold mb-1">CoA</p><p class="text-sm font-medium text-gray-900">{{ activity.CoA || '-' }}</p></div>
                        <div class="bg-white rounded-lg p-3"><p class="text-xs text-gray-500 font-semibold mb-1">👷 Manpower</p><p class="text-sm font-medium text-gray-900">{{ activity.manpower || 0 }} pekerja</p></div>
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-200"><p class="text-xs text-green-600 font-semibold mb-1">💰 Material Cost</p><p class="text-base font-bold text-green-700">{{ formatCurrency(calculateActivityTotal(activity.materials || [])) }}</p></div>
                      </div>
                      <div v-if="activity.images && activity.images.length > 0" class="mb-4">
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📷 Bukti Aktivitas</p>
                        <div class="flex flex-wrap gap-2">
                          <div v-for="(img, idx) in activity.images" :key="idx" @click="openImagePreview(activity.images, activity.act_name, idx)" class="relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer border border-gray-300 hover:ring-2 hover:ring-[#0071f3] transition">
                            <img :src="getImageUrl(img)" class="w-full h-full object-cover" loading="lazy" />
                          </div>
                        </div>
                      </div>
                      <div v-if="activity.materials && activity.materials.length > 0" class="bg-white rounded-lg p-4">
                        <p class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><span class="text-base">📦</span>Materials ({{ activity.materials.length }})</p>
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead><tr class="border-b-2 border-gray-200"><th class="text-left py-2 px-3 font-semibold text-gray-600">Material</th><th class="text-right py-2 px-3 font-semibold text-gray-600">Qty</th><th class="text-right py-2 px-3 font-semibold text-gray-600">UOM</th><th class="text-right py-2 px-3 font-semibold text-gray-600">Total</th></tr></thead>
                            <tbody>
                              <tr v-for="material in activity.materials" :key="material.material_used_id" class="border-b border-gray-100 hover:bg-blue-50 transition">
                                <td class="py-2 px-3 font-medium text-gray-900">{{ material.material_name }}</td>
                                <td class="py-2 px-3 text-right font-semibold text-gray-900">{{ formatNumber(material.qty) }}</td>
                                <td class="py-2 px-3 text-right text-gray-600">{{ material.uom }}</td>
                                <td class="py-2 px-3 text-right font-bold text-blue-700">{{ formatCurrency(material.total_price || 0) }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-2"><span :class="getStatusBadge(activity.status).class" class="px-3 py-1 rounded-lg font-bold text-xs border-2 whitespace-nowrap">{{ getStatusBadge(activity.status).text }}</span></div>
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

    <div v-if="revisionModal.show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2"><span class="text-2xl">🔄</span>Request Revision</h3>
          <button @click="closeRevisionModal" class="text-gray-400 hover:text-gray-600 transition" :disabled="processing">✕</button>
        </div>
        <div class="mb-6"><label class="block text-sm font-semibold text-gray-700 mb-2">Item Type</label><div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">📋 Seluruh Report (Level {{ currentUserLevel?.level_order }})</div></div>
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">Catatan Revisi <span class="text-red-500">*</span></label>
          <textarea v-model="revisionModal.notes" rows="6" placeholder="Tuliskan dengan jelas apa yang perlu diperbaiki..." class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0071f3] focus:outline-none transition resize-none" :disabled="processing"></textarea>
          <div class="mt-3 flex items-center gap-2 text-sm"><span class="font-semibold" :class="revisionModal.notes.trim().length < 10 ? 'text-red-600' : 'text-green-600'">{{ revisionModal.notes.trim().length }} / 10</span><span class="text-gray-500">karakter</span></div>
        </div>
        <div class="flex gap-3">
          <button @click="closeRevisionModal" :disabled="processing" class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition disabled:opacity-50">Batal</button>
          <button @click="handleRevision" :disabled="!revisionModal.notes.trim() || revisionModal.notes.trim().length < 10 || processing" class="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition disabled:opacity-50"><span>{{ processing ? 'Mengirim...' : 'Kirim Revisi' }}</span></button>
        </div>
      </div>
    </div>

    <div v-if="imagePreview.show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm transition-opacity" @click.self="closeImagePreview">
      <div class="absolute top-6 right-6 z-[70] flex gap-3">
        <button @click.stop="downloadCurrentImage" class="text-white hover:text-gray-300 transition bg-white/10 hover:bg-white/20 rounded-full p-2" title="Download Image">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </button>
        <button @click="closeImagePreview" class="text-white hover:text-gray-300 transition bg-white/10 hover:bg-white/20 rounded-full p-2">✕</button>
      </div>
      <button v-if="imagePreview.images.length > 1" @click.stop="prevImage" class="absolute left-4 md:left-8 text-white hover:text-gray-300 p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-[70]">‹</button>
      <div class="relative max-w-7xl max-h-[85vh] p-4 flex flex-col items-center">
        <img :src="getImageUrl(imagePreview.images[imagePreview.currentIndex])" class="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain select-none" />
        <div class="mt-4 text-center"><p class="text-white font-bold text-lg md:text-xl tracking-wide">{{ imagePreview.title }}</p></div>
      </div>
      <button v-if="imagePreview.images.length > 1" @click.stop="nextImage" class="absolute right-4 md:right-8 text-white hover:text-gray-300 p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-[70]">›</button>
    </div>

  </div>
</template>

<style scoped>
@keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in { animation: fade-in 0.2s ease-out; }
</style>