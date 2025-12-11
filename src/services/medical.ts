import { request } from '@umijs/max';

/**
 * OCR识别接口
 * @param image Base64格式的图片数据
 */
export async function ocrRecognize(image: string) {
  return request('/api/medical/ocr/recognize', {
    method: 'POST',
    data: { image },
  });
}

/**
 * 获取OCR识别历史记录
 */
export async function getOcrHistory(params: { page: number; pageSize: number }) {
  return request('/api/medical/ocr/history', {
    method: 'GET',
    params,
  });
} 