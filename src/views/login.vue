<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-[#FFFD8F] px-4 sm:px-6 md:px-10 py-10 rounded-2xl"
  >
    <div class="w-full max-w-md md:max-w-lg lg:max-w-4xl text-center">
      <!-- Title --> 
      <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-8">
        GreenHouse
      </h1>

      <!-- Card Form -->
      <div
        class="bg-[#4C763B] px-15 py-15 rounded-2xl shadow-lg transition-all flex flex-col gap-5 duration-300"
      >
        <!-- Email -->
        <div class="mb-5 text-left"> 
          <label
            class="block text-white text-sm sm:text-base font-medium mb-2"
            for="email"
          >
            Email/Username
          </label>
          <input
            id="email"
            type="text"
            placeholder="Enter your email or username"
            class="w-full px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CFE9A8] transition"
          />
        </div>

        <!-- Password -->
        <div class="mb-5 text-left">
          <label
            class="block text-white text-sm sm:text-base font-medium mb-2"
            for="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            class="w-full px-4 py-2 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CFE9A8] transition"
          />
        </div>

      </div>
      <!-- Sign In Button -->
      <div class="flex justify-end mt-5">
        <router-link
          to="/report"
          class="bg-[#B0CE88] hover:bg-[#B5D78D] text-black font-semibold px-6 py-2 rounded-lg border-2 border-[#4C763B] transition-all shadow-sm hover:shadow-md"
        >
          Sign in
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transition di mobile */
@media (max-width: 640px) {
  input {
    font-size: 0.9rem;
  }
}
</style>
