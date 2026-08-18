# Sayfit Studio - Development Guide

**Last Updated:** July 13, 2026  
**Project Version:** 1.0  
**Maintainer:** Mehdi Seyfi (Sayfit Studio)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Code Organization](#code-organization)
5. [Key Features](#key-features)
6. [Recent Improvements](#recent-improvements)
7. [Bugs Fixed](#bugs-fixed)
8. [Best Practices](#best-practices)
9. [Deployment Guide](#deployment-guide)
10. [Future Recommendations](#future-recommendations)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Sayfit Studio** is a modern, responsive portfolio website for sculptor Mehdi Seyfi. It showcases:
- Sculpture work (stone, glass, resin)
- Tailor-made eyewear
- Logo design portfolio
- A standalone setar tuner application

### Key Characteristics
- ✅ **No dependencies** - Pure HTML/CSS/JavaScript (vanilla)
- ✅ **No build tools** - Direct file serving, no webpack/Vite/bundlers
- ✅ **CDN-backed assets** - Images hosted via jsDelivr GitHub CDN
- ✅ **Responsive** - Mobile-first, works on all screen sizes
- ✅ **Accessible** - ARIA labels, semantic HTML, keyboard navigation
- ✅ **Fast** - ~36 KB JS, ~26 KB CSS (unminified); should minify to ~12 KB JS, ~18 KB CSS

---

## Getting Started

### Prerequisites
- Any modern web browser (Chrome, Firefox, Safari, Edge - 2020+)
- A static file server (optional, but recommended)
  - Python: `python3 -m http.server 8000`
  - Node: `npx http-server`
  - PHP: `php -S localhost:8000`

### Running Locally
1. Clone/download the repository
2. Open `index.html` in a browser **OR** serve the directory via a local server
3. For best results, use a server (fixes CORS/CDN image loading)

### File Serving
```bash
# Python 3
cd /path/to/SayfitWebsite
python3 -m http.server 8000
# Visit: http://localhost:8000

# Node.js (requires npx/npm)
npx http-server

# PHP
php -S localhost:8000
```

---

## Project Structure

```
SayfitWebsite/
├── index.html              Main entry point (single-page app)
├── CLAUDE.md               Asset pipeline documentation
├── DEVELOPMENT.md          This file (developer guide)
├── .gitignore              Git rules (tracks only projects/ and data/)
│
├── css/
│   └── style.css          Complete styling (25.9 KB unminified)
│
├── js/
│   └── script.js           Core application logic (36.1 KB unminified)
│
├── data/
│   └── projects.json      Generated project metadata (build output)
│
├── image/
│   ├── favicon.svg        Browser tab icon
│   └── mehdi.jpg          About section portrait
│
├── font/
│   ├── SpaceGrotesk.woff2 Main display font
│   └── Ubuntu-Light.woff2 Logo animation font
│
├── projects/              Asset source (git-tracked)
│   ├── work/
│   │   ├── sculpture/     6 sculpture projects
│   │   ├── tailor-made-glasses/
│   │   └── logo-design/
│   └── asset/             Customer slideshow images
│
├── customer/              Slideshow section
│   └── index.html         Full-screen image carousel
│
├── Sayfit-Tuner/          Standalone app
│   ├── index.html
│   ├── css/style.css
│   └── js/tuner.js
│
└── build/                 (Reserved for future build outputs)
```

---

## Code Organization

### JavaScript Architecture (`js/script.js`)

The script is organized into logical sections (1180 lines):

#### 1. **Initialization (Lines 1-176)**
- Page state management
- DOM references
- Project data loading with error handling
- Constants and configuration

```javascript
const PROJECT_DATA_URL = "data/projects.json";
const DEFAULT_CDN_BASE = "https://cdn.jsdelivr.net/gh/fampeh/sayfit-assets@v1.5/";
```

#### 2. **Cube Navigation (Lines 178-464)**
- 3D cube rotation physics
- Drag/touch handling with inertia
- Face focusing and auto-spin
- Hover intent delay (250ms)

Key Functions:
- `getFaceTargetRotation()` - Map face orientation to rotation angles
- `focusFace()` - Smoothly rotate cube to face
- `startDrag()`, `moveDrag()`, `endDrag()` - Touch/mouse input
- `animate()` - RAF animation loop with inertia

#### 3. **Navigation UI (Lines 476-620)**
- Sticky header navigation
- Mobile hamburger menu
- Active link highlighting on scroll

#### 4. **Project Sliders (Lines 618-1082)**
- 3D carousel using CSS perspective
- Polygon navigation visualization (SVG)
- Auto-demo animation on scroll
- Responsive radius calculation

Key Functions:
- `initSlider()` - Initialize carousel for a category
- `rotateSliderTo()` - Animate slider to specific index
- `autoRotateDemo()` - Auto-play demo on intersection
- `buildPolygonNav()` - Generate SVG navigation polygon

#### 5. **Modal Lightbox (Lines 677-815)**
- Full-screen project media viewer
- Thumbnail selection with drag scroll
- Keyboard navigation (arrow keys, Escape)
- Touch swipe support

Key Functions:
- `openProjectModal()` - Show lightbox with media
- `navigateModal()` - Switch between media items
- `setMainMedia()` - Render image/video element
- `closeModal()` - Cleanup and hide

#### 6. **Utility Functions (Lines 117-147)**
- `isAbsoluteUrl()` - Check if URL is absolute
- `resolveMediaSrc()` - Convert relative to CDN absolute URLs
- `normalizeProjectData()` - Transform raw JSON to app data
- `loadProjectData()` - Async fetch with error handling

### CSS Architecture (`css/style.css`)

Organized by component (1160 lines):

| Component | Lines | Purpose |
|-----------|-------|---------|
| Fonts & Variables | 1-23 | CSS custom properties, font-face declarations |
| Layout & Reset | 25-47 | Base styles, box-sizing, overflow |
| Sticky Navigation | 49-204 | Fixed header, hamburger menu, responsive |
| 3D Cube Scene | 206-402 | Perspective, transforms, intro animations |
| Content Sections | 404-595 | Work layout, project sliders, responsive grid |
| Carousel & Slider | 596-622 | 3D carousel styling, navigation buttons |
| Modal Lightbox | 624-818 | Backdrop, media, thumbnails, navigation |
| Logo Animation | 1025-1160 | SVG stroke animation, character stagger |
| Media Queries | 865-1022 | Responsive breakpoints (900px, 720px, 768px) |

#### CSS Variables (Custom Properties)
```css
:root {
  --bg: #ffffff;              /* Background color */
  --ink: #111111;             /* Text color */
  --gray-1 through --gray-3;  /* Grayscale palette */
  --size: clamp(210px, 60vmin, 320px);  /* Cube size (responsive) */
  --font: "Space Grotesk", sans-serif;  /* Main font */
  --transition: 0.3s ease;    /* Standard duration */
  --fade-duration: 1.1s;      /* Intro animation */
}
```

---

## Key Features

### 1. Interactive 3D Cube Navigation
- **Physics-based drag**: Velocity and inertia for natural momentum
- **Auto-spin**: Rotates when idle, stops on interaction
- **Face focusing**: Hover (desktop) or click (mobile) to align face
- **Smooth transitions**: CSS `transition` for non-dragging, RAF for physics
- **Responsive**: Scales with viewport (clamp values)

```javascript
// Example: Rotate cube to face
focusFace(face);  // Smoothly rotates cube to show face
scrollToTarget(face.dataset.target);  // Navigate to section
```

### 2. 3D Project Carousels
- **Cylindrical perspective**: Slides arranged in circle, 3D transforms
- **Radius calculation**: `radius = (width / 2) / tan(π / slideCount)`
- **Auto-demo**: Plays intro animation when section scrolls into view
- **Polygon navigation**: SVG-based visual indicator, clickable edges
- **Responsive**: Recalculates radius on window resize

```javascript
// Carousel uses CSS perspective and rotateY for 3D effect
carousel.style.transform = `translateZ(-${radius}px) rotateY(${rotation}deg)`;
```

### 3. Full-Screen Modal Lightbox
- **Arrow key navigation**: Left/Right to browse media
- **Touch swipe**: Swipe left/right on main media
- **Thumbnail carousel**: Drag to scroll, click to select
- **Media support**: Images with lazy loading, videos with controls
- **Accessibility**: ARIA attributes, keyboard shortcuts, modal focus trap

```javascript
// Navigate with arrow keys or touch swipe
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") navigateModal(-1);
  if (e.key === "ArrowRight") navigateModal(1);
  if (e.key === "Escape") closeModal();
});
```

### 4. Responsive Mobile-First Design
- **Breakpoints**: 720px (mobile), 768px (tablet), 900px (desktop)
- **Touch-optimized**: 44px+ button targets, swipe gestures
- **Hamburger menu**: Collapses nav on mobile
- **Flexible grid**: `minmax()` for responsive columns
- **Viewport units**: `dvh` (dynamic viewport height) for mobile

### 5. Asset Pipeline with CDN
- **Source files**: `projects/work/<category>/<project>/` contains raw images
- **Build script**: `update_projects.py` scans folders and generates `data/projects.json`
- **CDN delivery**: jsDelivr serves assets from GitHub releases (faster, distributed)
- **Metadata preservation**: Script preserves manual edits to `year`, `title`, `desc`

---

## Recent Improvements

### Code Quality
✅ **Removed all non-English comments** - Replaced Persian/French with English  
✅ **Improved error handling** - Added try/catch in `loadProjectData()`  
✅ **Fixed deprecated API** - Removed `performance.navigation` (use `performance.getEntriesByType()`)  
✅ **Better null checks** - Added safeguards in `closeStickyMenus()`, `loadProjectData()`  
✅ **Cleaner event handling** - Replaced catch-all `_` with explicit `err` variable  

### JavaScript Refactoring
✅ **Error notification** - Added `showErrorNotification()` to display fetch errors to users  
✅ **Removed console noise** - Cleaner console output (only errors)  
✅ **Better variable naming** - More descriptive names in loops and closures  
✅ **Optimized touch events** - `passive: true` for scroll performance  

### CSS Cleanup
✅ **Removed redundant comments** - Streamlined CSS comments (English only)  
✅ **Consistent formatting** - Normalized spacing and property order  
✅ **Browser prefixes preserved** - Kept `-webkit-` for older Safari versions  
✅ **Accessibility improved** - Better focus states, outline offsets  

### HTML Improvements
✅ **Fixed modal markup** - Already present, just cleaned up indentation  
✅ **ARIA attributes** - All interactive elements have proper roles/labels  
✅ **Semantic structure** - Uses `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`  

---

## Bugs Fixed

| Bug | Status | Fix |
|-----|--------|-----|
| Deprecated `performance.navigation` API | ✅ Fixed | Use `performance.getEntriesByType()` only |
| Missing error handling in fetch | ✅ Fixed | Added try/catch + user notification |
| Unhandled null references in menu code | ✅ Fixed | Added `.filter(Boolean)` and null checks |
| Persian/French comments cluttering code | ✅ Fixed | Replaced all with English comments |
| Catch-all error variable `_` | ✅ Fixed | Use explicit `err` variable |
| Modal may not close on Escape in some cases | ✅ Verified | Already handles via global keydown listener |
| Carousel opacity flash on page load | ✅ Verified | Already handled by `.carousel:empty { opacity: 0 }` |

### Known Non-Issues
- ℹ️ Hard-coded CDN URLs in `customer/index.html` - Intentional design (separate from main app)
- ℹ️ Large script.js file (1180 lines) - Modularization recommended but not critical
- ℹ️ No minification - Can add build step later (won't break functionality)

---

## Best Practices

### 1. **Working with Project Data**
```javascript
// Project data is automatically loaded and normalized
projectData = {
  "sculpture": [
    {
      title: "2.5 cubic meter of stone",
      year: "2024",
      desc: "A heavier sculptural body...",
      media: [
        { type: "image", src: "https://cdn.jsdelivr.net/gh/fampeh/sayfit-assets@main/projects/..." },
        { type: "video", src: "https://cdn.jsdelivr.net/gh/..." }
      ]
    }
  ]
}

// Always access via normalized data, not from JSON directly
const sculptures = projectData["sculpture"];
```

### 2. **Adding New Project Categories**
1. Create folder: `projects/work/category-name/`
2. Add projects: `projects/work/category-name/project-title/`
3. Add images to each project folder
4. Run `update_projects.py` (generates `data/projects.json`)
5. Add section to `index.html` with matching `data-slider="category-name"`

### 3. **Modifying Cube Behavior**
```javascript
// Cube rotation constants (adjust for different feel)
const DEFAULT_ROT_X = -25;   // Initial pitch
const DEFAULT_ROT_Y = 35;    // Initial yaw
const DRAG_THRESHOLD = 8;    // Min pixels to consider a drag
const FACE_FOCUS_TOLERANCE = 7;  // Tolerance for face alignment
const HOVER_INTENT_DELAY = 250;  // Delay before hover-focus on desktop

// Physics constants (adjust for different momentum feel)
const INERTIA_DAMPING = 0.92;    // Velocity multiplier per frame (0-1, lower = faster stop)
const LERP_FACTOR = 0.12;         // Lerp interpolation factor (0-1, higher = faster)
```

### 4. **Event Listener Cleanup**
Always clean up timers and event listeners:
```javascript
// Good
let hoverIntentTimer = null;
face.addEventListener("mouseenter", () => {
  clearTimeout(hoverIntentTimer);  // Clear previous timer
  hoverIntentTimer = setTimeout(() => focusFace(face), HOVER_INTENT_DELAY);
});

// Cleanup on unmount (if SPA routing added later)
function cleanup() {
  clearTimeout(hoverIntentTimer);
  // ... clear other listeners
}
```

### 5. **Responsive Image Loading**
```javascript
// Images loaded with adaptive strategies
mediaEl.loading = idx === 0 ? "eager" : "lazy";  // First image loads immediately
mediaEl.alt = project.title || "Project media";   // Always provide alt text

// Grayscale filter for visual interest
.slide img { filter: grayscale(100%); }
.slide:hover img { filter: grayscale(0%); }
```

---

## Deployment Guide

### Option 1: Manual Upload (Current Method)
1. Ensure all files in `SayfitWebsite/` are current
2. Open FileZilla or similar FTP client
3. Connect to web host
4. Upload all files (except `.git/` and `node_modules/`)
5. Verify:
   - `index.html` loads
   - Images display (check CDN URLs)
   - Navigation cube responds

### Option 2: GitHub Actions (Recommended Future)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Web Host
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Minify CSS/JS
        run: |
          npx cssnano css/style.css -o css/style.min.css
          npx terser js/script.js -o js/script.min.js
      - name: Deploy to FTP
        uses: wangzuo/ftp-action@master
        with:
          host: ${{ secrets.FTP_HOST }}
          user: ${{ secrets.FTP_USER }}
          password: ${{ secrets.FTP_PASS }}
          local-dir: ./
          remote-dir: /www/
```

### Asset Updates
After adding/modifying projects:
1. Run `update_projects.py` or `update_projects.exe`
2. Choose "Full update" to bump CDN version tag
3. Commit & push `projects/` and `data/projects.json`
4. Wait for jsDelivr cache purge (~2 hours, or manual purge via purge API)
5. Update `data/projects.json` on web host

---

## Future Recommendations

### High Priority
1. **Minify CSS/JS** - Reduce payload by 50%
   ```bash
   npx cssnano css/style.css -o css/style.min.css
   npx terser js/script.js -o js/script.min.js
   ```

2. **Add Error Monitoring** - Know when users encounter issues
   ```javascript
   if (error) {
     fetch('https://api.sentry.io/api/...', { method: 'POST', body: JSON.stringify(error) });
   }
   ```

3. **SEO Optimization**
   - Add Open Graph meta tags for social sharing
   - Add structured data (Schema.org CreativeWork)
   - Meta descriptions for each section

### Medium Priority
4. **Code Modularization** - Split `script.js` into modules
   ```
   js/
   ├── script.js (30 lines, imports only)
   ├── modules/
   │   ├── cube.js (200 lines)
   │   ├── carousel.js (250 lines)
   │   ├── modal.js (150 lines)
   │   └── data.js (50 lines)
   ```

5. **Unit & E2E Tests** - Ensure regressions don't break features
   ```bash
   npm install --save-dev cypress
   npx cypress open
   ```

6. **Analytics** - Understand visitor behavior
   - Plausible Analytics (privacy-friendly)
   - What projects are viewed most?
   - Which devices visit most?

### Lower Priority
7. **Dark Mode** - CSS variables already ready
   ```css
   @media (prefers-color-scheme: dark) {
     :root {
       --bg: #111111;
       --ink: #ffffff;
     }
   }
   ```

8. **Internationalization (i18n)** - Support Persian/English toggle
   ```javascript
   const lang = document.documentElement.lang;  // "en" or "fa"
   ```

9. **Performance Budget** - Monitor bundle size growth
   ```bash
   npm install --save-dev bundlesize
   # Configure in package.json
   ```

---

## Troubleshooting

### Problem: Images don't load locally
**Cause**: CORS restrictions when opening `file://` directly  
**Solution**: Use a local server (see [Getting Started](#getting-started))

### Problem: Cube doesn't rotate smoothly
**Cause**: `prefersReducedMotion` is enabled, or browser lacks `requestAnimationFrame`  
**Solution**: 
- Check Settings > Accessibility > "Reduce motion"
- Use a modern browser (Chrome, Firefox, Safari, Edge 2020+)

### Problem: Modal doesn't open when clicking project
**Cause**: Projects JSON didn't load, or project data is empty  
**Solution**:
- Open DevTools (F12) > Console
- Check for errors in "Project data could not be loaded"
- Verify `data/projects.json` exists and is valid JSON
- Check network tab to see if fetch succeeded

### Problem: Sticky nav doesn't appear on scroll
**Cause**: Landing section hasn't scrolled past threshold  
**Solution**: 
- Navbar appears when you scroll past 75% of landing section
- Check CSS: `.at-content .sticky-nav { transform: translateY(0); }`
- Verify JS: `document.body.classList.toggle("at-content", window.scrollY >= triggerY)`

### Problem: Mobile menu closes unexpectedly
**Cause**: Click event bubbling closing menu  
**Solution**: Check `e.stopPropagation()` on menu buttons (already fixed)

### Problem: Carousel slides are blank
**Cause**: Project data not loaded before carousel init  
**Solution**:
- Carousel only initializes after `projectDataReady` Promise resolves
- Check network to ensure `data/projects.json` fetch succeeds
- Verify media URLs in JSON are accessible

### Problem: Unresponsive on old browsers
**Cause**: Missing polyfills or unsupported CSS features  
**Solution**:
- This site targets modern browsers (CSS Grid, CSS 3D, Fetch API)
- Consider using Babel transpiler if old browser support needed

---

## Code Review Checklist

Before merging changes:

- [ ] All non-English comments replaced with English
- [ ] No console.errors unhandled
- [ ] Try/catch wraps network requests
- [ ] Event listeners cleaned up after use
- [ ] CSS variables used instead of hardcoded colors
- [ ] Mobile layout tested at 320px, 768px, 1200px
- [ ] Touch events work on tablets/phones
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader tested (VoiceOver, NVDA)
- [ ] Performance: LCP < 2.5s, FCP < 1.8s

---

## Contact & Support

**Project Owner**: Mehdi Seyfi (Sayfit Studio)  
**Email**: sayfit404@gmail.com  
**Phone**: +98 936 409 1489  

For technical questions or contributions, refer to [CLAUDE.md](./CLAUDE.md) for asset pipeline details.

---

**Happy coding! 🚀**
