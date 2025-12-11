import { request } from '@umijs/max';

export interface OcrRecognitionResult {
  original_text: string;
  extracted_data: {
    name: string | null;
    id_card: string | null;
    bank_card: string | null;
    phone: string | null;
    address: string | null;
    bank_name: string | null;
    account_name: string | null;
  };
  confidence: number;
  processing_time: number;
}

export interface OcrHistoryItem {
  id: number;
  filename: string;
  recognized_text: string;
  created_at: string;
  status: string;
}

export interface OcrResponse {
  code: number;
  msg: string;
  data: OcrRecognitionResult;
}

export interface OcrHistoryResponse {
  code: number;
  msg: string;
  data: OcrHistoryItem[];
}

/**
 * 上传图片进行OCR识别
 */
export async function recognizeImage(formData: FormData): Promise<OcrResponse> {
  return request('/api/ocr/recognize', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 获取OCR识别历史记录
 */
export async function getOcrHistory(): Promise<OcrHistoryResponse> {
  return request('/api/ocr/history', {
    method: 'GET',
  });
} 