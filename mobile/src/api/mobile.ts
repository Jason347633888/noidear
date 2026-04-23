/**
 * Mobile-specific API module
 * Maps to backend /mobile endpoints:
 *   POST /mobile/upload          - single image upload (JPG/JPEG/PNG, max 5MB)
 *   POST /mobile/upload/batch    - batch image upload (up to 9 images)
 *   POST /mobile/sync            - batch sync offline form submissions
 *   GET  /mobile/sync/status     - query sync status
 */
import { get } from '@/utils/request'
import { uploadFile } from '@/utils/request'
import { chooseImages, compressImage } from '@/utils/image'

export interface SyncSubmissionItem {
  uuid: string
  formId: string
  data: Record<string, unknown>
}

export interface SyncResult {
  uuid: string
  success: boolean
  error?: string
}

export interface BatchSyncResponse {
  results: SyncResult[]
  successCount: number
  failedCount: number
}

export interface SyncStatusResponse {
  pendingCount: number
  lastSyncTime: string | null
}

export interface UploadResult {
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: number
  mimeType: string
}

/**
 * Upload a single field photo (camera or album).
 * Compresses before upload to reduce transfer size.
 */
export async function uploadFieldPhoto(
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  const paths = await chooseImages(['camera', 'album'], 1)
  if (paths.length === 0) {
    throw new Error('未选择图片')
  }
  const compressed = await compressImage(paths[0], { maxWidth: 800, maxHeight: 800, quality: 0.8 })
  return uploadFile<UploadResult>(compressed, 'file', undefined, onProgress)
}

/**
 * Query sync status from the server.
 * Maps to GET /mobile/sync/status
 */
export async function getSyncStatus(): Promise<SyncStatusResponse> {
  return get<SyncStatusResponse>('/mobile/sync/status')
}
