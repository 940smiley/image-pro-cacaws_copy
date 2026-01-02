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

export const rotateImage = (
  sourceCanvas: HTMLCanvasElement,
  angle: number
): HTMLCanvasElement => {
  const rotatedCanvas = document.createElement('canvas');
  const ctx = rotatedCanvas.getContext('2d')!;

  // Convert angle to radians
  const radians = (angle * Math.PI) / 180;

  // Calculate new canvas dimensions to fit rotated image
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  
  rotatedCanvas.width = width * cos + height * sin;
  rotatedCanvas.height = width * sin + height * cos;

  // Center and rotate
  ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  ctx.rotate(radians);
  
  // Draw the image
  ctx.drawImage(sourceCanvas, -width / 2, -height / 2);

  return rotatedCanvas;
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

  // Pre-calculate brightness and contrast lookup table
  const bcLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let val = i * brightness;
    val = ((val - 128) * contrast) + 128;
    bcLUT[i] = Math.max(0, Math.min(255, val));
  }

  // Pre-calculate saturation constants
  const satConst = 1 - saturation;
  const rW = 0.2989;
  const gW = 0.5870;
  const bW = 0.1140;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const newR = bcLUT[r];
    const newG = bcLUT[g];
    const newB = bcLUT[b];

    const gray = rW * newR + gW * newG + bW * newB;
    
    data[i] = Math.max(0, Math.min(255, gray * satConst + newR * saturation));
    data[i + 1] = Math.max(0, Math.min(255, gray * satConst + newG * saturation));
    data[i + 2] = Math.max(0, Math.min(255, gray * satConst + newB * saturation));
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
        canvas = cropImage(canvas, op.params as unknown as CropArea);
        break;
      case 'enhance':
        canvas = enhanceImage(canvas);
        break;
    }
  }

  return canvas;
};

/**
 * Automatically detects multiple distinct objects (e.g., stamps on a page)
 * using a thresholding and blob detection algorithm.
 */
export const autoDetectObjects = (canvas: HTMLCanvasElement): CropArea[] => {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // 1. Simple grayscale and threshold
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    binary[i / 4] = avg < 200 ? 1 : 0; // Assume light background
  }

  // 2. Simple Connected Component Labeling (CCL) or Blob detection
  // For brevity, we'll use a grid-based clustering approach
  const areas: CropArea[] = [];
  const visited = new Set<number>();
  const gridSize = 10;

  for (let y = 0; y < height; y += gridSize) {
    for (let x = 0; x < width; x += gridSize) {
      const idx = y * width + x;
      if (binary[idx] === 1 && !visited.has(idx)) {
        // Find bounding box for this blob
        let minX = x, maxX = x, minY = y, maxY = y;
        const stack = [[x, y]];
        visited.add(idx);

        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);

          // Check neighbors
          const neighbors = [[cx + gridSize, cy], [cx - gridSize, cy], [cx, cy + gridSize], [cx, cy - gridSize]];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (binary[nIdx] === 1 && !visited.has(nIdx)) {
                visited.add(nIdx);
                stack.push([nx, ny]);
              }
            }
          }
        }

        const w = maxX - minX;
        const h = maxY - minY;
        if (w > 50 && h > 50) { // Filter out small noise
          areas.push({ 
            x: Math.max(0, minX - 10), 
            y: Math.max(0, minY - 10), 
            width: Math.min(width - minX, w + 20), 
            height: Math.min(height - minY, h + 20) 
          });
        }
      }
    }
  }

  return areas;
};

/**
 * Snaps a crop area to the closest high-contrast edges.
 */
export const magicCrop = (_canvas: HTMLCanvasElement, currentArea: CropArea): CropArea => {
  // We look around the current boundaries to find the "sharpest" transition
  // This is a simplified version of an edge-snapping algorithm
  return currentArea; // Placeholder: in a real CV app, we'd use Canny edge detection here
};
