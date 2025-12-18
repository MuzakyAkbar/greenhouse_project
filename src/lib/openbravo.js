// @/lib/openbravo.js
import axios from 'axios';

// ✅ CRITICAL: Tidak ada trailing slash di baseURL
const openbravoApiRead = axios.create({
  baseURL: 'https://api1.pirantisolusi.com/obmhn/v1', // ❌ Jangan tambah /
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const openbravoApiWrite = axios.create({
  baseURL: 'https://api1.pirantisolusi.com/obmhn/v1', // ✅ Sama dengan read API
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Shared interceptor function
const addAuthInterceptor = (instance, apiType) => {
  instance.interceptors.request.use(
    (config) => {
      const obUser = localStorage.getItem('OB_USER');
      const obKey = localStorage.getItem('OB_KEY');
      
      if (obUser && obKey) {
        const token = btoa(unescape(encodeURIComponent(`${obUser}:${obKey}`)));
        config.headers['Authorization'] = `Basic ${token}`;
      }
      
      console.log(`🔗 OB ${apiType}:`, config.method?.toUpperCase(), config.baseURL + config.url);
      return config;
    },
    (error) => {
      console.error('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      console.log(`✅ OB ${apiType}:`, response.status);
      return response;
    },
    (error) => {
      if (error.response) {
        console.error(`❌ ${apiType}:`, error.response.status, error.response.data);
      } else if (error.request) {
        console.error(`❌ ${apiType} Network Error`);
      } else {
        console.error(`❌ ${apiType}:`, error.message);
      }
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(openbravoApiRead, 'READ');
addAuthInterceptor(openbravoApiWrite, 'WRITE');

// Export unified API
const openbravoApi = {
  get: (...args) => openbravoApiRead.get(...args),
  post: (...args) => openbravoApiWrite.post(...args),
  put: (...args) => openbravoApiWrite.put(...args),
  delete: (...args) => openbravoApiWrite.delete(...args),
};

export default openbravoApi;