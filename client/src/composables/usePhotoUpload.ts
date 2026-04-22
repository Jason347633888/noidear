import { ref } from 'vue'
import axios from 'axios'

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
      const res = await axios.post('/api/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return (res.data as { url: string }).url
    } finally {
      uploading.value = false
    }
  }

  return { uploadPhoto, uploading }
}
