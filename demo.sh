#!/bin/bash

# 🎬 FIR Spatial Web - Cinematic Demo Launcher
# Easy way to try the cinematic movement system

echo "🚀 FIR Spatial Web - Spatial Navigation Demo"
echo "============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "spatial-demo.html" ]; then
    echo "❌ Error: spatial-demo.html not found"
    echo "   Please run this script from the root of the spatial-web repository"
    exit 1
fi

echo "🚀 Launching Spatial Navigation Demo..."
echo ""
echo "Core features you'll see:"
echo "  🌊 Infinite Zoom Navigation - Replace pagination with spatial movement"
echo "  🎯 Direct Flow Mapping - Penpot connections become spatial navigation"
echo "  ⚡ 60fps Performance - Maintained across all zoom levels"
echo "  📱 Responsive Design - Works seamlessly across devices"
echo ""
echo "Optional enhancements:"
echo "  🎭 Narrative Layout Patterns for storytelling"
echo "  🎪 Cinematic Movement Styles for presentations"
echo "  🔊 3D Spatial Audio for immersive experiences"
echo ""

# Detect OS and open demo
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "🍎 Opening demo in default browser (macOS)..."
    open spatial-demo.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "🐧 Opening demo in default browser (Linux)..."
    xdg-open spatial-demo.html
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    echo "🪟 Opening demo in default browser (Windows)..."
    start spatial-demo.html
else
    echo "🌐 Please open spatial-demo.html in your browser manually"
    echo "   File location: $(pwd)/spatial-demo.html"
fi

echo ""
echo "🎯 Demo Instructions:"
echo "  1. Click scenario buttons on the left sidebar"
echo "  2. Use '▶ Play All Connections' to see cinematic transitions"
echo "  3. Try '🎭 Demo Movement Types' for individual styles"
echo "  4. Check browser console for detailed logging"
echo ""
echo "📚 For full documentation, see:"
echo "  • CINEMATIC_SYSTEM.md - Complete feature guide"
echo "  • README.md - Quick start and API reference"
echo ""
echo "🎉 Enjoy exploring the cinematic movement system!"