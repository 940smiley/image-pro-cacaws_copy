import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // This would need to be installed in the Action runner

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function processImages() {
  const pendingDir = 'images/pending';
  const processedDir = 'images/processed';

  if (!fs.existsSync(pendingDir)) return;

  const files = fs.readdirSync(pendingDir).filter(f => 
    ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase())
  );

  for (const file of files) {
    const filePath = path.join(pendingDir, file);
    console.log(`Processing: ${file}`);

    try {
      // 1. Local Pre-scan (Basic variance check)
      const stats = fs.statSync(filePath);
      if (stats.size < 2048) { 
        console.log(`Skipping ${file}: File too small`);
        continue;
      }

      // 2. Call Supabase AI Function
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-image-gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: `image/${path.extname(file).slice(1)}`
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

      const analysis = await response.json();
      
      // 3. Determine Directory based on AI result
      const type = analysis.collectibleDetails?.type || analysis.objects?.[0] || 'general';
      const safeType = type.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const targetDir = path.join(processedDir, safeType);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 4. Move and Rename
      const extension = path.extname(file);
      const newName = analysis.objects?.[0] 
        ? `${analysis.objects[0].toLowerCase().replace(/\s+/g, '_')}_${Date.now()}${extension}`
        : file;

      fs.renameSync(filePath, path.join(targetDir, newName));
      console.log(`Organized ${file} into ${targetDir}/${newName}`);

    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      // Move to error folder if processing fails
      const errorDir = 'images/error';
      if (!fs.existsSync(errorDir)) fs.mkdirSync(errorDir, { recursive: true });
      fs.renameSync(filePath, path.join(errorDir, file));
    }
  }
}

processImages();
