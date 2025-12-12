// src/i18n.js
import { createI18n } from 'vue-i18n'

// Definisikan pesan terjemahan
// Tips: Anda bisa memisahkannya ke file JSON terpisah (misal: src/locales/id.json) nanti jika teks semakin banyak.
const messages = {
  id: {
    login: {
      welcome: 'Selamat Datang',
      subtitle: 'Masuk untuk melanjutkan ke dashboard',
      email_label: 'Email / Nama Pengguna',
      email_placeholder: 'Masukkan email atau username',
      password_label: 'Kata Sandi',
      password_placeholder: 'Masukkan password',
      button: 'Masuk ke Dashboard',
      processing: 'Memproses...',
      error_title: 'Login Gagal',
      error_msg: 'Gagal login. Periksa kembali email dan password.'
    },
    menu: {
      monitoring: 'Monitoring',
      analysis: 'Analisis',
      report: 'Laporan'
    }
  },
  en: {
    login: {
      welcome: 'Welcome',
      subtitle: 'Sign in to continue to dashboard',
      email_label: 'Email / Username',
      email_placeholder: 'Enter email or username',
      password_label: 'Password',
      password_placeholder: 'Enter password',
      button: 'Sign in to Dashboard',
      processing: 'Processing...',
      error_title: 'Login Failed',
      error_msg: 'Login failed. Please check your email and password.'
    },
    menu: {
      monitoring: 'Monitoring',
      analysis: 'Analysis',
      report: 'Reports'
    }
  }
}

const i18n = createI18n({
  legacy: false, // Set false untuk menggunakan Composition API
  locale: 'id', // Bahasa default
  fallbackLocale: 'en', // Bahasa cadangan jika terjemahan tidak ditemukan
  messages,
})

export default i18n