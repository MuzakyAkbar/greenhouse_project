<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['close'])
</script>

<template>
  <!-- Overlay full screen -->
  <div
    v-if="isOpen"
    class="fixed inset-0 flex items-center justify-center backdrop-blur-xs backdrop-opacity-75 backdrop-brightness-0 z-50"
  >
    <!-- Kotak modal -->
    <div
      class="flex flex-col gap-y-5 justify-center items-center bg-[#b9d48f] rounded-lg shadow-lg p-6 max-w-lg w-full h-auto max-h-[50vh]"
    >
      <div class="w-full flex justify-end">
        <button @click="$emit('close')" class="w-3 hover:scale-120 transition" title="Close Modal">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="#fa0000">
            <path
              d="M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z"
            />
          </svg>
        </button>
      </div>
      <div class="flex gap-x-10">
        <select class="font-semibold bg-[#FFFD8F] py-2.5 px-4 rounded-lg text-[#2F5320]">
          <option>Input Total Planlet/Batch</option>
          <option>Planlet Stek</option>
          <option>Benih G0</option>
          <option>Benih G1</option>
          <option>Buah G2</option>
        </select>
        <input
          type="number"
          placeholder="Qty"
          class="w-28 bg-gray-100 text-center border border-gray-300 rounded-lg py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4C763B]"
        />
      </div>

      <div class="flex gap-x-10">
        <label class="font-semibold bg-[#FFFD8F] py-2.5 px-15 rounded-lg text-[#2F5320]">
          Total Kerusakan
        </label>
        <input
          type="number"
          placeholder="Qty"
          class="w-28 bg-gray-100 text-center border border-gray-300 rounded-lg py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4C763B]"
        />
      </div>

      <button
      @click="$emit('close')"
        class="bg-[#4D734D] hover:bg-[#3C5C3B] text-white font-semibold py-2.5 px-5 mt-2 rounded-lg border border-[#3A5737] transition-all shadow-sm text-center"
      >
        Submit
      </button>
    </div>
  </div>
</template>
