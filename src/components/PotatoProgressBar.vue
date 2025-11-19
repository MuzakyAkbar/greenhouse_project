<template>
  <div class="potato-container">
    <svg 
      :width="width" 
      :height="height" 
      viewBox="0 0 200 240" 
      xmlns="http://www.w3.org/2000/svg"
      class="potato-svg"
    >
      <defs>
        <!-- Gradient untuk kentang -->
        <linearGradient id="potatoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#D4A574;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#B8885A;stop-opacity:1" />
        </linearGradient>
        
        <!-- Gradient untuk fill progress -->
        <linearGradient :id="`progressGradient-${uniqueId}`" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :style="`stop-color:${gradientStart};stop-opacity:1`" />
          <stop offset="100%" :style="`stop-color:${gradientEnd};stop-opacity:1`" />
        </linearGradient>
        
        <!-- Clip path untuk progress fill -->
        <clipPath :id="`progressClip-${uniqueId}`">
          <rect 
            x="0" 
            :y="clipY" 
            width="200" 
            :height="clipHeight" 
          />
        </clipPath>
        
        <!-- Shadow filter -->
        <filter :id="`shadow-${uniqueId}`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dx="2" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Shadow -->
      <ellipse 
        cx="100" 
        cy="220" 
        rx="60" 
        ry="15" 
        fill="rgba(0,0,0,0.2)"
      />
      
      <!-- Background kentang (outline) -->
      <path
        :d="potatoPath"
        fill="#E8D5B7"
        stroke="#A67C52"
        stroke-width="2"
      />
      
      <!-- Progress fill kentang -->
      <path
        :d="potatoPath"
        :fill="`url(#progressGradient-${uniqueId})`"
        :clip-path="`url(#progressClip-${uniqueId})`"
        :filter="`url(#shadow-${uniqueId})`"
      />
      
      <!-- Outline kentang -->
      <path
        :d="potatoPath"
        fill="none"
        stroke="#8B6F47"
        stroke-width="3"
        opacity="0.8"
      />
      
      <!-- Spots/bintik kentang -->
      <ellipse cx="70" cy="80" rx="8" ry="6" fill="#9D7A54" opacity="0.4"/>
      <ellipse cx="130" cy="100" rx="6" ry="5" fill="#9D7A54" opacity="0.3"/>
      <ellipse cx="90" cy="140" rx="7" ry="5" fill="#9D7A54" opacity="0.35"/>
      <ellipse cx="110" cy="70" rx="5" ry="4" fill="#9D7A54" opacity="0.3"/>
      <ellipse cx="140" cy="130" rx="6" ry="5" fill="#9D7A54" opacity="0.4"/>
      
      <!-- Mata kentang (sprout spots) -->
      <circle cx="65" cy="110" r="3" fill="#7A5C3F" opacity="0.6"/>
      <circle cx="135" cy="85" r="2.5" fill="#7A5C3F" opacity="0.6"/>
      <circle cx="120" cy="155" r="3" fill="#7A5C3F" opacity="0.6"/>
      
      <!-- Persentase text -->
      <text
        x="100"
        y="115"
        text-anchor="middle"
        :fill="textColor"
        font-size="32"
        font-weight="bold"
        font-family="Arial, sans-serif"
        style="text-shadow: 2px 2px 4px rgba(0,0,0,0.3);"
      >
        {{ percentage }}%
      </text>
      
      <!-- Label text -->
      <text
        x="100"
        y="145"
        text-anchor="middle"
        :fill="textColor"
        font-size="14"
        font-weight="600"
        font-family="Arial, sans-serif"
        opacity="0.9"
      >
        {{ label }}
      </text>
    </svg>
    
    <!-- Info detail -->
    <div class="potato-info">
      <div class="info-item">
        <span class="info-label">Sukses:</span>
        <span class="info-value success">{{ success.toLocaleString('id-ID') }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Total:</span>
        <span class="info-value">{{ total.toLocaleString('id-ID') }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Rusak:</span>
        <span class="info-value damaged">{{ damaged.toLocaleString('id-ID') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  percentage: {
    type: Number,
    default: 0
  },
  label: {
    type: String,
    default: ''
  },
  success: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  damaged: {
    type: Number,
    default: 0
  },
  width: {
    type: Number,
    default: 200
  },
  height: {
    type: Number,
    default: 240
  },
  gradientStart: {
    type: String,
    default: '#0071f3'
  },
  gradientEnd: {
    type: String,
    default: '#0060d1'
  }
})

// Generate unique ID untuk setiap instance
const uniqueId = computed(() => Math.random().toString(36).substr(2, 9))

// Path untuk bentuk kentang (organic potato shape)
const potatoPath = computed(() => {
  return `M 100,30 
          C 140,30 165,50 170,75
          C 175,95 172,120 165,140
          C 158,160 145,180 125,190
          C 110,197 90,197 75,190
          C 55,180 42,160 35,140
          C 28,120 25,95 30,75
          C 35,50 60,30 100,30 Z`
})

// Hitung posisi clip untuk fill berdasarkan persentase
const clipY = computed(() => {
  const maxHeight = 200
  const minY = 30
  return minY + (maxHeight - minY) * (1 - props.percentage / 100)
})

const clipHeight = computed(() => {
  return 200 - clipY.value + 30
})

// Warna text berdasarkan persentase
const textColor = computed(() => {
  return props.percentage > 50 ? '#FFFFFF' : '#333333'
})
</script>

<style scoped>
.potato-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.potato-svg {
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  transition: transform 0.3s ease;
}

.potato-svg:hover {
  transform: scale(1.05) rotate(2deg);
}

.potato-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 0.75rem;
  border: 2px solid #dee2e6;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.info-label {
  color: #6c757d;
  font-weight: 600;
}

.info-value {
  color: #212529;
  font-weight: 700;
}

.info-value.success {
  color: #198754;
}

.info-value.damaged {
  color: #dc3545;
}
</style>