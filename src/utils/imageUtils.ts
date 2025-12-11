/**
 * 图片处理工具函数
 * 用于压缩图片和调整分辨率
 */

export interface ImageCompressOptions {
  /** 最大宽度，默认 1920 */
  maxWidth?: number;
  /** 最大高度，默认 1080 */
  maxHeight?: number;
  /** 压缩质量，0-1之间，默认 0.8 */
  quality?: number;
  /** 输出格式，默认 'image/jpeg' */
  outputFormat?: string;
  /** 是否保持宽高比，默认 true */
  maintainAspectRatio?: boolean;
}

/**
 * 压缩图片
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的File对象
 */
export async function compressImage(
  file: File, 
  options: ImageCompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    outputFormat = 'image/jpeg',
    maintainAspectRatio = true
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // 计算新的尺寸
        let { width, height } = calculateNewDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight,
          maintainAspectRatio
        );

        // 设置canvas尺寸
        canvas.width = width;
        canvas.height = height;

        // 绘制图片到canvas
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }

        // 转换为blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 创建新的File对象
              const compressedFile = new File([blob], file.name, {
                type: outputFormat,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('图片压缩失败'));
            }
          },
          outputFormat,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    // 加载图片
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 计算新的图片尺寸
 * @param originalWidth 原始宽度
 * @param originalHeight 原始高度
 * @param maxWidth 最大宽度
 * @param maxHeight 最大高度
 * @param maintainAspectRatio 是否保持宽高比
 * @returns 新的宽度和高度
 */
function calculateNewDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  maintainAspectRatio: boolean
): { width: number; height: number } {
  // 如果图片尺寸已经小于最大尺寸，直接返回原尺寸
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  if (maintainAspectRatio) {
    // 计算缩放比例
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    return {
      width: Math.floor(originalWidth * ratio),
      height: Math.floor(originalHeight * ratio)
    };
  } else {
    // 不保持宽高比，直接使用最大尺寸
    return {
      width: Math.min(originalWidth, maxWidth),
      height: Math.min(originalHeight, maxHeight)
    };
  }
}

/**
 * 获取图片信息
 * @param file 图片文件
 * @returns 图片信息
 */
export async function getImageInfo(file: File): Promise<{
  width: number;
  height: number;
  size: number;
  type: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type
      });
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 检查图片是否需要压缩
 * @param file 图片文件
 * @param maxSizeKB 最大文件大小（KB），默认 2048KB
 * @param maxWidth 最大宽度，默认 1920
 * @param maxHeight 最大高度，默认 1080
 * @returns 是否需要压缩
 */
export async function shouldCompressImage(
  file: File,
  maxSizeKB: number = 2048,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<boolean> {
  const fileSizeKB = file.size / 1024;
  
  // 如果文件大小已经小于限制，检查尺寸
  if (fileSizeKB <= maxSizeKB) {
    const info = await getImageInfo(file);
    return info.width > maxWidth || info.height > maxHeight;
  }
  
  return true;
}

/**
 * 智能压缩图片
 * 根据图片大小和尺寸自动选择压缩参数
 * @param file 原始图片文件
 * @returns 压缩后的File对象
 */
export async function smartCompressImage(file: File): Promise<File> {
  const fileSizeMB = file.size / (1024 * 1024);
  const info = await getImageInfo(file);
  
  let options: ImageCompressOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    outputFormat: 'image/jpeg',
    maintainAspectRatio: true
  };

  // 根据文件大小调整压缩参数
  if (fileSizeMB > 5) {
    // 大文件，更激进的压缩
    options.maxWidth = 1280;
    options.maxHeight = 720;
    options.quality = 0.6;
  } else if (fileSizeMB > 2) {
    // 中等文件
    options.maxWidth = 1600;
    options.maxHeight = 900;
    options.quality = 0.7;
  }

  // 根据图片尺寸调整
  if (info.width > 3000 || info.height > 3000) {
    options.maxWidth = 1920;
    options.maxHeight = 1080;
    options.quality = 0.7;
  }

  return compressImage(file, options);
}
