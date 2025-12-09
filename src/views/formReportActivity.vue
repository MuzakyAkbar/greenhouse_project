<script setup>
import { ref, onMounted, watch, onUnmounted, computed, nextTick, onBeforeUnmount } from "vue";
import { supabase } from "@/lib/supabase.js";
import { Html5Qrcode } from "html5-qrcode";
import openbravoApi from '@/lib/openbravo'
import ImageUploadComponent from '@/components/ImageUploadComponent.vue';
import { updateImageInDB, deleteImage, updateMultipleImagesInDB } from '@/lib/imageUpload';
import { useLocationStore } from "@/stores/location";
import { useBatchStore } from "@/stores/batch";
import { useMaterialStore } from "@/stores/material";
import { usePotatoActivityStore } from "@/stores/potatoActivity";
import { useActivityReportStore } from "@/stores/activityReport";
import { useActivityStore } from "@/stores/activity";
import { useTypeDamageStore } from "@/stores/typeDamage";
import { useBatchPhaseStore } from "@/stores/batchPhase";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from 'vue-router';
import logoPG from '../assets/logoPG.svg'

const locationStore = useLocationStore();
const batchStore = useBatchStore();
const materialStore = useMaterialStore();
const potatoActivityStore = usePotatoActivityStore();
const activityReportStore = useActivityReportStore();
const activityStore = useActivityStore();
const typeDamageStore = useTypeDamageStore();
const batchPhaseStore = useBatchPhaseStore();
const authStore = useAuthStore();
const router = useRouter();

const APPROVAL_FLOW_CODE = ref('activity_report');
const flowId = ref(null);
const flowLastLevel = ref(null);

const selectedDate = ref("");
const selectedLocation = ref("");
const selectedBatch = ref("");
const selectedPhase = ref("");
const phaseList = ref([]);
const formData = ref({ batch_id: "", phase_id: "" });
const planningData = ref(null);
const loadingPlanning = ref(false);
const showPlanningSection = ref(false);

// --- Environment Log State ---
const envLogId = ref(null);
const createSession = (time) => ({
  time, temp: '', humid: '', co2: '',
  img_temp: null, img_humid: null, img_co2: null
});

const getInitialEnvData = () => ({
  morning: createSession('07:00'),
  noon: createSession('12:00'),
  afternoon: createSession('16:00'),
  night: createSession('20:00')
});

const envLogData = ref(getInitialEnvData());
const loadingEnv = ref(false);

// ✅ FIX 1: Hapus Icon/Emoticon agar lebih profesional
const sessionLabels = {
  morning: { label: 'Pagi', color: 'orange' },
  noon: { label: 'Siang', color: 'yellow' },
  afternoon: { label: 'Sore', color: 'indigo' },
  night: { label: 'Malam', color: 'slate' }
};

const paramLabels = {
  temp: { label: 'Suhu', unit: '°C' },
  humid: { label: 'Kelembapan', unit: '%' },
  co2: { label: 'CO2', unit: 'PPM' }
};

// State Upload & Kamera Environment
const showSelectionModal = ref(false);
const showCameraModal = ref(false);
const isUploadingEnv = ref(false);
const activeField = ref({ session: null, type: null });
const fileInputEnv = ref(null);

const videoElement = ref(null);
const canvasElement = ref(null);
const mediaStream = ref(null);
const facingMode = ref('environment');
const hasFlash = ref(false);
const isFlashOn = ref(false);

const typeDamages = ref([{ id: Date.now(), type_damage: '', kuning: 0, kutilang: 0, busuk: 0 }]);
const availableMaterials = ref([]);
const materialLoading = ref(false);
const selectedWarehouse = ref(null);
const selectedBin = ref(null);
const showScanner = ref(false);
const isScanning = ref(false);
let html5QrCode = null;
const formSections = ref([{ id: Date.now(), phase_id: "", activity_id: "", coa: "", materials: [{ material_name: "", qty: "", uom: "", unit_price: 0, total_price: 0 }], workers: [{ qty: "" }] }]);
const typeDamageImages = ref({});
const activityImages = ref({});
const uploadingImages = ref({});
const isSubmitting = ref(false);

const locations = computed(() => locationStore.locations);
const batches = computed(() => batchStore.batches);
const materialStocks = computed(() => materialStore.materialStock);
const potatoActivities = computed(() => potatoActivityStore.activities);

const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0);

const loadApprovalFlowInfo = async () => {
  try {
    const { data, error } = await supabase.from('gh_approval_flow').select('flow_id, last_level').eq('code_name', APPROVAL_FLOW_CODE.value).single();
    if (error) throw error;
    flowId.value = data.flow_id;
    flowLastLevel.value = data.last_level;
  } catch (err) {
    console.error('❌ Error loading approval flow info:', err);
  }
};

// --- Fetch Environment Log Function ---
const fetchEnvironmentLog = async () => {
  if (!selectedLocation.value || !selectedDate.value) {
    resetEnvData();
    return;
  }
  loadingEnv.value = true;
  try {
    const { data } = await supabase.from('gh_environment_log')
      .select('*')
      .eq('log_date', selectedDate.value)
      .eq('location_id', selectedLocation.value)
      .maybeSingle();

    if (data) {
      envLogId.value = data.env_id;
      const sessions = ['morning', 'noon', 'afternoon', 'night'];
      sessions.forEach(key => {
        if(data[`time_${key}`]) envLogData.value[key].time = data[`time_${key}`];
        envLogData.value[key].temp = data[`temp_${key}`] || '';
        envLogData.value[key].img_temp = data[`img_temp_${key}`] || null;
        
        envLogData.value[key].humid = data[`humid_${key}`] || '';
        envLogData.value[key].img_humid = data[`img_humid_${key}`] || null;
        
        envLogData.value[key].co2 = data[`co2_${key}`] || '';
        envLogData.value[key].img_co2 = data[`img_co2_${key}`] || null;
      });
    } else {
      resetEnvData();
    }
  } catch (err) {
    console.error("Error fetching env log:", err);
  } finally {
    loadingEnv.value = false;
  }
};

const resetEnvData = () => {
  envLogId.value = null;
  envLogData.value = getInitialEnvData();
};

// === ENVIRONMENT UPLOAD & CAMERA LOGIC ===
const openUploadSelector = (session, type) => {
  if (!selectedLocation.value || !selectedDate.value) return alert("Pilih Tanggal & Lokasi dulu!");
  activeField.value = { session, type };
  showSelectionModal.value = true;
};

const handleEnvFileUpload = async (file) => {
  if (!file) return;
  isUploadingEnv.value = true;
  showSelectionModal.value = false;
  showCameraModal.value = false;

  try {
    const { session, type } = activeField.value;
    const bucket = 'gh_environment_condition';
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    
    // ✅ FIX 2: Storage path menggunakan folder Tanggal
    // Path: environment/2025-12-08/LocationID_Session_Type_Timestamp.jpg
    const folderDate = selectedDate.value;
    const path = `environment/${folderDate}/${selectedLocation.value}_${session}_${type}_${timestamp}.${ext}`;

    const oldUrl = envLogData.value[session][`img_${type}`];
    if (oldUrl) {
      try {
        const oldPathMatch = oldUrl.match(/environment\/(.+)$/);
        if (oldPathMatch) {
          await supabase.storage.from(bucket).remove([oldPathMatch[0]]);
        }
      } catch (e) { console.log('Could not remove old file:', e); }
    }

    const { data: uploadData, error } = await supabase.storage.from(bucket).upload(path, file, { 
      cacheControl: '3600',
      upsert: false 
    });
    
    if (error) throw new Error(error.message || 'Upload gagal');

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    envLogData.value[session][`img_${type}`] = data.publicUrl;
    
    alert('✅ Foto berhasil diupload!');

  } catch (err) {
    console.error('Error detail:', err);
    alert("❌ Gagal upload: " + err.message);
  } finally {
    isUploadingEnv.value = false;
    stopCamera();
  }
};

const onEnvFileSelected = (e) => {
  if (e.target.files.length > 0) handleEnvFileUpload(e.target.files[0]);
};

const triggerEnvFileInput = () => {
  if (fileInputEnv.value) fileInputEnv.value.click();
};

const openCamera = async () => {
  showSelectionModal.value = false;
  showCameraModal.value = true;
  await nextTick();
  startCamera();
};

const startCamera = async () => {
  if (mediaStream.value) stopCamera();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: facingMode.value, width: { ideal: 1280 }, height: { ideal: 720 } } 
    });
    mediaStream.value = stream;
    if (videoElement.value) videoElement.value.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    hasFlash.value = !!capabilities.torch;
  } catch (err) {
    alert("Gagal akses kamera.");
    showCameraModal.value = false;
  }
};

const stopCamera = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(t => t.stop());
    mediaStream.value = null;
  }
};

const switchCamera = () => {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment';
  startCamera();
};

const takePhoto = () => {
  const video = videoElement.value;
  const canvas = canvasElement.value;
  if (!video || !canvas) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (facingMode.value === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    const file = new File([blob], `cam_${Date.now()}.jpg`, { type: 'image/jpeg' });
    handleEnvFileUpload(file);
  }, 'image/jpeg', 0.8);
};

const fetchPlanningData = async () => {
  if (!selectedLocation.value || !selectedBatch.value) {
    planningData.value = null;
    showPlanningSection.value = false;
    return;
  }
  loadingPlanning.value = true;
  try {
    const { data, error } = await supabase.from('gh_planning_report').select(`planning_id, planning_date, phase_plan, status, gh_planning_activity (activity_id, act_name, coa, manpower, order_index, gh_planning_material (material_id, material_name, qty, uom))`).eq('location_id', selectedLocation.value).eq('batch_id', selectedBatch.value).eq('planning_date', selectedDate.value).eq('status', 'approved').order('planning_id', { ascending: false }).limit(1);
    if (error) throw error;
    if (data && data.length > 0) {
      planningData.value = data[0];
      showPlanningSection.value = true;
      if (planningData.value.phase_plan) selectedPhase.value = planningData.value.phase_plan;
    } else {
      planningData.value = null;
      showPlanningSection.value = false;
    }
  } catch (err) {
    console.error('❌ Error in fetchPlanningData:', err);
    planningData.value = null;
    showPlanningSection.value = false;
  } finally {
    loadingPlanning.value = false;
  }
};

const loadWarehouseAndBin = async (locationName) => {
  if (!locationName) {
    selectedWarehouse.value = null;
    selectedBin.value = null;
    return;
  }
  try {
    const warehouseRes = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Warehouse', { params: { _where: `name='${locationName}'` } });
    const warehouses = warehouseRes?.data?.response?.data || [];
    if (!warehouses.length) {
      selectedWarehouse.value = null;
      selectedBin.value = null;
      return;
    }
    const warehouse = warehouses[0];
    selectedWarehouse.value = warehouse;
    const binRes = await openbravoApi.get('/org.openbravo.service.json.jsonrest/Locator', { params: { _where: `M_Warehouse_ID='${warehouse.id}'` } });
    const bins = binRes?.data?.response?.data || [];
    if (!bins.length) {
      selectedBin.value = null;
      return;
    }
    selectedBin.value = bins[0];
    await loadMaterialsByBin(bins[0].id);
  } catch (err) {
    console.error('❌ Error loading warehouse/bin:', err);
    selectedWarehouse.value = null;
    selectedBin.value = null;
  }
};

const loadMaterialsByBin = async (binId) => {
  if (!binId) {
    availableMaterials.value = [];
    return;
  }
  materialLoading.value = true;
  try {
    const materialsRes = await openbravoApi.get('/org.openbravo.service.json.jsonrest/MaterialMgmtStorageDetail', { params: { _where: `M_Locator_ID='${binId}' AND quantityOnHand > 0` } });
    const rows = materialsRes?.data?.response?.data || [];
    const materialsWithPrice = await Promise.all(rows.map(async (r) => {
      const price = await getMaterialPrice(r['product$_identifier'], r.product);
      return { productId: r.product, material_name: r['product$_identifier'] || '(Tanpa Nama Produk)', uomId: r.uOM, uom: r['uOM$_identifier'] || null, stock: r.quantityOnHand ?? 0, unit_price: price };
    }));
    availableMaterials.value = materialsWithPrice;
  } catch (err) {
    console.error('❌ Error loading materials:', err);
    availableMaterials.value = [];
  } finally {
    materialLoading.value = false;
  }
};

const getMaterialPrice = async (materialName) => {
  try {
    const stockItem = availableMaterials.value.find(m => m.material_name === materialName);
    if (!stockItem || !stockItem.productId) return 0;
    const costingRes = await openbravoApi.get('/org.openbravo.service.json.jsonrest/MaterialMgmtCosting', { params: { _where: `product='${stockItem.productId}'`, _orderBy: 'updated desc', _maxResults: 50 } });
    const costings = costingRes?.data?.response?.data || [];
    if (costings.length > 0) {
      const latestCosting = costings[0];
      return parseFloat(latestCosting.price) || 0;
    }
    return 0;
  } catch (err) {
    console.error(`❌ Error fetching price:`, err);
    return 0;
  }
};

const startScanner = async () => {
  showScanner.value = true;
  isScanning.value = true;
  await new Promise(resolve => setTimeout(resolve, 100));
  try {
    const element = document.getElementById("qr-reader");
    if (!element) {
      alert("Error: Scanner element not found");
      stopScanner();
      return;
    }
    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanError);
  } catch (err) {
    alert("Gagal membuka kamera. Pastikan izin kamera telah diberikan.");
    stopScanner();
  }
};

const onScanSuccess = async (decodedText) => {
  try {
    const data = JSON.parse(decodedText);
    const locationId = Number(data.location_id);
    const batchId = Number(data.batch_id);
    selectedLocation.value = locationId;
    selectedBatch.value = batchId;
    let locationItem = locations.value.find(l => Number(l.location_id) === locationId);
    const locationName = locationItem?.location || "Lokasi tidak ditemukan";
    let batchItem = batches.value.find(b => Number(b.batch_id) === batchId);
    if (!batchItem) {
      const { data: batchData, error } = await supabase.from("gh_batch").select("batch_id, batch_name").eq("batch_id", batchId).single();
      if (!error && batchData) batchItem = batchData;
    }
    const batchName = batchItem?.batch_name || "Batch tidak ditemukan";
    alert(`✅ QR Code berhasil di-scan!\n📍 Lokasi: ${locationName}\n🏷️ Batch: ${batchName}`);
    await loadWarehouseAndBin(locationName);
    stopScanner();
  } catch (err) {
    alert("❌ QR Code tidak valid!");
  }
};

const onScanError = () => {};

const stopScanner = () => {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(() => { html5QrCode.clear(); html5QrCode = null; showScanner.value = false; isScanning.value = false; }).catch(() => { showScanner.value = false; isScanning.value = false; });
  } else {
    showScanner.value = false;
    isScanning.value = false;
  }
};

function addTypeDamageRow() { typeDamages.value.push({ id: Date.now(), type_damage: "", kuning: 0, kutilang: 0, busuk: 0 }); }
function removeTypeDamageRow(index) { if (typeDamages.value.length > 1) { const damageId = typeDamages.value[index].id; if (typeDamageImages.value[damageId]) delete typeDamageImages.value[damageId]; typeDamages.value.splice(index, 1); } }
function addFormSection() { formSections.value.push({ id: Date.now(), phase_id: selectedPhase.value, activity_id: "", coa: "", materials: [{ material_name: "", qty: "", uom: "", unit_price: 0, total_price: 0 }], workers: [{ qty: "" }] }); }
function removeFormSection(index) { if (formSections.value.length > 1) { const sectionId = formSections.value[index].id; if (activityImages.value[sectionId]) delete activityImages.value[sectionId]; formSections.value.splice(index, 1); } }
function addMaterialRow(i) { formSections.value[i].materials.push({ material_name: "", qty: "", uom: "", unit_price: 0, total_price: 0 }); }
function removeMaterialRow(sectionIndex, matIndex) { if (formSections.value[sectionIndex].materials.length > 1) formSections.value[sectionIndex].materials.splice(matIndex, 1); }
function addWorkerRow(sectionIndex) { formSections.value[sectionIndex].workers.push({ qty: "" }); }
function removeWorkerRow(sectionIndex, workerIndex) { if (formSections.value[sectionIndex].workers.length > 1) formSections.value[sectionIndex].workers.splice(workerIndex, 1); }

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
  try {
    await deleteImage(imagePath, type, recordId);
    if (type === 'type_damage' && typeDamageImages.value[recordId]) {
      typeDamageImages.value[recordId].splice(index, 1);
      if (typeDamageImages.value[recordId].length === 0) delete typeDamageImages.value[recordId];
    } else if (activityImages.value[recordId]) {
      activityImages.value[recordId].splice(index, 1);
      if (activityImages.value[recordId].length === 0) delete activityImages.value[recordId];
    }
    alert('✅ Gambar berhasil dihapus');
  } catch (error) {
    alert(`Gagal menghapus gambar: ${error.message}`);
  }
};

const handleImagesUpdated = () => {};
const handleImageUploadError = (event) => { alert(`❌ Error: ${event.error}`); };

const submitActivityReport = async () => {
  if (!selectedBatch.value || !selectedLocation.value) {
    alert("⚠️ Pilih lokasi dan batch!");
    return;
  }
  if (!selectedPhase.value) {
    alert("⚠️ Pilih Phase!");
    return;
  }
  if (isSubmitting.value) return;

  for (const section of formSections.value) {
    if (!section.activity_id) {
      alert("⚠️ Pilih Activity untuk setiap form!");
      return;
    }
  }

  // Material Validation
  const allMaterials = [];
  for (const section of formSections.value) {
    for (const mat of section.materials) {
      if (mat.material_name && mat.qty && parseFloat(mat.qty) > 0) {
        allMaterials.push({ material_name: mat.material_name, qty: mat.qty, uom: mat.uom });
      }
    }
  }

  if (allMaterials.length > 0) {
    for (const material of allMaterials) {
      const stockItem = availableMaterials.value.find(m => m.material_name === material.material_name);
      if (!stockItem) {
        alert(`⚠️ Material "${material.material_name}" tidak ditemukan!`);
        return;
      }
      if (parseFloat(material.qty) > stockItem.stock) {
        alert(`⚠️ Stock tidak cukup untuk "${material.material_name}"`);
        return;
      }
    }
  }

  isSubmitting.value = true;
  try {
    // -----------------------------------------------------
    // 0. HANDLE ENVIRONMENT LOG
    // -----------------------------------------------------
    const hasEnvData = Object.values(envLogData.value).some(s => 
      s.temp || s.humid || s.co2 || s.img_temp || s.img_humid || s.img_co2
    );

    if (hasEnvData) {
        const envPayload = {
            log_date: selectedDate.value,
            location_id: Number(selectedLocation.value),
            created_by: authStore.user.user_id
        };
        const sessions = ['morning', 'noon', 'afternoon', 'night'];
        sessions.forEach(s => {
            envPayload[`time_${s}`] = envLogData.value[s].time;
            
            envPayload[`temp_${s}`] = envLogData.value[s].temp || null;
            envPayload[`img_temp_${s}`] = envLogData.value[s].img_temp || null;
            
            envPayload[`humid_${s}`] = envLogData.value[s].humid || null;
            envPayload[`img_humid_${s}`] = envLogData.value[s].img_humid || null;
            
            envPayload[`co2_${s}`] = envLogData.value[s].co2 || null;
            envPayload[`img_co2_${s}`] = envLogData.value[s].img_co2 || null;
        });

        const envQuery = envLogId.value 
            ? supabase.from('gh_environment_log').update(envPayload).eq('env_id', envLogId.value)
            : supabase.from('gh_environment_log').insert([envPayload]);
        
        const { error: envError } = await envQuery;
        if(envError) throw new Error("Gagal menyimpan Environment Log: " + envError.message);
    }

    // 1. Create gh_report
    const reportPayload = {
      batch_id: Number(selectedBatch.value),
      location_id: Number(selectedLocation.value),
      report_date: selectedDate.value,
      report_status: 'onReview',
      phase_id: selectedPhase.value || null
    };

    const { data: reportData, error: reportErr } = await supabase.from('gh_report').insert([reportPayload]).select().single();
    if (reportErr) throw reportErr;
    const report_id = reportData.report_id;

    // 1.1 Approval Record
    const currentUser = authStore.user.user_id;
    const { data: recordId, error: initErr } = await supabase.rpc('initialize_approval_record', {
      p_flow_code_name: APPROVAL_FLOW_CODE.value,
      p_reference_id: report_id,
      p_reference_type: 'gh_report',
      p_submitted_by: currentUser
    });

    if (!initErr && recordId) {
      await supabase.from('gh_report').update({ approval_record_id: recordId }).eq('report_id', report_id);
    }

    // 2. Create type_damages
    const validDamages = typeDamages.value.filter(damage => {
      const hasQty = (damage.kuning && parseFloat(damage.kuning) > 0) || (damage.kutilang && parseFloat(damage.kutilang) > 0) || (damage.busuk && parseFloat(damage.busuk) > 0);
      const hasImage = !!(typeDamageImages.value[damage.id] && typeDamageImages.value[damage.id].length > 0);
      return hasQty || hasImage;
    });

    if (validDamages.length > 0) {
      const damagePayloads = validDamages.map(damage => ({
        report_id,
        type_damage: damage.type_damage || null,
        kuning: damage.kuning ? parseInt(damage.kuning) : null,
        kutilang: damage.kutilang ? parseInt(damage.kutilang) : null,
        busuk: damage.busuk ? parseInt(damage.busuk) : null,
        images: [],
        _tempId: damage.id
      }));

      const { data: insertedDamageData, error: tdErr } = await supabase.from('gh_type_damage').insert(damagePayloads.map(p => ({ report_id: p.report_id, type_damage: p.type_damage, kuning: p.kuning, kutilang: p.kutilang, busuk: p.busuk, images: p.images }))).select();
      if (tdErr) throw tdErr;

      // Link images to damages
      for (let i = 0; i < insertedDamageData.length; i++) {
        const damage = insertedDamageData[i];
        const tempId = validDamages[i].id;
        if (typeDamageImages.value[tempId] && typeDamageImages.value[tempId].length > 0) {
          try {
            const imagesToUpdate = typeDamageImages.value[tempId].map(img => ({
              path: img.path || '',
              url: img.supabaseUrl || img.url || '',
              bucket: img.bucket || ''
            }));
            await updateMultipleImagesInDB(damage.typedamage_id, 'type_damage', imagesToUpdate);
          } catch (imgErr) {
            console.error(`⚠️ Error linking images:`, imgErr);
          }
        }
      }
    }

    // 3. Create activities
    for (const section of formSections.value) {
      const manpowerTotal = section.workers.reduce((sum, w) => sum + (parseInt(w.qty) || 0), 0);
      const selectedActivity = potatoActivities.value.find(a => a.activity_id == section.activity_id);

      const activityPayload = {
        report_id,
        act_name: selectedActivity?.activity || "",
        CoA: section.coa ? parseFloat(section.coa) : null,
        manpower: manpowerTotal.toString(),
        images: []
      };

      const { data: activityData, error: actErr } = await supabase.from('gh_activity').insert([activityPayload]).select().single();
      if (actErr) throw actErr;
      const activity_id = activityData.activity_id;

      // Link activity images
      if (activityImages.value[section.id] && activityImages.value[section.id].length > 0) {
        try {
          const imagesToUpdate = activityImages.value[section.id].map(img => ({
            path: img.path || '',
            url: img.supabaseUrl || img.url || '',
            bucket: img.bucket || ''
          }));
          await updateMultipleImagesInDB(activity_id, 'activity', imagesToUpdate);
        } catch (imgErr) {
          console.error(`⚠️ Error linking activity images:`, imgErr);
        }
      }

      // Create materials
      const validMaterials = section.materials.filter(mat => mat.material_name && mat.qty && parseFloat(mat.qty) > 0);
      if (validMaterials.length > 0) {
        const materialPayloads = await Promise.all(validMaterials.map(async (mat) => {
          const qty = parseFloat(mat.qty);
          const unitPrice = await getMaterialPrice(mat.material_name);
          const totalPrice = qty * unitPrice;
          return { activity_id, material_name: mat.material_name, qty: qty, uom: mat.uom || null, unit_price: unitPrice, total_price: totalPrice };
        }));

        const { error: matErr } = await supabase.from('gh_material_used').insert(materialPayloads);
        if (matErr) throw matErr;
      }
    }

    alert(`✅ Data berhasil disimpan!\nReport ID: ${report_id}`);
    resetForm();

  } catch (err) {
    console.error("❌ Submit Error:", err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
};

function resetForm() {
  selectedLocation.value = "";
  selectedBatch.value = "";
  selectedPhase.value = "";
  selectedWarehouse.value = null;
  selectedBin.value = null;
  availableMaterials.value = [];
  planningData.value = null;
  showPlanningSection.value = false;
  typeDamages.value = [{ id: Date.now(), type_damage: "", kuning: 0, kutilang: 0, busuk: 0 }];
  formSections.value = [{ id: Date.now(), phase_id: "", activity_id: "", coa: "", materials: [{ material_name: "", qty: "", uom: "", unit_price: 0, total_price: 0 }], workers: [{ qty: "" }] }];
  selectedDate.value = new Date().toISOString().split("T")[0];
  typeDamageImages.value = {};
  activityImages.value = {};
  uploadingImages.value = {};
  resetEnvData();
}

function getLocationName(locationId) {
  const location = locations.value.find(l => l.location_id == locationId);
  return location ? location.location : "";
}

function getBatchName(batchId) {
  const batch = batches.value.find(b => b.batch_id == batchId);
  return batch ? batch.batch_name : "";
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Watchers
watch([selectedLocation, selectedBatch, selectedDate], () => { 
  fetchPlanningData(); 
});

watch([selectedLocation, selectedDate], () => {
    fetchEnvironmentLog();
});

watch(selectedBatch, async (batch) => {
  formData.value.batch_id = batch;
  const locationName = selectedLocation.value ? getLocationName(selectedLocation.value) : null;
  if(locationName) await loadWarehouseAndBin(locationName);
  if (batch) {
    phaseList.value = await batchPhaseStore.fetchPhasesForBatch(batch);
  } else {
    phaseList.value = [];
  }
});

watch(selectedPhase, (newPhase) => {
  formSections.value.forEach(section => { section.phase_id = newPhase; });
});

watch(formSections, (sections) => {
  sections.forEach((s) => {
    const selected = potatoActivities.value.find((a) => a.activity_id == s.activity_id);
    s.coa = selected ? selected.CoA_code : "";
  });
}, { deep: true });

watch(formSections, (sections) => {
  sections.forEach((section) => {
    section.materials.forEach((material) => {
      if (material.material_name) {
        const selectedMaterial = availableMaterials.value.find((m) => m.material_name === material.material_name);
        if (selectedMaterial) {
          material.uom = selectedMaterial.uom || "";
          material.unit_price = selectedMaterial.unit_price || 0;
          const qty = parseFloat(material.qty) || 0;
          material.total_price = qty * material.unit_price;
        }
      } else {
        material.uom = "";
        material.unit_price = 0;
        material.total_price = 0;
      }
    });
  });
}, { deep: true });

onMounted(async () => {
  selectedDate.value = new Date().toISOString().split("T")[0];
  try {
    await Promise.all([
      locationStore.fetchAll(),
      batchStore.getBatches(),
      potatoActivityStore.fetchAll(),
      loadApprovalFlowInfo(),
    ]);
  } catch (error) {
    alert("Gagal memuat data. Silakan refresh.");
  }
});

onUnmounted(() => { stopScanner(); stopCamera(); });
onBeforeUnmount(() => stopCamera());
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex items-center gap-4">
          <router-link
            to="/dashboard"
            class="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg class="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
              <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
            </svg>
          </router-link>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white text-lg">
                📝
              </span>
              Form Activity Report
            </h1>
            <p class="text-sm text-gray-500 mt-1 ml-13">Input Aktivitas Harian GreenHouse</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Informasi Dasar</h2>
          <button
            @click="startScanner"
            class="flex items-center gap-2 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white px-4 py-2.5 rounded-xl transition font-medium text-sm shadow-md hover:shadow-lg"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/>
            </svg>
            Scan QR Code
          </button>
        </div>

        <div class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div class="flex flex-col">
              <label class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192z"/>
                  </svg>
                </div>
                <span>Tanggal</span>
              </label>
              <input 
                type="date" 
                disabled 
                v-model="selectedDate" 
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition cursor-not-allowed"
              />
              <span class="text-xs text-gray-500 mt-2">Tanggal hari ini otomatis</span>
            </div>

            <div class="flex flex-col">
              <label class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span class="text-lg leading-none">🌱</span>
                </div>
                <span>Phase</span>
              </label>
              <select 
                v-model="selectedPhase"
                :disabled="!selectedBatch"
                class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Pilih Phase</option>
                <option 
                  v-for="p in phaseList" 
                  :key="p.phase_id" 
                  :value="p.phase_id"
                >
                  {{ p.phase_name }}
                </option>
              </select>
              <span class="text-xs text-gray-500 mt-2">
                {{ selectedBatch ? 'Pilih phase untuk batch' : 'Pilih batch terlebih dahulu' }}
              </span>
            </div>

            <div class="flex flex-col">
              <label class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span class="text-lg leading-none">📍</span>
                </div>
                <span>Lokasi</span>
              </label>
              <div class="relative">
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium min-h-[48px] flex items-center">
                  <span v-if="selectedLocation" class="truncate">
                    {{ getLocationName(selectedLocation) }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">
                    Scan QR Code untuk mengisi
                  </span>
                </div>
                <div v-if="selectedLocation" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <span class="text-xs text-gray-500 mt-2">
                {{ selectedLocation ? '✓ Lokasi terdeteksi' : 'Gunakan tombol Scan QR Code' }}
              </span>
            </div>

            <div class="flex flex-col">
              <label class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span class="text-lg leading-none">🏷️</span>
                </div>
                <span>Batch</span>
              </label>
              <div class="relative">
                <div class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium min-h-[48px] flex items-center">
                  <span v-if="selectedBatch" class="truncate">
                    {{ getBatchName(selectedBatch) }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">
                    Scan QR Code untuk mengisi
                  </span>
                </div>
                <div v-if="selectedBatch" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <span class="text-xs text-gray-500 mt-2">
                {{ selectedBatch ? '✓ Batch terdeteksi' : 'Gunakan tombol Scan QR Code' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedLocation" class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span class="text-lg">🌡️</span>
          Environment Log (Kondisi Lingkungan)
        </h2>
        
        <div v-if="loadingEnv" class="py-10 text-center text-gray-500 bg-white rounded-2xl border-2 border-gray-100">Sedang memuat data lingkungan...</div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div v-for="(sessionData, sessionKey) in envLogData" :key="sessionKey" 
                 class="bg-white rounded-xl border shadow-sm flex flex-col h-full overflow-hidden"
                 :class="{
                    'border-orange-200': sessionKey === 'morning',
                    'border-yellow-200': sessionKey === 'noon',
                    'border-indigo-200': sessionKey === 'afternoon',
                    'border-slate-200': sessionKey === 'night'
                 }">
              
              <div class="p-3 border-b flex justify-between items-center"
                   :class="{
                     'bg-orange-50': sessionKey === 'morning',
                     'bg-yellow-50': sessionKey === 'noon',
                     'bg-indigo-50': sessionKey === 'afternoon',
                     'bg-slate-50': sessionKey === 'night',
                   }">
                <div class="flex items-center gap-2 font-bold capitalize"
                     :class="{
                       'text-orange-700': sessionKey === 'morning',
                       'text-yellow-700': sessionKey === 'noon',
                       'text-indigo-700': sessionKey === 'afternoon',
                       'text-slate-700': sessionKey === 'night',
                     }">
                   {{ sessionLabels[sessionKey].label }}
                </div>
                <div class="text-right">
                    <input type="time" v-model="sessionData.time" class="bg-white border rounded text-xs p-1 w-20 text-center cursor-pointer hover:border-blue-500">
                </div>
              </div>

              <div class="p-4 space-y-4 flex-1">
                <div v-for="(label, type) in paramLabels" :key="type" class="flex flex-col gap-1">
                   <div class="flex justify-between items-end">
                       <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{{ label.label }}</label>
                       <span v-if="sessionData[`img_${type}`]" class="text-[10px] text-green-600 font-bold flex items-center gap-1 bg-green-50 px-1 rounded">
                         ✓ Ada
                       </span>
                   </div>
                   
                   <div class="flex gap-2 items-center">
                     <div class="relative flex-1">
                        <input type="number" step="0.1" v-model="sessionData[type]" 
                               class="w-full border border-gray-300 p-2.5 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none h-[44px]"
                               placeholder="0">
                        <span class="absolute right-3 top-2.5 text-gray-400 text-xs">{{ label.unit }}</span>
                     </div>
                     
                     <button 
                        @click="openUploadSelector(sessionKey, type)"
                        class="w-[44px] h-[44px] flex-shrink-0 rounded-lg border flex items-center justify-center transition overflow-hidden shadow-sm hover:shadow-md"
                        :class="sessionData[`img_${type}`] ? 'border-green-300 bg-white ring-2 ring-green-100' : 'bg-gray-50 border-gray-300 hover:border-blue-400 hover:text-blue-500 text-gray-400'"
                        title="Upload Bukti Foto"
                     >
                        <img v-if="sessionData[`img_${type}`]" :src="sessionData[`img_${type}`]" class="w-full h-full object-cover">
                        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                     </button>
                   </div>
                </div>
              </div>
            </div>
        </div>
        <p class="text-xs text-gray-400 mt-3 text-right">*Data lingkungan akan disimpan bersamaan saat tombol Submit Report ditekan.</p>
      </div>

      <div v-if="showPlanningSection && planningData" class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span class="text-lg">📋</span>
          Planning Hari Ini
        </h2>
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-lg p-6">
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-blue-200">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM112 256l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-gray-900">Planning Activities</h3>
                <p class="text-sm text-gray-600">{{ formatDate(planningData.planning_date) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                Phase: {{ planningData.phase_plan }}
              </span>
              <span class="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                {{ planningData.status }}
              </span>
            </div>
          </div>

          <div class="space-y-4">
            <div 
              v-for="(activity, idx) in planningData.gh_planning_activity" 
              :key="activity.activity_id"
              class="bg-white rounded-xl border-2 border-blue-100 p-5 hover:shadow-md transition-all"
            >
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {{ idx + 1 }}
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 text-lg">{{ activity.act_name }}</h4>
                    <div class="flex items-center gap-4 mt-1">
                      <span class="text-sm text-gray-600">
                        <span class="font-semibold">CoA:</span> {{ activity.coa || 'N/A' }}
                      </span>
                      <span class="text-sm text-gray-600 flex items-center gap-1">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                          <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"/>
                        </svg>
                        <span class="font-semibold">Manpower:</span> {{ activity.manpower }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="activity.gh_planning_material && activity.gh_planning_material.length > 0" class="mt-4">
                <h5 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M234.5 5.7c13.9-5 29.1-5 43.1 0l192 68.6C495 83.4 512 107.5 512 134.6l0 242.9c0 27-17 51.2-42.5 60.3l-192 68.6c-13.9 5-29.1 5-43.1 0l-192-68.6C17 428.6 0 404.5 0 377.4L0 134.6c0-27 17-51.2 42.5-60.3l192-68.6zM256 66L82.3 128 256 190l173.7-62L256 66zm32 368.6l160-57.1 0-188L288 246.6l0 188z"/>
                  </svg>
                  Materials Needed
                </h5>
                <div class="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  <table class="w-full">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Material</th>
                        <th class="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                        <th class="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Unit</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      <tr v-for="material in activity.gh_planning_material" :key="material.material_id" class="hover:bg-blue-50 transition">
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ material.material_name }}</td>
                        <td class="px-4 py-3 text-sm text-center font-semibold text-gray-700">{{ formatNumber(material.qty) }}</td>
                        <td class="px-4 py-3 text-sm text-center text-gray-600">{{ material.uom }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div v-else class="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p class="text-sm text-gray-500 text-center">Tidak ada material untuk aktivitas ini</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingPlanning" class="mb-8">
        <div class="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-8">
          <div class="flex items-center justify-center gap-3">
            <svg class="w-6 h-6 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M304 48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1 48 48 0 1 0 142.9 437zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437A48 48 0 1 0 437 369.1 48 48 0 1 0 369.1 437z"/>
            </svg>
            <span class="text-gray-600 font-medium">Memuat data planning...</span>
          </div>
        </div>
      </div>

      <div v-if="!loadingPlanning && selectedLocation && selectedBatch && !planningData" class="mb-8">
        <div class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
              <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480L40 480c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
            </svg>
            <div>
              <h3 class="font-bold text-yellow-800 mb-1">Tidak Ada Planning Untuk Hari Ini</h3>
              <p class="text-sm text-yellow-700">
                Tidak ditemukan planning untuk tanggal <span class="font-semibold">{{ formatDate(selectedDate) }}</span> 
                di lokasi <span class="font-semibold">{{ getLocationName(selectedLocation) }}</span>.
                Silakan isi form aktivitas secara manual.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Jenis Kerusakan Tanaman</h2>
        </div>
        <div class="space-y-4">
          <div 
            v-for="(damage, index) in typeDamages" 
            :key="damage.id"
            class="bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all p-6 relative"
          >
            <button
              @click="removeTypeDamageRow(index)"
              v-if="typeDamages.length > 1"
              class="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-lg flex items-center justify-center transition shadow-md hover:shadow-lg"
              title="Hapus Row"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
              </svg>
            </button>
            
            <ImageUploadComponent
              v-if="damage.id" 
              type="type_damage"
              :recordId="damage.id"
              :existingImages="typeDamageImages[damage.id] || []"
              @upload-success="handleTypeDamageImageUpload"
              @upload-error="handleImageUploadError"
              @delete="(e) => handleImageDelete(e, 'type_damage')"
              @images-updated="handleImagesUpdated"
              :multiple="true"
              class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
            />
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div class="flex flex-col md:col-span-1">
                <label class="text-sm font-semibold text-gray-700 mb-2">
                  Jenis/Catatan (Opsional)
                </label>
                <input
                  v-model="damage.type_damage"
                  type="text"
                  placeholder="Misal: Hama, Penyakit, dll"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs">🟡</span>
                  Kuning (Qty)
                </label>
                <input
                  v-model="damage.kuning"
                  type="number"
                  placeholder="0"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs">🟠</span>
                  Kutilang (Qty)
                </label>
                <input
                  v-model="damage.kutilang"
                  type="number"
                  placeholder="0"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">🔴</span>
                  Busuk (Qty)
                </label>
                <input
                  v-model="damage.busuk"
                  type="number"
                  placeholder="0"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Detail Aktivitas</h2>
        <div class="space-y-6">
          <div
            v-for="(section, index) in formSections"
            :key="section.id"
            class="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-[#0071f3] shadow-sm hover:shadow-xl transition-all p-6"
          >
            <button
              @click="removeFormSection(index)"
              v-if="formSections.length > 1"
              class="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-lg flex items-center justify-center transition shadow-md hover:shadow-lg z-10"
              title="Hapus Aktivitas"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
              </svg>
            </button>

            <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
              <div class="w-10 h-10 bg-gradient-to-br from-[#0071f3] to-[#8FABD4] rounded-lg flex items-center justify-center text-white font-bold">
                {{ index + 1 }}
              </div>
              <h3 class="text-lg font-bold text-gray-900">Activity {{ index + 1 }}</h3>
              <span v-if="selectedPhase" class="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                Phase: {{ selectedPhase }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2">Pilih Activity</label>
                <select
                  v-model="section.activity_id"
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer"
                >
                  <option value="" disabled>Pilih Activity</option>
                  <option
                    v-for="a in potatoActivities"
                    :key="a.activity_id"
                    :value="a.activity_id"
                  >
                    {{ a.activity }}
                  </option>
                </select>
              </div>

              <div class="flex flex-col">
                <label class="text-sm font-semibold text-gray-700 mb-2">Chart of Account (CoA)</label>
                <input
                  v-model="section.coa"
                  type="text"
                  placeholder="Auto-filled"
                  readonly
                  class="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>
            
            <ImageUploadComponent
              v-if="section.id"
              type="activity"
              :recordId="section.id"
              :existingImages="activityImages[section.id] || []"
              @upload-success="handleActivityImageUpload"
              @upload-error="handleImageUploadError"
              @delete="(e) => handleImageDelete(e, 'activity')"
              @images-updated="handleImagesUpdated"
              :multiple="true"
              class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200"
            />

            <div class="mb-6 bg-gray-50 rounded-xl p-5">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span class="text-lg">📦</span>
                  Material
                </h4>
              </div>
              <div class="space-y-3">
                <div
                  v-for="(material, matIndex) in section.materials"
                  :key="matIndex"
                  class="flex flex-col gap-3 bg-white rounded-lg p-4 border border-gray-200"
                >
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Nama Material</label>
                      <select
                        v-model="material.material_name"
                        :disabled="materialLoading"
                        class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="" disabled>
                          {{ materialLoading ? '⏳ Loading materials...' : 'Pilih Material' }}
                        </option>
                        <option
                          v-for="mat in availableMaterials"
                          :key="mat.productId"
                          :value="mat.material_name"
                        >
                          {{ mat.material_name }} (Stok: {{ formatNumber(mat.stock) }} {{ mat.uom }})
                        </option>
                      </select>
                    </div>

                    <div class="flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">Qty</label>
                      <input
                        v-model="material.qty"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div class="flex flex-col">
                      <label class="text-xs font-semibold text-gray-600 mb-2">UoM</label>
                      <input
                        v-model="material.uom"
                        type="text"
                        readonly
                        placeholder="UoM"
                        class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium focus:outline-none cursor-not-allowed"
                      />
                    </div>
                    </div>

                  <button
                    @click="removeMaterialRow(index, matIndex)"
                    v-if="section.materials.length > 1"
                    class="w-full md:w-auto px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition shadow-sm hover:shadow self-end"
                  >
                    Hapus Material
                  </button>
                </div>
              </div>

              <button
                @click="addMaterialRow(index)"
                class="w-full mt-3 bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-semibold px-4 py-2.5 rounded-lg transition shadow-md hover:shadow-lg text-sm"
              >
                + Tambah Material
              </button>
            </div>

            <div class="bg-gray-50 rounded-xl p-5">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span class="text-lg">👷</span>
                  Jumlah Tenaga Kerja
                </h4>
              </div>
              <div class="space-y-3">
                <div
                  v-for="(worker, workerIndex) in section.workers"
                  :key="workerIndex"
                  class="flex gap-3 items-end bg-white rounded-lg p-4 border border-gray-200"
                >
                  <div class="flex-1 flex flex-col">
                    <label class="text-xs font-semibold text-gray-600 mb-2">Jumlah Pekerja</label>
                    <input
                      type="number"
                      v-model="worker.qty"
                      placeholder="0"
                      class="px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium focus:outline-none focus:border-[#0071f3] focus:ring-2 focus:ring-[#0071f3]/20 transition"
                    />
                  </div>

                  <button
                    @click="removeWorkerRow(index, workerIndex)"
                    v-if="section.workers.length > 1"
                    class="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition shadow-sm hover:shadow"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-center mb-8">
        <button
          @click="addFormSection"
          class="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-[#0071f3] shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg class="w-5 h-5 text-[#0071f3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
            <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/>
          </svg>
          Tambah Aktivitas Baru
        </button>
      </div>

      <div class="flex justify-center mb-8">
        <button
          @click.prevent="submitActivityReport"
          :disabled="isSubmitting"
          :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
          class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] hover:from-[#0060d1] hover:to-[#0050b1] text-white font-bold px-12 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-lg"
        >
          <span v-if="isSubmitting">⏳ Menyimpan...</span>
          <span v-else>📤 Submit Report</span>
        </button>
      </div>
    </div>

    <footer class="text-center py-10 mt-16 border-t border-gray-200">
        <div class="flex items-center justify-center gap-2 mb-2">
           <span class="w-6 h-6 p-0.5">
             <img :src="logoPG" alt="Potato Grow Logo" class="w-full h-full object-contain" />
          </span>
          <p class="text-gray-400 font-bold text-sm">POTATO GROW</p>
        </div>
        <p class="text-gray-400 text-xs">© 2025 All Rights Reserved</p>
      </footer>

    <div
      v-if="showScanner"
      class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden">
        <div class="bg-gradient-to-r from-[#0071f3] to-[#0060d1] p-6 text-white">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-bold">Scan QR Code</h2>
            <button
              @click="stopScanner"
              class="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
              </svg>
            </button>
          </div>
          <p class="text-sm text-blue-100">Arahkan kamera ke QR Code</p>
        </div>
        
        <div class="p-6">
          <div class="relative bg-black rounded-xl overflow-hidden mb-4" style="min-height: 350px;">
            <div id="qr-reader" style="width: 100%; height: 100%;"></div>
            
            <div v-if="isScanning" class="absolute top-4 left-4 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 z-10">
              <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Scanning...
            </div>
            
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="w-64 h-64 border-4 border-white rounded-2xl opacity-30"></div>
            </div>
          </div>
          
          <div class="space-y-2">
            <button
              @click="stopScanner"
              class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
            >
              ✕ Tutup Scanner
            </button>
            
            <p class="text-xs text-gray-500 text-center">
              💡 Pastikan QR Code berada dalam frame putih dan pencahayaan cukup
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSelectionModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="showSelectionModal = false">
      <div class="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-fade-in">
        <button @click="showSelectionModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">✕</button>
        <h3 class="font-bold text-gray-900 mb-6 text-center text-lg">Upload Bukti Foto</h3>
        
        <div class="space-y-3">
          <button @click="openCamera" class="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Ambil Foto (Kamera)
          </button>
          <button @click="triggerEnvFileInput" class="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 border border-gray-200 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Pilih dari Galeri
          </button>
        </div>
      </div>
    </div>

    <div v-if="showCameraModal" class="fixed inset-0 bg-black z-[110] flex flex-col">
       <div class="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-30">
          <button @click="showCameraModal=false; stopCamera()" class="text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur font-medium text-sm shadow-lg">Batal</button>
          <button @click="switchCamera" class="text-white bg-black/50 p-2 rounded-full backdrop-blur shadow-lg">
             <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
       </div>
       <div class="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          <div class="relative w-full max-w-[100vh] mx-auto" style="aspect-ratio: 3/4;">
            <video ref="videoElement" autoplay playsinline class="absolute inset-0 w-full h-full object-cover"></video>
          </div>
          <canvas ref="canvasElement" class="hidden"></canvas>
       </div>
       <div class="absolute bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent items-center gap-8 z-30">
          <button @click="takePhoto" class="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition flex items-center justify-center shadow-lg">
             <div class="w-16 h-16 bg-white rounded-full"></div>
          </button>
       </div>
    </div>

    <input type="file" ref="fileInputEnv" class="hidden" accept="image/*" @change="onEnvFileSelected">

    <div v-if="isUploadingEnv" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center text-white font-bold flex-col gap-3">
      <div class="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
      <p>Mengunggah Foto...</p>
    </div>

  </div>
</template>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

/* QR Scanner styles */
#qr-reader {
  border: none;
}

#qr-reader__dashboard,
#qr-reader__dashboard_section {
  display: none !important;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>