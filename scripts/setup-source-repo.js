import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * This script sets up a secondary Git repository that acts as an "Image Source".
 * It includes a GitHub Action that triggers AI processing on upload.
 */

const setupSourceRepo = (repoPath, supabaseUrl, supabaseKey) => {
  const absolutePath = path.resolve(repoPath);
  
  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
  }

  process.chdir(absolutePath);

  // Initialize Git
  try {
    execSync('git init');
    console.log(`Initialized empty Git repository in ${absolutePath}`);
  } catch (error) {
    console.error('Failed to initialize git:', error.message);
    return;
  }

  // Create folder structure
  const dirs = ['images/pending', 'images/processed', '.github/workflows'];
  dirs.forEach(dir => fs.mkdirSync(path.join(absolutePath, dir), { recursive: true }));

  // Create package.json
  const packageJson = {
    name: "image-source-processor",
    version: "1.0.0",
    type: "module",
    dependencies: {
      "node-fetch": "^3.3.2"
    }
  };
  fs.writeFileSync(path.join(absolutePath, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Copy Processor Script
  const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1');
  const processorSourcePath = path.join(__dirname, 'source-repo-processor.js');
  const processorContent = fs.readFileSync(processorSourcePath, 'utf8');
  fs.writeFileSync(path.join(absolutePath, 'processor.js'), processorContent);

  // Create GitHub Action Workflow
  const workflowYaml = `
name: AI Image Organizer
on:
  push:
    paths:
      - 'images/pending/**'
  workflow_dispatch:

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/node-js@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm install
        
      - name: Process Images
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: node processor.js

      - name: Commit organized images
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "AI Organizer Bot"
          git add images/
          git commit -m "AI organized images [skip ci]" || echo "No changes"
          git push
`;

  fs.writeFileSync(path.join(absolutePath, '.github/workflows/process-images.yml'), workflowYaml.trim());

  // Create a README
  const readme = `
# Image Source Repository

Upload your raw images to the `images/pending` folder.
The GitHub Action will automatically:
1. Detect new uploads.
2. Send them to the Image Pro AI processing engine.
3. Organize them into directories under `images/processed` based on detection (e.g., /stamps, /cards).

## Setup
1. Push this repo to GitHub.
2. Add secrets to GitHub Actions:
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (Required for writing/processing)
`;

  fs.writeFileSync(path.join(absolutePath, 'README.md'), readme.trim());

  console.log('\nSuccess! Source repository set up.');
  console.log(`Next steps:
1. cd ${repoPath}
2. git add .
3. git commit -m "Initial setup for AI image processing"
4. Create a new GitHub repo and push these files.
5. Add your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the GitHub repo secrets.`);
};

// Simple CLI handling
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node setup-source-repo.js <target-directory>');
} else {
  setupSourceRepo(args[0]);
}
