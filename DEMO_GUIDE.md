# 🎬 Demo Guide - Try the Cinematic Movement System

## 🚀 **3 Ways to Try the Demo**

### 1. **Instant Demo (No Installation)**
```bash
# Just open the HTML file in your browser
open cinematic-demo.html

# Or use our demo launcher
./demo.sh
```
**Perfect for:** Quick exploration, sharing with others, immediate gratification

### 2. **Development Environment**
```bash
# Install dependencies and build
pnpm install && pnpm run build

# Start development server
cd packages/spatial-engine && npm run dev

# Open demo at localhost
open http://localhost:3000/demo
```
**Perfect for:** Developers, customization, debugging

### 3. **Integrate in Your Project**
```bash
# Install packages
npm install @fir/spatial-engine @fir/penpot-parser

# Use in your code
import { CinematicDemo } from '@fir/spatial-engine';
const demo = new CinematicDemo({ container, showControls: true });
```
**Perfect for:** Production use, custom integration, building apps

## 🎭 **What You'll Experience**

### **Interactive Demo Interface**
- **Left Sidebar**: 7 scenario buttons with descriptions
- **Main Canvas**: Spatial rendering with cinematic transitions  
- **Bottom Panel**: Performance metrics and debug info
- **Controls**: Play, stop, metrics, export functionality

### **7 Demo Scenarios**

#### 🏰 **Hero Journey** 
*Classic narrative arc with expanding spiral*
- **Layout**: Expanding spiral following hero's journey structure
- **Transitions**: Dramatic zoom with intensity scaling
- **Audio**: Epic soundtrack with spatial positioning
- **Best For**: Storytelling, product journeys, onboarding

#### 🌀 **Spiral Story**
*Golden ratio layout with cinematic reveals*
- **Layout**: Mathematical golden spiral for aesthetic appeal
- **Transitions**: Cinematic reveal with blur and depth effects
- **Audio**: Atmospheric ambiance with reverb
- **Best For**: Portfolios, creative showcases, art galleries

#### 📅 **Timeline**
*Linear progression with professional focus*
- **Layout**: Horizontal timeline with gentle wave variation
- **Transitions**: Clean, professional focus movements
- **Audio**: Subtle transition sounds
- **Best For**: Process explanations, historical content, presentations

#### 🎯 **Hub and Spoke**
*Central navigation with radial movements*
- **Layout**: Central hub with features arranged radially
- **Transitions**: Zoom focus with highlighting effects
- **Audio**: Directional audio cues for navigation
- **Best For**: Feature demos, dashboards, navigation menus

#### 🔍 **Exploration Grid**
*Grid-based discovery with playful bounces*
- **Layout**: Organic grid with slight randomization
- **Transitions**: Playful bounce with elastic easing
- **Audio**: Playful sound effects with spatial positioning
- **Best For**: Galleries, catalogs, discovery interfaces

#### 📊 **Presentation**
*Slide-based flow with clean transitions*  
- **Layout**: Linear slide progression
- **Transitions**: Professional slide transitions
- **Audio**: Clean presentation audio cues
- **Best For**: Business presentations, slide decks

#### 👤 **User Journey**
*Onboarding with calm documentary style*
- **Layout**: Gentle path following user flow principles
- **Transitions**: Smooth documentary camera movements
- **Audio**: Calm, guiding voiceover effects
- **Best For**: User onboarding, tutorials, guided tours

## 🎪 **Movement Styles You'll See**

### **Documentary Pan**
- Smooth, steady camera movement
- Ultra-smooth S-curve progression
- Perfect for educational content

### **Cinematic Reveal**
- Dramatic reveals with depth effects
- Blur, vignette, and spotlight highlighting
- Creates tension and release

### **Playful Bounce** 
- Energetic elastic overshoot
- Multiple bounce cycles with decay
- Engaging and fun interaction

### **Professional Focus**
- Quick, efficient movements
- Clean highlighting without distraction
- Business-appropriate aesthetics

### **Dramatic Zoom**
- Intense zoom with cinematic timing
- Suspense build-up and release
- Perfect for storytelling climaxes

## 🔊 **Spatial Audio Features**

### **Audio Cues to Listen For**
- **Transition Whooshes** - Movement between elements
- **Focus Pings** - Element highlighting sounds
- **Doppler Effects** - Frequency shifts during fast movement
- **Ambient Soundscapes** - Background spatial atmosphere
- **Directional Audio** - Sounds positioned in 3D space

### **Audio Controls**
- **Browser Audio Permissions** - Allow when prompted
- **Volume Controls** - Use demo interface or browser
- **Spatial Range** - Audio distance affects volume/clarity
- **Accessibility** - Audio cues support screen readers

## 🎮 **Interactive Controls**

### **Sidebar Controls**
- **Scenario Buttons** - Click to load different narrative layouts
- **Active Highlighting** - Shows currently selected scenario
- **Descriptions** - Hover for detailed explanations

### **Demo Controls**
- **▶ Play All Connections** - Execute complete cinematic sequence
- **🎭 Demo Movement Types** - Showcase individual animation styles  
- **📊 Show Performance Metrics** - Display FPS, memory, timing stats
- **💾 Export Current Scenario** - Download scenario data as JSON
- **⏹ Stop Demo** - Halt all current playback

### **Keyboard Shortcuts**
- **Space** - Play/pause current sequence
- **Escape** - Stop all playback
- **1-7** - Quick load scenarios by number
- **M** - Toggle performance metrics
- **S** - Screenshot current viewport

## 📊 **Performance Metrics**

Watch for these real-time indicators:

### **Frame Rate**
- **Target**: 60+ FPS sustained
- **Green**: >55 FPS (excellent)
- **Yellow**: 30-55 FPS (good)
- **Red**: <30 FPS (needs optimization)

### **Memory Usage**
- **Healthy**: <500MB for large datasets
- **JavaScript Heap**: Main memory consumption
- **GPU Memory**: WebGL texture and buffer usage

### **Transition Performance**
- **Response Time**: <100ms average (excellent)
- **Animation Duration**: Varies by movement style
- **Audio Latency**: <50ms for spatial audio

## 🛠️ **Troubleshooting**

### **Demo Won't Load**
- **Check Browser**: Requires modern browser with WebGL support
- **File Location**: Ensure cinematic-demo.html is in root directory
- **Console Errors**: Open browser dev tools to check for errors

### **No Audio**  
- **Permissions**: Allow audio when browser prompts
- **Volume**: Check browser and system volume levels
- **Hardware**: Ensure speakers/headphones connected
- **Browser Support**: Some browsers require user interaction for audio

### **Poor Performance**
- **Browser**: Try Chrome/Edge for best WebGL performance
- **Hardware**: Integrated graphics may limit performance
- **Background Apps**: Close other resource-intensive applications
- **Zoom Level**: Browser zoom affects rendering performance

### **Visual Issues**
- **WebGL Support**: Check if browser supports WebGL 2.0
- **Graphics Drivers**: Update to latest graphics drivers
- **Hardware Acceleration**: Enable in browser settings

## 🎯 **What to Look For**

### **Narrative Intelligence**
- Notice how layouts change based on scenario type
- See how element positioning follows storytelling principles
- Observe emotional tone matching visual style

### **Movement Quality**
- Smooth 60fps transitions throughout
- Natural, cinematic timing and easing
- Appropriate movement style for content type

### **Audio Integration**
- Spatial positioning of sounds
- Doppler effects during fast movement
- Audio matching visual style and emotion

### **Performance Optimization**
- Consistent frame rates during complex animations
- Smooth interaction despite large element counts
- No visual stutters or memory leaks

## 🎨 **Customization Ideas**

After trying the demo, consider these customizations:

### **Custom Movement Styles**
```typescript
// Add your own cinematic movement
choreographer.addMovement('my-style', {
  // Your custom keyframes and easing
});
```

### **Custom Layout Patterns**
```typescript  
// Create unique narrative layouts
choreographer.addLayout('my-layout', (flows, elements) => {
  // Your positioning algorithm
});
```

### **Custom Audio Cues**
```typescript
// Add themed audio experiences
spatialAudio.loadCustomCue('my-theme', audioBuffer);
```

## 🎉 **Next Steps**

After exploring the demo:

1. **Read Full Documentation** - See `CINEMATIC_SYSTEM.md` for complete API
2. **Try Your Own Penpot Files** - Use `PenpotFlowParser` on real designs
3. **Integrate in Projects** - Add cinematic features to your apps
4. **Contribute Ideas** - Share custom movements and layouts
5. **Build Something Amazing** - Transform your designs into cinematic experiences!

**Ready to revolutionize spatial navigation with cinematic storytelling!** 🎬✨