#!/bin/bash

# Build script for Customate.ai React Widget App
# This script builds the React widget app for iframe deployment

set -e  # Exit on any error

echo "🚀 Building Customate.ai React Widget App..."
echo "================================================="

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WIDGET_APP_DIR="$PROJECT_ROOT/frontend/widget-app"

# Check if widget app directory exists
if [ ! -d "$WIDGET_APP_DIR" ]; then
    echo "❌ Error: Widget app directory not found at $WIDGET_APP_DIR"
    exit 1
fi

echo "📁 Widget app directory: $WIDGET_APP_DIR"

# Navigate to widget app directory
cd "$WIDGET_APP_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in widget app directory"
    exit 1
fi

echo "📦 Installing dependencies..."
if command -v npm >/dev/null 2>&1; then
    npm install
elif command -v yarn >/dev/null 2>&1; then
    yarn install
else
    echo "❌ Error: Neither npm nor yarn found. Please install Node.js and npm."
    exit 1
fi

echo "🔨 Building React widget app for production..."
if command -v npm >/dev/null 2>&1; then
    npm run build
elif command -v yarn >/dev/null 2>&1; then
    yarn build
fi

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not created"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ Error: Build failed - index.html not found in dist directory"
    exit 1
fi

echo "✅ React widget app built successfully!"
echo "📂 Build output: $WIDGET_APP_DIR/dist/"

# Display build information
echo ""
echo "📊 Build Information:"
echo "===================="
echo "📁 Build directory: $(du -sh dist/ | cut -f1) - $(realpath dist/)"
echo "📄 Files created:"
ls -la dist/ | grep -E '\.(html|js|css)$' | while read line; do
    echo "   $line"
done

echo ""
echo "🔧 Next Steps:"
echo "==============="
echo "1. ✅ React widget app is built and ready"
echo "2. 🚀 Start your backend server: python main.py"
echo "3. 🌐 Widget is available at: http://localhost:8000/api/widget/app/"
echo "4. 🧪 Test the widget at: http://localhost:3000/test-chatbot"
echo "5. 📋 Get embed code from the dashboard"

echo ""
echo "🎯 Widget Endpoints:"
echo "==================="
echo "• Main app: /api/widget/app/"
echo "• Settings: /api/widget/settings"
echo "• Health: /api/widget/health"
echo "• Embed code: /api/widget/embed"

echo ""
echo "💡 Development Tips:"
echo "==================="
echo "• For development mode: npm start (in widget-app directory)"
echo "• For production builds: npm run build"
echo "• For auto-rebuild: npm run build:watch (if configured)"
echo "• Logs location: Check browser console in iframe"

echo ""
echo "🎉 React Widget Build Complete!"