// src/lib/imageUpload.js

import { supabase } from "@/lib/supabase.js";

// ✅ Fungsi untuk menentukan bucket berdasarkan type
function getBucketName(type) {
  if (type === 'type_damage') {
    return 'gh-type-damage';
  } else if (type === 'activity') {
    return 'gh-activities';
  }
  throw new Error(`Invalid type: ${type}. Must be 'type_damage' or 'activity'`);
}

/**
 * Mendapatkan URL publik dari path storage.
 * @param {string} path - Path lengkap file di Supabase Storage.
 * @param {string} type - Tipe record ('type_damage' atau 'activity')
 * @returns {string | null} URL publik.
 */
export function getImagePublicUrl(path, type) {
  if (!path || !type) return null;

  try {
    const bucketName = getBucketName(type);
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error("Error getting public URL:", error);
    return null;
  }
}

/**
 * Mengupdate kolom gambar di tabel database setelah upload berhasil.
 * Untuk single image (legacy/backup).
 * @param {number} recordId - ID dari record yang akan diupdate
 * @param {string} type - Tipe record ('type_damage' atau 'activity')
 * @param {object} imageData - Data gambar { path: string, url: string, bucket: string }
 * @returns {Promise<void>}
 */
export async function updateImageInDB(recordId, type, imageData) {
  if (!recordId || !imageData || !imageData.path || !imageData.url) {
    console.warn(`[updateImageInDB] Data tidak lengkap. Record ID: ${recordId}, Image Data:`, imageData);
    return;
  }

  let tableName;
  let pkColumn;

  if (type === 'type_damage') {
    tableName = 'gh_type_damage';
    pkColumn = 'typedamage_id';
  } else if (type === 'activity') {
    tableName = 'gh_activity';
    pkColumn = 'activity_id';
  } else {
    throw new Error(`Tipe tidak valid: ${type}`);
  }

  try {
    const payload = {
      image_path: imageData.path,
      image_url: imageData.url,
    };

    const { error } = await supabase
      .from(tableName)
      .update(payload)
      .eq(pkColumn, recordId);

    if (error) throw error;

    console.log(`✅ DB Updated: ${tableName} (ID: ${recordId}) with path: ${imageData.path}`);

  } catch (error) {
    console.error(`❌ Gagal mengupdate DB untuk ${tableName} ID ${recordId}:`, error);
    throw error;
  }
}

/**
 * UPDATE MULTIPLE IMAGES KE DATABASE (JSON ARRAY)
 * Digunakan untuk menyimpan array imagesData ke kolom JSONB (asumsi nama kolom: `images`).
 * * @param {number} recordId - ID dari record
 * @param {string} type - Tipe record ('type_damage' atau 'activity')
 * @param {Array} imagesData - Array of image objects [{ path, url, bucket }, ...]
 * @returns {Promise<void>}
 */
export async function updateMultipleImagesInDB(recordId, type, imagesData) {
  if (!recordId || !imagesData || !Array.isArray(imagesData) || imagesData.length === 0) {
    console.warn(`[updateMultipleImagesInDB] Data tidak lengkap atau array kosong.`);
    return;
  }

  let tableName;
  let pkColumn;

  if (type === 'type_damage') {
    tableName = 'gh_type_damage';
    pkColumn = 'typedamage_id';
  } else if (type === 'activity') {
    tableName = 'gh_activity';
    pkColumn = 'activity_id';
  } else {
    throw new Error(`Tipe tidak valid: ${type}`);
  }

  try {
    // ✅ PERBAIKAN: Format data agar properti url benar-benar menggunakan Public URL
    // (Bukan Blob URL lokal yang mungkin ada di properti .url saat upload di component)
    const imagesToSave = imagesData.map(img => ({
      path: img.path || '',
      // Prioritas: img.supabaseUrl (Public) > img.url (Bisa jadi Blob) > Empty
      url: img.supabaseUrl || img.url || '', 
      bucket: img.bucket || ''
    }));

    const payload = {
      images: imagesToSave // Simpan sebagai JSONB array
    };

    console.log(`📤 Updating ${tableName} ID ${recordId} with:`, payload);

    const { data, error } = await supabase
      .from(tableName)
      .update(payload)
      .eq(pkColumn, recordId)
      .select(); // ✅ Tambahkan select untuk memastikan data tersimpan dan dikembalikan

    if (error) {
      console.error('Supabase Error Details:', error);
      throw error;
    }

    console.log(`✅ Multiple Images Updated in DB: ${tableName} (ID: ${recordId})`, data);

  } catch (error) {
    console.error(`❌ Error updating images:`, {
      table: tableName,
      recordId: recordId,
      errorMessage: error.message,
      errorDetails: error
    });

    // ✅ Re-throw dengan context yang lebih jelas agar bisa ditangkap di component
    throw new Error(`Gagal menyimpan gambar ke ${tableName}: ${error.message}`);
  }
}

/**
 * Menghapus file dari Supabase Storage dan membersihkan kolom di database.
 * @param {string} imagePath - Path file di Supabase Storage.
 * @param {string} type - Tipe record ('type_damage' atau 'activity')
 * @param {number} recordId - ID dari record (optional untuk cleanup DB)
 * @returns {Promise<void>}
 */
export async function deleteImage(imagePath, type, recordId = null) {
  if (!imagePath) {
    console.warn("[deleteImage] Image path tidak ditemukan.");
    return;
  }

  const bucketName = getBucketName(type);

  // 1. Hapus dari Storage
  try {
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([imagePath]);

    if (storageError) {
      console.warn(`⚠️ Warning: Gagal menghapus file dari Storage (${imagePath})`, storageError);
    } else {
      console.log(`✅ Storage Removed: ${imagePath}`);
    }
  } catch (e) {
    console.warn(`⚠️ Exception saat menghapus dari Storage: ${e.message}`);
  }

  // 2. Bersihkan kolom image di Database (opsional dan biasanya tidak diperlukan untuk multi-image)
  // Logic di bawah ini biasanya untuk Single Image Column. 
  // Untuk JSONB multi-image, penghapusan item di array DB biasanya dilakukan lewat updateMultipleImagesInDB
  if (recordId && typeof recordId === 'number' && recordId < 2000000000000) {
    let tableName;
    let pkColumn;

    if (type === 'type_damage') {
      tableName = 'gh_type_damage';
      pkColumn = 'typedamage_id';
    } else if (type === 'activity') {
      tableName = 'gh_activity';
      pkColumn = 'activity_id';
    }

    if (tableName) {
      try {
        // Hapus path dan url jika menggunakan single-image column
        const { error: dbError } = await supabase
          .from(tableName)
          .update({ image_path: null, image_url: null })
          .eq(pkColumn, recordId);

        if (dbError) throw dbError;
        console.log(`✅ DB Cleared (Single Col): ${tableName} (ID: ${recordId})`);
      } catch (e) {
        // Jangan throw error di sini agar proses delete UI tetap jalan meskipun update DB gagal (minor issue)
        console.error(`❌ Gagal membersihkan DB single-col untuk ${tableName} ID ${recordId}:`, e);
      }
    }
  }
}