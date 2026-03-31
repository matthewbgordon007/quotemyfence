/** Browser → Supabase Storage (no app server body limit). Keep in sync with `supabase/storage.sql` bucket `file_size_limit`. */
export const MAX_CONTRACTOR_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * Multipart POST through `/api/contractor/upload`. Keep at or below Vercel
 * serverless request body limits (~4.5MB on typical plans).
 */
export const MAX_CONTRACTOR_IMAGE_BYTES_SERVER = Math.floor(4.5 * 1024 * 1024);
