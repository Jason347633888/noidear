import { ref } from 'vue'
import request from '@/api/request'

export function usePhotoUpload() {
  const uploading = ref(false)

  async function uploadPhoto(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('只允许上传图片文件')
    }
    uploading.value = true
    try {
      const form = new FormData()
      form.append('file', file)
      // `request` baseURL is /api/v1; pass the suffix only so the lint gate
      // can keep blanket-blocking /api/v1-prefixed callers.
      const res = await request.post<{ url: string }>('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return (res as unknown as { url: string }).url
    } finally {
      uploading.value = false
    }
  }

  return { uploadPhoto, uploading }
}
