/**
 * Sync utility for offline data synchronization
 */
import { post } from './request'

export interface SyncPayload {
  clientId: string
  formId: string
  data: Record<string, unknown>
}

export interface SyncResult {
  success: boolean
  clientId: string
  serverId?: string
  error?: string
}

/**
 * Batch sync form submissions
 */
export async function batchSync(
  submissions: SyncPayload[],
): Promise<SyncResult[]> {
  try {
    const result = await post<SyncResult[]>('/mobile/sync', {
      submissions,
    })
    return result
  } catch (error) {
    // Return all as failed
    return submissions.map((s) => ({
      success: false,
      clientId: s.clientId,
      error: error instanceof Error ? error.message : 'Sync failed',
    }))
  }
}

/**
 * Check sync status
 */
export async function checkSyncStatus(): Promise<{
  pendingCount: number
  lastSyncTime: string | null
}> {
  try {
    return await post<{ pendingCount: number; lastSyncTime: string | null }>(
      '/mobile/sync/status',
    )
  } catch {
    return { pendingCount: 0, lastSyncTime: null }
  }
}

/**
 * Generate client-side UUID for deduplication
 */
export function generateClientId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}
