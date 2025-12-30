#!/bin/bash
# build-and-release.sh
# Script to build and release Image Pro

echo "Building and releasing Image Pro..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js before continuing."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "Failed to install dependencies."
    exit 1
fi

# Run tests
echo "Running tests..."
npm run test

if [ $? -ne 0 ]; then
    echo "Tests failed. Please fix the issues before building."
    exit 1
fi

# Build the web application
echo "Building web application..."
npm run build

if [ $? -ne 0 ]; then
    echo "Web build failed."
    exit 1
fi

echo "Web application built successfully."

# Build Tauri desktop application (if configured)
if [ -d "src-tauri" ]; then
    echo "Building Tauri desktop application..."
    
    # Check if Rust is installed
    if ! command -v rustc &> /dev/null; then
        echo "Rust is not installed. Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source ~/.cargo/env
    fi
    
    # Install Tauri CLI if not installed
    if ! command -v cargo-tauri &> /dev/null; then
        echo "Installing Tauri CLI..."
        cargo install tauri-cli
    fi
    
    cd src-tauri
    cargo tauri build
    cd ..
    
    if [ $? -eq 0 ]; then
        echo "Tauri desktop application built successfully."
    else
        echo "Tauri desktop build failed."
        exit 1
    fi
fi

# Build Electron application (if configured)
if [ -f "electron/main.ts" ]; then
    echo "Building Electron application..."
    
    # Install electron-builder if not installed
    npm install --save-dev electron-builder
    
    # Build Electron app
    npx electron-builder --publish=never
    
    if [ $? -eq 0 ]; then
        echo "Electron application built successfully."
    else
        echo "Electron build failed."
        exit 1
    fi
fi

# Run security audit
echo "Running security audit..."
npm audit

# Create release notes
echo "Creating release notes..."
RELEASE_VERSION=$(node -p "require('./package.json').version")
RELEASE_NAME="v$RELEASE_VERSION"
DATE=$(date '+%Y-%m-%d')

cat > "RELEASE_NOTES.md" << EOF
# Release $RELEASE_NAME - $DATE

## What's New

- Enhanced AI analysis for collectibles (stamps, trading cards, postcards, war letters)
- Smart image renaming based on AI analysis
- Metadata embedding with processing details
- Export functionality for JSON, PDF, CSV, and XLSX formats
- Direct eBay listing integration
- Facebook/Meta API integration for social media posts
- Cross-platform support (Windows, Linux, macOS, iOS)
- Multi-provider AI support (Gemini, OpenAI, Anthropic)
- Improved UI with export and AI configuration panels

## Bug Fixes

- Fixed image processing pipeline issues
- Improved error handling and user feedback
- Enhanced security with proper API key management

## Performance Improvements

- Optimized batch processing for large image sets
- Improved memory management for image processing
- Faster AI analysis with caching mechanisms
EOF

echo "Build and release process completed successfully!"
echo "Release version: $RELEASE_NAME"
echo "Release notes created: RELEASE_NOTES.md"