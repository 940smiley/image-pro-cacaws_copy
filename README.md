# Image Pro - Professional Batch Image Processing

## Overview

**Image Pro** is a comprehensive, high-performance batch image processing platform designed for collectors and digital asset managers. It enables simultaneous processing of up to 100 images, leveraging AI-powered analysis for automated metadata enrichment, smart renaming, and seamless integration with marketplaces like eBay and social platforms like Facebook.

Built with a modern stack including **React**, **Tauri (Rust)**, and **Supabase**, Image Pro offers a robust desktop-class experience across Windows, Linux, and macOS.

## Key Features

- **Batch Processing:** Handle up to 100 images in a single workflow.
- **AI-Powered Analysis:** Specialized detection for stamps, trading cards, postcards, and war letters using Gemini, OpenAI, or Anthropic.
- **Smart Automation:** Intelligent auto-enhancement, expansion, and cropping with visual feedback.
- **Marketplace Integration:** Direct listing capabilities for eBay and automated post generation for Facebook.
- **Metadata Management:** Automatic embedding of processing details and smart renaming based on AI findings.
- **Multi-Format Export:** Export data to JSON, PDF, CSV, and XLSX.

## Tech Stack

| Component | Technology |
| --- | --- |
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Framer Motion |
| **Desktop Shell** | Tauri (Rust), Electron |
| **Backend** | Supabase Edge Functions (TypeScript) |
| **AI Models** | Google Gemini, OpenAI, Anthropic |
| **Image Engine** | Sharp, ExifTool |

## Quick Start

### Prerequisites

- Node.js (v18+)
- npm

### Development Setup

```bash
# Clone the repository
git clone https://github.com/940smiley/image-pro-cacaws_copy.git
cd image-pro-cacaws_copy

# Install dependencies and setup environment
npm run setup
```

### Running the Application

```bash
npm run dev
```

## TODO List

- [ ] **TypeScript Migration:** Complete the migration to TypeScript 5.x and resolve all remaining peer dependency conflicts.
- [ ] **Mobile Support:** Begin development of the React Native mobile application for on-the-go scanning.
- [ ] **Model Fine-tuning:** Enhance the YOLOv8 model for better detection of rare collectible variants.
- [ ] **Offline Mode:** Implement local caching for AI analysis results to support offline workflows.
- [ ] **UI Refinement:** Improve the Batch Processor dashboard with better progress visualization.

## License

This project is licensed under the MIT License.
