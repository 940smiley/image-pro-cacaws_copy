import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // This would need to be installed in the Action runner

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SCAN_THRESHOLD = 50;
const HISTORY_FILE = 'images/scan_history.json';

async function processImages() {
  const pendingDir = 'images/pending';
  const processedDir = 'images/processed';
  const dataDir = 'images';

  if (!fs.existsSync(pendingDir)) return;
  if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

  // Load scan history
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
      console.warn('Failed to load history, starting fresh');
    }
  }

  const files = fs.readdirSync(pendingDir).filter(f =>
    ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase())
  );

  for (const file of files) {
    const filePath = path.join(pendingDir, file);
    console.log(`Processing: ${file}`);

    try {
      // 1. Local Pre-scan (Basic variance check)
      const stats = fs.statSync(filePath);
      if (stats.size < 5000) { // Slightly larger threshold for quality
        console.log(`Skipping ${file}: File too small or likely low-detail`);
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
          mimeType: `image/${path.extname(file).slice(1).replace('jpg', 'jpeg')}`
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

      const analysis = await response.json();

      // 3. Track in History
      history.push({
        filename: file,
        timestamp: new Date().toISOString(),
        analysis
      });

      // 4. Determine Directory based on AI result
      const type = analysis.collectibleDetails?.type || analysis.objects?.[0] || 'general';
      const safeType = type.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const targetDir = path.join(processedDir, safeType);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 5. Move and Rename
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

  // Write history back
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

  // 6. Check for Export Threshold
  if (history.length >= SCAN_THRESHOLD) {
    console.log(`Threshold reached (${history.length}/${SCAN_THRESHOLD}). Triggering exports...`);
    await triggerExports(history);
    // Optionally clear or archive history after export
    // fs.renameSync(HISTORY_FILE, `images/scan_history_${Date.now()}.json`);
  }
}

async function triggerExports(data) {
  const exportTypes = ['pdf', 'csv', 'xlsx'];

  for (const type of exportTypes) {
    console.log(`Generating ${type} export...`);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-${type}-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ results: data })
      });

      if (response.ok) {
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const exportPath = `images/exports/export_${Date.now()}.${type}`;

        if (!fs.existsSync('images/exports')) fs.mkdirSync('images/exports', { recursive: true });
        fs.writeFileSync(exportPath, buffer);
        console.log(`Exported ${type} to ${exportPath}`);
      } else {
        console.error(`Failed to generate ${type} export: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error during ${type} export:`, error.message);
    }
  }
}

processImages();
