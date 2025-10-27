<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const selectedDate = ref('')

// Fungsi untuk format tanggal ke YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Saat halaman pertama kali dimuat, isi otomatis tanggal hari ini
onMounted(() => {
  selectedDate.value = formatDate(new Date())
})

const formSections = ref([
  {
    id: Date.now(),
    activity: '',
    coa: '',
    materials: [{ materialName: '', qty: '', unit: '' }],
    workers: [{ workerName: '', qty: '' }],
  },
])

function addFormSection() {
  formSections.value.push({
    id: Date.now(),
    activity: '',
    coa: '',
    materials: [{ materialName: '', qty: '', unit: '' }],
    workers: [{ workerName: '', qty: '' }],
  })
}

function removeFormSection(index) {
  formSections.value.splice(index, 1)
}

function addMaterialRow(sectionIndex) {
  formSections.value[sectionIndex].materials.push({ materialName: '', qty: '', unit: '' })
}

function removeMaterialRow(sectionIndex, materialIndex) {
  formSections.value[sectionIndex].materials.splice(materialIndex, 1)
}

function addWorkerRow(sectionIndex) {
  formSections.value[sectionIndex].workers.push({ workerName: '', qty: '' })
}

function removeWorkerRow(sectionIndex, workerIndex) {
  formSections.value[sectionIndex].workers.splice(workerIndex, 1)
}

function submitForm() {
  console.log('Data Form:', JSON.parse(JSON.stringify(formSections.value)))
}
</script>

<template>
  <div class="min-h-screen bg-[#FFFCA9] flex flex-col items-center px-4 py-6">
    <!-- Header -->
    <div class="flex justify-start w-full mb-2">
      <router-link
        to="/dashboard"
        class="text-black text-xl hover:text-gray-700 transition"
        title="Back"
      >
        <i class="fa-solid fa-arrow-left"></i>
      </router-link>
    </div>

    <div class="w-full max-w-3xl mb-6 text-center">
      <h1 class="text-3xl sm:text-4xl font-bold text-black">Form</h1>
    </div>

    <!-- Date Picker -->
    <div class="w-full max-w-3xl mb-4 flex justify-center">
      <div class="flex items-center gap-3 bg-white border border-black rounded-lg px-4 py-2">
        <input type="date" disabled v-model="selectedDate" />
      </div>
    </div>

    <!-- Lokasi & Batch -->
    <div class="w-full max-w-3xl flex flex-col sm:flex-row gap-4 mb-4">
      <select
        class="w-full sm:w-1/2 px-4 py-2 border border-black rounded-lg bg-white text-gray-700 focus:outline-none"
      >
        <option selected>Lokasi</option>
      </select>
      <select
        class="w-full sm:w-1/2 px-4 py-2 border border-black rounded-lg bg-white text-gray-700 focus:outline-none"
      >
        <option>-Batch-</option>
        <option>Batch 1</option>
        <option>Batch 2</option>
      </select>
    </div>

    <!-- Jenis Kerusakan Tanaman -->
    <div
      class="w-full max-w-3xl bg-[#B5D78D] border border-[#4C763B] rounded-xl shadow-md p-6 mb-8"
    >
      <h2 class="text-lg font-bold text-[#2F5320] mb-4 text-center">Jenis Kerusakan Tanaman</h2>
      <div class="flex flex-col items-center justify-center w-full gap-y-5">
        <div class="flex items-center justify-between w-60">
          <label class="font-semibold text-[#2F5320]">Kuning</label>
          <input
            type="number"
            placeholder="Qty"
            class="w-28 bg-gray-100 text-center border border-gray-300 rounded-lg py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4C763B]"
          />
        </div>
        <div class="flex items-center justify-between w-60">
          <label class="font-semibold text-[#2F5320]">Kutilang</label>
          <input
            type="number"
            placeholder="Qty"
            class="w-28 bg-gray-100 text-center border border-gray-300 rounded-lg py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4C763B]"
          />
        </div>
        <div class="flex items-center justify-between w-60">
          <label class="font-semibold text-[#2F5320]">Busuk</label>
          <input
            type="number"
            placeholder="Qty"
            class="w-28 bg-gray-100 text-center border border-gray-300 rounded-lg py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4C763B]"
          />
        </div>
      </div>
    </div>

    <!-- Form Sections -->
    <div class="w-full max-w-3xl space-y-6">
      <div
        v-for="(section, index) in formSections"
        :key="section.id"
        class="relative bg-[#4D734D] p-6 rounded-2xl shadow-md space-y-5"
      >
        <!-- Delete Button -->
        <button
          @click="removeFormSection(index)"
          v-if="formSections.length > 1"
          class="absolute top-3 right-3 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-600 transition"
          title="Hapus Bagian Ini"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>

        <!-- Activity -->
        <select
          v-model="section.activity"
          class="w-full px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
        >
          <option value="" disabled>Pilih Activity</option>
          <option>Pekerjaan A</option>
          <option>Pekerjaan B</option>
        </select>

        <!-- CoA -->
        <input
          v-model="section.coa"
          type="text"
          placeholder="CoA"
          class="w-full sm:w-1/2 px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
        />

        <!-- Materials -->
        <div class="space-y-3">
          <p class="text-white font-semibold">Material</p>
          <div
            v-for="(material, matIndex) in section.materials"
            :key="matIndex"
            class="flex flex-col sm:flex-row gap-3 items-center"
          >
            <select
              v-model="material.materialName"
              class="flex-1 px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none"
            >
              <option value="" disabled>-Pilih Material-</option>
              <option>Pestisida selektif</option>
              <option>Nutrisi NPK cair</option>
              <option>Kalium nitrat (KNO₃)</option>
            </select>

            <input
              v-model="material.qty"
              type="number"
              placeholder="Qty"
              class="w-full sm:w-1/4 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
            />

            <input
              v-model="section.satuan"
              type="text"
              placeholder="Satuan"
              class="w-full sm:w-1/4 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
            />
            <button
              @click="removeMaterialRow(index, matIndex)"
              v-if="section.materials.length > 1"
              class="text-white hover:text-red-300 transition"
              title="Hapus Material"
            >
              <i class="fa-solid fa-circle-minus text-xl"></i>
            </button>
          </div>

          <button
            @click="addMaterialRow(index)"
            class="w-full bg-white hover:bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-lg border border-[#4D734D]"
          >
            + Tambah Material
          </button>
        </div>

        <!-- Workers -->
        <div class="space-y-3">
          <p class="text-white font-semibold">Jumlah Tenaga Kerja</p>
          <div
            v-for="(worker, workerIndex) in section.workers"
            :key="workerIndex"
            class="flex flex-col sm:flex-row gap-3 items-center"
          >
            <input
              type="number"
              v-model="worker.qty"
              placeholder="Qty"
              class="w-full sm:w-1/4 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
            />
            <button
              @click="removeWorkerRow(index, workerIndex)"
              v-if="section.workers.length > 1"
              class="text-white hover:text-red-300 transition"
              title="Hapus Tenaga Kerja"
            >
              <i class="fa-solid fa-circle-minus text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Activity Button -->
    <div class="w-full max-w-3xl flex justify-end mt-6">
      <button
        @click="addFormSection"
        class="bg-[#B5D78D] hover:bg-[#A1C77D] text-black font-medium px-6 py-2 rounded-lg border border-[#4D734D] shadow-md"
      >
        + Tambah Activity
      </button>
    </div>

    <!-- Submit -->
    <div class="w-full max-w-3xl flex justify-center mt-8">
      <router-link
        to="/reportActivityList"
        class="w-full sm:w-1/2 bg-[#4D734D] hover:bg-[#3C5C3B] text-white font-semibold py-3 rounded-lg border border-[#3A5737] transition-all shadow-sm text-center"
      >
        Submit
      </router-link>
    </div>
  </div>
</template>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
