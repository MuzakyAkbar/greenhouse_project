<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBatchStore } from '../stores/batch'
import { useLocationStore } from '../stores/location'
import { supabase } from '../lib/supabase'
import openbravoApi from '@/lib/openbravo'
// Pastikan komponen ini ada di project Anda, jika belum, buat atau sesuaikan path-nya
import ImageUploadComponent from '@/components/ImageUploadComponent.vue' 
import { updateImageInDB, deleteImage, updateMultipleImagesInDB } from '@/lib/imageUpload';

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const batchStore = useBatchStore()
const locationStore = useLocationStore()

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

// --- EDIT MODE STATE ---
const isEditMode = ref(false)
const editedTypeDamages = ref([])
const editedActivities = ref([])
const typeDamageImages = ref({})
const activityImages = ref({})
const availableMaterials = ref([]) // Untuk validasi stok

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

// --- Material Stock Loader (For Validation) ---
const loadMaterialStock = async () => {
  try {
    // Ambil semua material yang tersedia untuk dicek stoknya
    // Asumsi: Ada tabel gh_material atau kita ambil dari master data yang ada stoknya
    // Jika menggunakan Openbravo, ini mungkin perlu call API OB. 
    // Di sini saya simulasikan ambil dari tabel lokal 'gh_material_stock' atau 'gh_material'
    const { data, error } = await supabase.from('gh_material').select('material_name, stock, uom');
    if (!error && data) {
      availableMaterials.value = data;
    }
  } catch (err) {
    console.error('Error loading material stock:', err);
  }
}

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

const loadData = async () => {
  try {
    loading.value = true;
    await Promise.all([batchStore.getBatches(), locationStore.fetchAll()]);
    // Load available materials for edit validation
    await loadMaterialStock();

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
// EDIT & DATA MANIPULATION LOGIC
// ===========================================

const prepareEditData = () => {
  if (!currentReport.value) return;
  
  // Prepare Type Damages
  if (currentReport.value.type_damages && currentReport.value.type_damages.length > 0) {
    editedTypeDamages.value = currentReport.value.type_damages.map(d => ({
      typedamage_id: d.typedamage_id,
      type_damage: d.type_damage || '',
      kuning: d.kuning || 0,
      kutilang: d.kutilang || 0,
      busuk: d.busuk || 0
    }));
    
    // Load existing images
    // Load existing images dengan format yang benar
    currentReport.value.type_damages.forEach(d => {
      if (d.images && d.images.length > 0) {
        typeDamageImages.value[d.typedamage_id] = d.images.map(img => {
          if (typeof img === 'string') {
            return { url: img, supabaseUrl: img, path: '', bucket: 'images' };
          }
          return {
            url: img.url || img.supabaseUrl || '',
            supabaseUrl: img.url || img.supabaseUrl || '',
            path: img.path || '',
            bucket: img.bucket || 'images'
          };
        });
      }
    });
  } else {
    editedTypeDamages.value = [{ id: Date.now(), type_damage: '', kuning: 0, kutilang: 0, busuk: 0 }];
  }
  
  // Prepare Activities
  if (currentReport.value.activities && currentReport.value.activities.length > 0) {
    editedActivities.value = currentReport.value.activities.map(a => {
      const manpower = parseInt(a.manpower) || 0;
      return {
        activity_id: a.activity_id,
        act_name: a.act_name,
        CoA: a.CoA,
        notes: a.notes || '',
        manpower: manpower,
        materials: (a.materials || []).map(m => ({
          material_used_id: m.material_used_id,
          material_name: m.material_name,
          qty: m.qty,
          uom: m.uom,
          unit_price: m.unit_price || 0,
          total_price: m.total_price || 0
        }))
      };
    });
    
    // Load existing activity images
    // Load existing activity images dengan format yang benar
    currentReport.value.activities.forEach(a => {
      if (a.images && a.images.length > 0) {
        activityImages.value[a.activity_id] = a.images.map(img => {
          if (typeof img === 'string') {
            return { url: img, supabaseUrl: img, path: '', bucket: 'images' };
          }
          return {
            url: img.url || img.supabaseUrl || '',
            supabaseUrl: img.url || img.supabaseUrl || '',
            path: img.path || '',
            bucket: img.bucket || 'images'
          };
        });
      }
    });
  }
};

const toggleEditMode = () => {
  if (!isEditMode.value) {
    prepareEditData();
  }
  isEditMode.value = !isEditMode.value;
};

const saveChanges = async () => {
  if (!confirm('💾 Simpan perubahan data?')) return;
  
  // Validasi Material Stock
  for (const activity of editedActivities.value) {
    for (const mat of activity.materials) {
      if (mat.material_name && mat.qty && parseFloat(mat.qty) > 0) {
        const stockItem = availableMaterials.value.find(m => m.material_name === mat.material_name);
        // Note: Jika material tidak ada di master stock, kita skip validasi atau anggap error.
        // Di sini kita warning saja jika stock tidak cukup.
        if (stockItem && parseFloat(mat.qty) > stockItem.stock) {
          alert(`⚠️ Stock tidak cukup untuk "${mat.material_name}". Stock tersedia: ${stockItem.stock}`);
          return;
        }
      }
    }
  }
  
  try {
    processing.value = true;
    
    // 1. Update Type Damages
    for (const damage of editedTypeDamages.value) {
      if (damage.typedamage_id) {
        await supabase
          .from('gh_type_damage')
          .update({
            type_damage: damage.type_damage || null,
            kuning: damage.kuning || null,
            kutilang: damage.kutilang || null,
            busuk: damage.busuk || null
          })
          .eq('typedamage_id', damage.typedamage_id);
        
        // Update images
        // Update images
      if (typeDamageImages.value[damage.typedamage_id]) {
        const imagesToUpdate = typeDamageImages.value[damage.typedamage_id].map(img => ({
          path: img.path || '',
          url: img.supabaseUrl || img.url || '',
          bucket: img.bucket || 'images'
        }));
        await updateMultipleImagesInDB(damage.typedamage_id, 'type_damage', imagesToUpdate);
      }
      }
    }
    
    // 2. Update Activities
    for (const activity of editedActivities.value) {
      if (activity.activity_id) {
        await supabase
          .from('gh_activity')
          .update({
            notes: activity.notes || null,
            manpower: activity.manpower.toString()
          })
          .eq('activity_id', activity.activity_id);
        
        // Update images
        if (activityImages.value[activity.activity_id]) {
           await updateMultipleImagesInDB(activity.activity_id, 'activity', activityImages.value[activity.activity_id]);
        }
        
        // Update materials
        for (const mat of activity.materials) {
          if (mat.material_used_id) {
            const qty = parseFloat(mat.qty);
            const unitPrice = mat.unit_price || 0;
            await supabase
              .from('gh_material_used')
              .update({
                qty: qty,
                total_price: qty * unitPrice
              })
              .eq('material_used_id', mat.material_used_id);
          }
        }
      }
    }
    
    alert('✅ Perubahan berhasil disimpan!');
    isEditMode.value = false;
    await loadData();
    
  } catch (err) {
    console.error('❌ Save Error:', err);
    alert('❌ Gagal menyimpan: ' + err.message);
  } finally {
    processing.value = false;
  }
};

const handleTypeDamageImageUpload = (event) => {
  const { recordId, allImages } = event;
  typeDamageImages.value[recordId] = allImages || [];
};

const handleActivityImageUpload = (event) => {
  const { recordId, allImages } = event;
  activityImages.value[recordId] = allImages || [];
};

const handleImageDelete = async (event, type) => {
  const { recordId, imagePath, index } = event;
  if(!confirm('Hapus gambar ini?')) return;
  try {
    // Hapus dari storage
    await deleteImage(imagePath, type, recordId);
    
    // Hapus dari state lokal
    if (type === 'type_damage' && typeDamageImages.value[recordId]) {
      typeDamageImages.value[recordId].splice(index, 1);
      if (typeDamageImages.value[recordId].length === 0) {
        delete typeDamageImages.value[recordId];
      }
    } else if (type === 'activity' && activityImages.value[recordId]) {
      activityImages.value[recordId].splice(index, 1);
      if (activityImages.value[recordId].length === 0) {
        delete activityImages.value[recordId];
      }
    }
    
    alert('✅ Gambar berhasil dihapus');
  } catch (error) {
    console.error('Error deleting image:', error);
    alert(`❌ Gagal menghapus gambar: ${error.message}`);
  }
};

// ===========================================
// APPROVAL LOGIC
// ===========================================

const createAndProcessMovement = async (materials, activityName) => {
  // ... (Kode approval logic tetap sama, tidak berubah)
  // [Code disingkat untuk keterbacaan, gunakan logika yang sudah ada di file asli]
  if (!materials || materials.length === 0) return { success: false, errors: 'No materials' };
  if (!warehouseInfo.value.warehouse || !warehouseInfo.value.bin) return { success: false, errors: 'Warehouse/Bin missing' };
  
  const warehouse = warehouseInfo.value.warehouse;
  const bin = warehouseInfo.value.bin;
  let orgId = warehouse.organization?.id || warehouse.organization;

  try {
    const movementPayload = {
      organization: orgId,
      movementType: 'I-',
      movementDate: new Date().toISOString(),
      name: `Material Usage - ${activityName} - ${new Date().toLocaleDateString('id-ID')}`,
      description: `Auto-generated from Greenhouse Activity: ${activityName}`
    };
    const createMovementRes = await openbravoApi.post('/MaterialMgmtMaterialMovement', { data: movementPayload });
    let movementId = null;
    let mData = createMovementRes?.data?.response?.data || createMovementRes?.data?.data || createMovementRes?.data;
    if (Array.isArray(mData) && mData.length > 0) movementId = mData[0].id;
    else if (mData && mData.id) movementId = mData.id;
    if (!movementId) throw new Error('Failed to create movement header');
    
    let successCount = 0;
    const errors = [];
    for (const material of materials) {
        try {
            const escapedName = material.material_name.replace(/'/g, "''");
            const productRes = await openbravoApi.get('/Product', { 
                params: { _where: `name='${escapedName}'`, _selectedProperties: 'id,name,uOM' } 
            });
            const products = productRes?.data?.response?.data || [];
            if (products.length === 0) { errors.push(`Product not found: ${material.material_name}`); continue; }
            const product = products[0];
            let uomId = product.uOM?.id || product.uOM;
            const qty = Math.abs(Number(material.qty) || 0);
            if (qty === 0) continue;

            const linePayload = {
            organization: orgId,
            materialMgmtMaterialMovement: movementId,
            product: product.id,
            movementQuantity: qty,
            uOM: uomId,
            storageBin: bin.id,
            lineNo: (successCount + 1) * 10,
            description: `${material.material_name} - ${activityName}`
            };

            const lineRes = await openbravoApi.post('/MaterialMgmtMaterialMovementLine', { data: linePayload });
            if(lineRes.data) successCount++;
        } catch (lineErr) { errors.push(`${material.material_name}: ${lineErr.message}`); }
    }

    if (successCount > 0) {
      try {
        await openbravoApi.post(`/MaterialMgmtMaterialMovement/${movementId}`, { data: { documentAction: 'CO' } });
        return { success: true, movementId, successCount, errors: errors.length ? errors.join('; ') : null };
      } catch (pErr) {
        return { success: true, movementId, successCount, errors: `Movement created but processing failed. Manual check required.` };
      }
    } else {
      try { await openbravoApi.delete(`/MaterialMgmtMaterialMovement/${movementId}`); } catch(e){}
      return { success: false, movementId: null, errors: `All lines failed: ${errors.join('; ')}` };
    }
  } catch (err) {
    return { success: false, errors: `Critical error: ${err.message}` };
  }
};

const approveCurrentLevel = async () => {
    // ... (Logika approve tetap sama)
    if (!canApproveCurrentLevel.value || !currentUserLevel.value) return;
    const levelName = currentUserLevel.value.level_name;
    if (!confirm(`✅ Approve report ini untuk level "${levelName}"?`)) return;

    try {
        processing.value = true;
        const currentLevelOrder = currentUserLevel.value.level_order;
        const username = authStore.user?.username || authStore.user?.email || 'Admin';

        const { error: updateLevelErr } = await supabase.from('gh_approval_level_status')
        .update({ status: 'approved', approved_by: authStore.user.user_id, approved_at: new Date().toISOString() })
        .eq('record_id', currentReport.value.approval_record_id).eq('level_order', currentLevelOrder);
        if (updateLevelErr) throw updateLevelErr;

        const { data: recData } = await supabase.from('gh_approve_record').select('flow_id').eq('record_id', currentReport.value.approval_record_id).single();
        await supabase.from('gh_approval_history').insert({
        record_id: currentReport.value.approval_record_id, flow_id: recData.flow_id, user_id: authStore.user.user_id,
        level_order: currentLevelOrder, level_name: levelName, action: 'approved', comment: `Approved by ${username}`
        });

        const { data: flowData } = await supabase.from('gh_approve_record').select(`flow_id, gh_approval_flow!inner(last_level)`).eq('record_id', currentReport.value.approval_record_id).single();
        const isFinalLevel = currentLevelOrder === flowData.gh_approval_flow.last_level;

        if (isFinalLevel) {
        await supabase.from('gh_approve_record').update({ overall_status: 'approved', completed_at: new Date().toISOString() }).eq('record_id', currentReport.value.approval_record_id);
        await supabase.from('gh_report').update({ report_status: 'approved' }).eq('report_id', currentReport.value.report_id);
        let successCount = 0;
        for (const activity of currentReport.value.activities) {
            if (activity.materials?.length > 0) {
            const res = await createAndProcessMovement(activity.materials, activity.act_name);
            if (res.success) {
                await supabase.from('gh_activity').update({ openbravo_movement_id: res.movementId, status: 'approved' }).eq('activity_id', activity.activity_id);
                successCount++;
            } else {
                await supabase.from('gh_activity').update({ status: 'approved' }).eq('activity_id', activity.activity_id);
            }
            } else {
            await supabase.from('gh_activity').update({ status: 'approved' }).eq('activity_id', activity.activity_id);
            }
        }
        const { error: updateDamageStatusErr } = await supabase.from('gh_type_damage').update({ status: 'approved' }).eq('report_id', currentReport.value.report_id);
        alert(`✅ Report Fully Approved. ${successCount} material movements processed.`);
        } else {
        await supabase.from('gh_approve_record').update({ current_level_order: currentLevelOrder + 1 }).eq('record_id', currentReport.value.approval_record_id);
        await supabase.from('gh_approval_level_status').update({ status: 'pending' }).eq('record_id', currentReport.value.approval_record_id).eq('level_order', currentLevelOrder + 1);
        alert(`✅ Level ${currentLevelOrder} Approved. Proceeding to next level.`);
        }
        await loadData();
        router.push(sourcePage.value);
    } catch (err) {
        alert('❌ Gagal approve: ' + err.message);
    } finally {
        processing.value = false;
    }
};

const requestRevisionForLevel = async () => {
  // ... (Logika request revision tetap sama)
    if (!canApproveCurrentLevel.value) return;
    if (!revisionModal.value.notes || revisionModal.value.notes.trim().length < 10) {
        alert('⚠️ Catatan revisi minimal 10 karakter'); return;
    }
    if (!confirm('🔄 Kirim permintaan revisi report?')) return;

    try {
        processing.value = true;
        const currentLevel = currentUserLevel.value;
        const { data: recData } = await supabase.from('gh_approve_record').select('flow_id').eq('record_id', currentReport.value.approval_record_id).single();
        await supabase.from('gh_approval_level_status').update({
        status: 'needRevision', revision_notes: revisionModal.value.notes,
        revision_requested_by: authStore.user.user_id, revision_requested_at: new Date().toISOString()
        }).eq('record_id', currentReport.value.approval_record_id).eq('level_order', currentLevel.level_order);
        await supabase.from('gh_approval_history').insert({
        record_id: currentReport.value.approval_record_id, flow_id: recData.flow_id, user_id: authStore.user.user_id,
        level_order: currentLevel.level_order, level_name: currentLevel.level_name, action: 'revision_requested', comment: revisionModal.value.notes
        });
        await supabase.from('gh_approve_record').update({ overall_status: 'needRevision', current_level_order: 1 }).eq('record_id', currentReport.value.approval_record_id);
        await supabase.from('gh_report').update({ report_status: 'needRevision' }).eq('report_id', currentReport.value.report_id);
        await supabase.from('gh_approval_level_status').update({ status: 'pending', approved_by: null, approved_at: null }).eq('record_id', currentReport.value.approval_record_id).neq('level_order', currentLevel.level_order);
        await loadData();
        closeRevisionModal();
        alert('✅ Permintaan revisi dikirim!');
        router.push(sourcePage.value);
    } catch (err) {
        alert('❌ Gagal revisi: ' + err.message);
    } finally {
        processing.value = false;
    }
};

const resubmitReport = async () => {
  if (!currentReport.value || currentReport.value.report_status !== 'needRevision') {
    alert('⚠️ Report ini tidak dalam status needRevision');
    return;
  }
  
  if (!confirm('✅ Kirim ulang laporan ini untuk approval?')) return;

  try {
    processing.value = true;
    const { error: recordErr } = await supabase.from('gh_approve_record').update({ overall_status: 'onReview', current_level_order: 1, completed_at: null }).eq('record_id', currentReport.value.approval_record_id);
    if (recordErr) throw recordErr;
    const { error: levelErr } = await supabase.from('gh_approval_level_status').update({ 
        status: 'pending', approved_by: null, approved_at: null, revision_notes: null, revision_requested_by: null, revision_requested_at: null
      }).eq('record_id', currentReport.value.approval_record_id);
    if (levelErr) throw levelErr;
    const { error: reportErr } = await supabase.from('gh_report').update({ report_status: 'onReview' }).eq('report_id', currentReport.value.report_id);
    if (reportErr) throw reportErr;
    
    if (currentReport.value.type_damages?.length > 0) {
      const damageIds = currentReport.value.type_damages.map(d => d.typedamage_id);
      await supabase.from('gh_type_damage').update({ status: 'onReview' }).in('typedamage_id', damageIds);
    }
    if (currentReport.value.activities?.length > 0) {
      const activityIds = currentReport.value.activities.map(a => a.activity_id);
      await supabase.from('gh_activity').update({ status: 'onReview' }).in('activity_id', activityIds);
    }

    const { data: recData } = await supabase.from('gh_approve_record').select('flow_id').eq('record_id', currentReport.value.approval_record_id).single();
    const username = authStore.user?.username || authStore.user?.email || 'Staff';
    await supabase.from('gh_approval_history').insert({
        record_id: currentReport.value.approval_record_id, flow_id: recData.flow_id, user_id: authStore.user.user_id,
        level_order: 1, level_name: 'Staff', action: 'submitted', comment: `Report revised and resubmitted by ${username}`
      });

    alert('✅ Laporan berhasil dikirim ulang untuk approval!');
    router.push(sourcePage.value);
  } catch (err) {
    console.error('❌ Resubmit Error:', err);
    alert('❌ Gagal mengirim ulang: ' + err.message);
  } finally {
    processing.value = false;
  }
};

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
              Laporan Kegiatan
            </h1>
            <p class="text-sm text-gray-500 mt-1">ID Laporan: #{{ report_id }}</p>
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
          </div>
        </div>

        <div v-if="approvalProgress.length > 0" class="mb-6">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">📊 Progres Persetujuan</h2>
            <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6">
                <div class="space-y-3">
                    <div v-for="level in approvalProgress" :key="level.level_status_id" class="flex items-center gap-4 p-4 rounded-lg" :class="{'bg-green-50 border-2 border-green-200': level.level_status === 'approved', 'bg-yellow-50 border-2 border-yellow-200': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order, 'bg-red-50 border-2 border-red-200': level.level_status === 'needRevision', 'bg-gray-50 border-2 border-gray-200': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order}">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" :class="{'bg-green-500': level.level_status === 'approved', 'bg-blue-500': level.level_status === 'pending' && level.level_order === currentUserLevel?.level_order, 'bg-red-500': level.level_status === 'needRevision', 'bg-gray-400': level.level_status === 'pending' && level.level_order !== currentUserLevel?.level_order}">{{ level.level_order }}</div>
                        <div class="flex-1">
                        <p class="font-bold text-gray-900">{{ level.level_name || currentUserLevel?.level_name || `Level ${level.level_order}` }}</p>
                        <p class="text-sm text-gray-600">
                            <span v-if="level.level_status === 'approved'">✅ Disetujui oleh {{ level.approver_name || 'Admin' }}</span>
                            <span v-else-if="level.level_status === 'needRevision'">🔄 Revisi yang diminta oleh {{ level.revisor_name || 'Admin' }}</span>
                            <span v-else-if="level.level_order === currentUserLevel?.level_order">⏳ Menunggu Disetujui Anda</span>
                            <span v-else>⏸️ Menunggu</span>
                        </p>
                        </div>
                    </div>
                </div>
                <div v-if="canApproveCurrentLevel && currentUserLevel && reportInfo.report_status !== 'approved'" class="mt-6 pt-6 border-t-2 border-gray-100">
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button @click="approveCurrentLevel" :disabled="processing" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">✅ Approve Level {{ currentUserLevel.level_order }}</button>
                        <button @click="openRevisionModal('level', null)" :disabled="processing" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">🔄 Laporan Permintaan Revisi</button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="currentReport?.report_status === 'needRevision'" class="mb-6">
          <div class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3 flex-1">
                <svg class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480L40 480c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
                </svg>
                <div class="flex-1">
                  <h3 class="font-bold text-yellow-800 mb-2">Laporan Memerlukan Revisi</h3>
                  <p class="text-sm text-yellow-700 mb-4 whitespace-pre-wrap">
                    Catatan: {{ approvalProgress.find(p => p.level_status === 'needRevision')?.revision_notes || 'Silakan perbaiki laporan sesuai dengan catatan revisi.' }}
                  </p>
                  
                  <div class="flex flex-wrap gap-3">
                    <button v-if="!isEditMode" @click="toggleEditMode" :disabled="processing" class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50">
                      ✏️ Edit Laporan
                    </button>
                    
                    <button v-if="isEditMode" @click="saveChanges" :disabled="processing" class="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50">
                      {{ processing ? 'Menyimpan...' : '💾 Simpan Perubahan' }}
                    </button>
                    
                    <button v-if="isEditMode" @click="isEditMode = false" :disabled="processing" class="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-bold px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50">
                      ❌ Batal Edit
                    </button>
                    
                    <button v-if="!isEditMode" @click="resubmitReport" :disabled="processing" class="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50">
                      📤 Kirim Ulang Laporan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isEditMode">
            <div v-if="editedTypeDamages.length > 0" class="mb-8">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">✏️ Edit Kerusakan Tanaman</h2>
            <div class="space-y-4">
                <div v-for="(damage, index) in editedTypeDamages" :key="damage.typedamage_id || damage.id" class="bg-white rounded-2xl border-2 border-blue-200 shadow-sm p-6 relative">
                
                <ImageUploadComponent
                    v-if="damage.typedamage_id" 
                    type="type_damage"
                    :recordId="damage.typedamage_id"
                    :existingImages="typeDamageImages[damage.typedamage_id] || []"
                    @upload-success="handleTypeDamageImageUpload"
                    @delete="(e) => handleImageDelete(e, 'type_damage')"
                    :multiple="true"
                    class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
                />
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div class="flex flex-col">
                    <label class="text-sm font-semibold text-gray-700 mb-2">Jenis/Catatan</label>
                    <input v-model="damage.type_damage" type="text" class="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                    </div>
                    <div class="flex flex-col">
                    <label class="text-sm font-semibold text-gray-700 mb-2">🟡 Kuning</label>
                    <input v-model="damage.kuning" type="number" class="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                    </div>
                    <div class="flex flex-col">
                    <label class="text-sm font-semibold text-gray-700 mb-2">🟠 Kutilang</label>
                    <input v-model="damage.kutilang" type="number" class="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                    </div>
                    <div class="flex flex-col">
                    <label class="text-sm font-semibold text-gray-700 mb-2">🔴 Busuk</label>
                    <input v-model="damage.busuk" type="number" class="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                    </div>
                </div>
                </div>
            </div>
            </div>

            <div v-if="editedActivities.length > 0" class="mb-8">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">✏️ Edit Aktivitas</h2>
            <div class="space-y-6">
                <div v-for="(activity, index) in editedActivities" :key="activity.activity_id" class="bg-white rounded-2xl border-2 border-blue-200 shadow-sm p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">{{ index + 1 }}</span>
                    {{ activity.act_name }}
                </h3>
                
                <ImageUploadComponent
                    v-if="activity.activity_id"
                    type="activity"
                    :recordId="activity.activity_id"
                    :existingImages="activityImages[activity.activity_id] || []"
                    @upload-success="handleActivityImageUpload"
                    @delete="(e) => handleImageDelete(e, 'activity')"
                    :multiple="true"
                    class="mb-4 p-4 bg-green-50 rounded-lg border border-green-200"
                />
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                    <div class="flex flex-col">
                    <label class="text-sm font-semibold text-gray-700 mb-2">👷 Tenaga Kerja</label>
                    <input v-model="activity.manpower" type="number" class="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
                    </div>
                    <div class="flex flex-col">
                    <label class="text-sm font-semibold text-gray-700 mb-2">CoA</label>
                    <input :value="activity.CoA" type="text" readonly class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed" />
                    </div>
                </div>
                
                <div class="flex flex-col mb-4">
                    <label class="text-sm font-semibold text-gray-700 mb-2">📝 Catatan</label>
                    <textarea v-model="activity.notes" rows="3" class="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-none"></textarea>
                </div>
                
                <div v-if="activity.materials.length > 0" class="bg-gray-50 rounded-lg p-4">
                    <h4 class="text-sm font-bold text-gray-700 mb-3">📦 Material</h4>
                    <div v-for="(mat, mIndex) in activity.materials" :key="mat.material_used_id" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 bg-white p-3 rounded-lg border">
                    <div class="flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-1">Material</label>
                        <input :value="mat.material_name" type="text" readonly class="px-3 py-2 border rounded-lg bg-gray-50 text-sm cursor-not-allowed" />
                    </div>
                    <div class="flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-1">Jumlah</label>
                        <input v-model="mat.qty" type="number" step="0.01" class="px-3 py-2 border rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
                    </div>
                    <div class="flex flex-col">
                        <label class="text-xs font-semibold text-gray-600 mb-1">Satuan</label>
                        <input :value="mat.uom" type="text" readonly class="px-3 py-2 border rounded-lg bg-gray-50 text-sm cursor-not-allowed" />
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>

        <div v-else class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
          <div class="bg-gradient-to-r from-gray-50 to-white p-5 border-b-2 border-gray-100">
            <h3 class="font-bold text-gray-900 text-lg">Detail Laporan #{{ currentReport.report_id }}</h3>
          </div>

          <div class="p-6 space-y-8">
            <div v-if="envLogData">
                <div class="flex justify-between items-center mb-4">
                 <h4 class="text-lg font-bold text-gray-900 flex items-center gap-2"><span class="text-2xl">🌡️</span> Environment Log</h4>
                 <span class="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded border">Data Referensi Saja</span>
              </div>
              <div class="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                 <span class="text-lg">ℹ️</span><p class="mt-0.5">Data lingkungan ini sebagai referensi kondisi saat laporan dibuat. <b>Status persetujuan laporan tidak mempengaruhi data ini.</b></p>
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
            <div v-else class="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-gray-400 text-sm">Data Catatan Lingkungan tidak tersedia.</div>

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
                        <div class="bg-white rounded-lg p-3"><p class="text-xs text-gray-500 font-semibold mb-1">👷 Tenaga kerja</p><p class="text-sm font-medium text-gray-900">{{ activity.manpower || 0 }} pekerja</p></div>
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-200"><p class="text-xs text-green-600 font-semibold mb-1">💰 Biaya Bahan</p><p class="text-base font-bold text-green-700">{{ formatCurrency(calculateActivityTotal(activity.materials || [])) }}</p></div>
                      </div>
                      <div v-if="activity.notes" class="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Catatan</p>
                        <p class="text-sm text-gray-800">{{ activity.notes }}</p>
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
                        <p class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><span class="text-base">📦</span>Bahan baku ({{ activity.materials.length }})</p>
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead><tr class="border-b-2 border-gray-200"><th class="text-left py-2 px-3 font-semibold text-gray-600">Material</th><th class="text-right py-2 px-3 font-semibold text-gray-600">Jumlah</th><th class="text-right py-2 px-3 font-semibold text-gray-600">UOM</th><th class="text-right py-2 px-3 font-semibold text-gray-600">Total</th></tr></thead>
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
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>
    </div>

    <div v-if="revisionModal.show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2"><span class="text-2xl">🔄</span>Meminta Revisi</h3>
          <button @click="closeRevisionModal" class="text-gray-400 hover:text-gray-600 transition" :disabled="processing">✕</button>
        </div>
        <div class="mb-6"><label class="block text-sm font-semibold text-gray-700 mb-2">Jenis Item</label><div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">📋 Seluruh Laporan (Level {{ currentUserLevel?.level_order }})</div></div>
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