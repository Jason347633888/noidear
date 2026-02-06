import request from './request';

/**
 * 文档预览 API
 *
 * 文件类型限制: 仅支持 PDF、Word (.doc/.docx)、Excel (.xls/.xlsx)
 * 文件大小限制: 最大 10MB (后端 MaxFileSizeValidator 已实现)
 * 文件类型验证: 后端 FileTypeValidator 已实现 MIME 类型白名单校验
 */

export interface PreviewResult {
  type: 'pdf' | 'word' | 'excel' | 'unknown';
  url?: string;
  fileName: string;
  message?: string;
}

export default {
  /**
   * 获取文档预览信息
   * - PDF: 返回临时签名 URL，可在浏览器中直接预览
   * - Word/Excel: 返回下载提示（暂不支持在线预览）
   */
  async getPreviewInfo(documentId: string): Promise<PreviewResult> {
    return request.get(`/documents/${documentId}/preview`);
  },

  /**
   * 获取文档下载 URL
   * 下载端点会验证权限和文档状态
   */
  getDownloadUrl(documentId: string): string {
    return `/api/v1/documents/${documentId}/download`;
  },
};
