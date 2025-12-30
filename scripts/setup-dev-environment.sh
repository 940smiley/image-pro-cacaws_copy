#!/bin/bash
# setup-dev-environment.sh
# Script to set up the development environment for Image Pro

echo "Setting up Image Pro development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js before continuing."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Node.js version 18 or higher is required. Current version: $NODE_VERSION"
    exit 1
fi

echo "Node.js version $NODE_VERSION is installed."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed."
    exit 1
fi

echo "npm is installed."

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "Dependencies installed successfully."
else
    echo "Failed to install dependencies."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Image Pro Environment Variables
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
EBAY_APP_ID=
EBAY_ACCESS_TOKEN=
VITE_EBAY_CERT_ID=
VITE_EBAY_AUTH_TOKEN=
EOF
    echo ".env file created. Please update with your API keys."
fi

# Install additional development tools
echo "Installing development tools..."
npm install -g supabase
npm install -g @tauri-apps/cli
npm install -g electron-builder

echo "Development environment setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "To build the project, run:"
echo "  npm run build"
echo ""
echo "Don't forget to update your .env file with API keys!"