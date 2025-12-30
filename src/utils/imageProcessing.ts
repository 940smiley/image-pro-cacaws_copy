import { CropArea, ProcessingOperation } from '../types';

export const expandImage = (
  sourceCanvas: HTMLCanvasElement,
  percentage: number
): HTMLCanvasElement => {
  const expandedCanvas = document.createElement('canvas');
  const ctx = expandedCanvas.getContext('2d')!;

  const expandRatio = 1 + percentage / 100;
  expandedCanvas.width = sourceCanvas.width * expandRatio;
  expandedCanvas.height = sourceCanvas.height * expandRatio;

  const offsetX = (expandedCanvas.width - sourceCanvas.width) / 2;
  const offsetY = (expandedCanvas.height - sourceCanvas.height) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, expandedCanvas.width, expandedCanvas.height);

  ctx.drawImage(sourceCanvas, offsetX, offsetY);

  return expandedCanvas;
};

export const cropImage = (
  sourceCanvas: HTMLCanvasElement,
  cropArea: CropArea
): HTMLCanvasElement => {
  const croppedCanvas = document.createElement('canvas');
  const ctx = croppedCanvas.getContext('2d')!;

  croppedCanvas.width = cropArea.width;
  croppedCanvas.height = cropArea.height;

  ctx.drawImage(
    sourceCanvas,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  );

  return croppedCanvas;
};

export const enhanceImage = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const enhancedCanvas = document.createElement('canvas');
  const ctx = enhancedCanvas.getContext('2d')!;

  enhancedCanvas.width = sourceCanvas.width;
  enhancedCanvas.height = sourceCanvas.height;

  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
  const data = imageData.data;

  const brightness = 1.1;
  const contrast = 1.15;
  const saturation = 1.2;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let newR = r * brightness;
    let newG = g * brightness;
    let newB = b * brightness;

    newR = ((newR - 128) * contrast) + 128;
    newG = ((newG - 128) * contrast) + 128;
    newB = ((newB - 128) * contrast) + 128;

    const gray = 0.2989 * newR + 0.5870 * newG + 0.1140 * newB;
    newR = gray + (newR - gray) * saturation;
    newG = gray + (newG - gray) * saturation;
    newB = gray + (newB - gray) * saturation;

    data[i] = Math.max(0, Math.min(255, newR));
    data[i + 1] = Math.max(0, Math.min(255, newG));
    data[i + 2] = Math.max(0, Math.min(255, newB));
  }

  ctx.putImageData(imageData, 0, 0);

  return enhancedCanvas;
};

export const loadImageToCanvas = (file: File): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
};

export const downloadImage = (canvas: HTMLCanvasElement, filename: string) => {
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
};

export const processImageWithOperations = async (
  file: File,
  operations: ProcessingOperation[]
): Promise<HTMLCanvasElement> => {
  let canvas = await loadImageToCanvas(file);

  for (const op of operations) {
    switch (op.type) {
      case 'expand':
        canvas = expandImage(canvas, op.params.percentage as number);
        break;
      case 'crop':
        canvas = cropImage(canvas, op.params as CropArea);
        break;
      case 'enhance':
        canvas = enhanceImage(canvas);
        break;
    }
  }

  return canvas;
};
