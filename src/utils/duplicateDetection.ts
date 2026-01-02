/**
 * Computes a simple SHA-256 hash of a file to detect exact duplicates
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Checks a list of image files for duplicates based on their hashes
 */
import { ImageFile } from '../types';

export function flagDuplicates(images: ImageFile[]): ImageFile[] {
  const seenHashes = new Map<string, string>(); // hash -> first_id
  
  return images.map(img => {
    if (!img.hash) return img;
    
    if (seenHashes.has(img.hash)) {
      return { ...img, isDuplicate: true };
    } else {
      seenHashes.set(img.hash, img.id);
      return { ...img, isDuplicate: false };
    }
  });
}
