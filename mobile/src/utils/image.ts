/**
 * Image utility
 * Handles image compression, thumbnail generation using canvas
 */

interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

const DEFAULT_COMPRESS: CompressOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.8,
}

/**
 * Compress image using canvas
 */
export function compressImage(
  src: string,
  options: CompressOptions = {},
): Promise<string> {
  const { maxWidth, maxHeight, quality } = { ...DEFAULT_COMPRESS, ...options }

  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: (info) => {
        let targetWidth = info.width
        let targetHeight = info.height

        if (targetWidth > (maxWidth || 800)) {
          const ratio = (maxWidth || 800) / targetWidth
          targetWidth = maxWidth || 800
          targetHeight = Math.round(targetHeight * ratio)
        }

        if (targetHeight > (maxHeight || 800)) {
          const ratio = (maxHeight || 800) / targetHeight
          targetHeight = maxHeight || 800
          targetWidth = Math.round(targetWidth * ratio)
        }

        // Use uni.compressImage for simple compression
        uni.compressImage({
          src,
          quality: Math.round((quality || 0.8) * 100),
          success: (res) => {
            resolve(res.tempFilePath)
          },
          fail: () => {
            // Fallback: return original if compression fails
            resolve(src)
          },
        })
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '获取图片信息失败'))
      },
    })
  })
}

/**
 * Generate thumbnail
 */
export function generateThumbnail(
  src: string,
  size: number = 200,
): Promise<string> {
  return compressImage(src, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.6,
  })
}

/**
 * Choose images from camera or album
 */
export function chooseImages(
  sourceType: ('camera' | 'album')[] = ['camera', 'album'],
  count: number = 9,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sourceType,
      sizeType: ['compressed'],
      success: (res) => {
        resolve(res.tempFilePaths)
      },
      fail: (err) => {
        if (err.errMsg?.includes('cancel')) {
          resolve([])
          return
        }
        reject(new Error(err.errMsg || '选择图片失败'))
      },
    })
  })
}

/**
 * Preview images
 */
export function previewImages(
  urls: string[],
  current: string,
): void {
  uni.previewImage({
    urls,
    current,
  })
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
