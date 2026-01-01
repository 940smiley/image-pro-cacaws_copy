export interface LocalAnalysis {
  hasObject: boolean;
  confidence: number;
  possibleType: string;
  summary?: string;
}

/**
 * Performs a simple local scan of an image to determine if it contains 
 * an object worth sending to the server for detailed AI analysis.
 */
export const scanImageLocally = async (file: File): Promise<LocalAnalysis> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Use a small canvas for fast processing
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      
      let rSum = 0, gSum = 0, bSum = 0;
      let interestingPixels = 0;
      
      // Simple background detection (assuming mostly white or black background)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        rSum += r;
        gSum += g;
        bSum += b;
        
        // Heuristic: pixel is "interesting" if it's not too bright (white) and not too dark (black)
        // and has some color saturation
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        
        if (max < 245 && max > 10 && (saturation > 0.1 || max < 200)) {
          interestingPixels++;
        }
      }
      
      const pixelCount = size * size;
      const ratio = interestingPixels / pixelCount;
      URL.revokeObjectURL(url);
      
      const hasObject = ratio > 0.02; // At least 2% of pixels are "interesting"
      
      let possibleType = 'unknown';
      if (ratio > 0.6) possibleType = 'full-image';
      else if (ratio > 0.05) possibleType = 'centered-object';
      else if (hasObject) possibleType = 'small-object';
      else possibleType = 'blank-or-background';

      resolve({
        hasObject,
        confidence: Math.min(ratio * 5, 1.0),
        possibleType,
        summary: `Local scan: ${possibleType} detected (${Math.round(ratio * 100)}% coverage)`
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        hasObject: true, // Default to true on error to avoid missing items
        confidence: 0,
        possibleType: 'error'
      });
    };
    
    img.src = url;
  });
};
