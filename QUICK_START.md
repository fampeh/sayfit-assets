# Sayfit Studio - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Start a Local Server
```bash
# Python (easiest)
cd SayfitWebsite
python3 -m http.server 8000

# Then visit: http://localhost:8000
```

### Step 2: Open Browser
Visit `http://localhost:8000` in your browser.

### Step 3: Done! 🎉
Explore the site, click the cube, try the sliders.

---

## 📁 File Organization (Quick Reference)

```
SayfitWebsite/
├── index.html           ← Main page (start here)
├── DEVELOPMENT.md       ← Full technical guide (read if you need to modify code)
├── QUICK_START.md       ← This file
│
├── css/style.css        ← All styling (25.9 KB)
├── js/script.js         ← All functionality (36.1 KB)
│
├── data/projects.json   ← Project metadata (auto-generated)
├── projects/            ← Source images (git-tracked)
│   └── work/
│       ├── sculpture/   ← 6 sculpture projects
│       ├── tailor-made-glasses/
│       └── logo-design/
│
├── customer/            ← Slideshow page
└── Sayfit-Tuner/        ← Setar tuner app
```

---

## ⚡ Common Tasks

### Add a New Project
1. Create folder: `projects/work/sculpture/my-new-project/`
2. Add images: `projects/work/sculpture/my-new-project/cover.jpg`, `img1.jpg`, etc.
3. Run `update_projects.py` (or `.exe`)
4. Choose "Full update" → auto-generates `data/projects.json`
5. Commit & push to GitHub
6. Images appear automatically in carousel!

### Fix a Bug / Make Changes
1. Edit `js/script.js` or `css/style.css`
2. Save file
3. Refresh browser (F5)
4. See changes instantly
5. Test on mobile (DevTools: F12 → Device mode)

### Change Colors
1. Open `css/style.css`
2. Find `:root` (line ~9)
3. Edit CSS variables:
   ```css
   :root {
     --bg: #ffffff;        /* Background */
     --ink: #111111;       /* Text */
     --gray-1: #333333;    /* Dark gray */
   }
   ```
4. Save & refresh

### Change Fonts
1. Open `css/style.css`
2. Look for `@font-face` declarations (line ~1-7)
3. Replace font file path, or use system font
4. Update `--font` variable in `:root`

### Change Navigation Text
1. Open `index.html`
2. Look for `<nav>` element (line ~17)
3. Change link text, add/remove menu items
4. No CSS changes needed!

### Make Site Faster (Minify)
```bash
# Install tools
npm install -g cssnano terser

# Minify
cssnano css/style.css > css/style.min.css
terser js/script.js -o js/script.min.js

# Update HTML
# Change: <link rel="stylesheet" href="css/style.css">
# To: <link rel="stylesheet" href="css/style.min.css">
# Change: <script src="js/script.js">
# To: <script src="js/script.min.js">
```

---

## 🔍 Debugging

### Images not loading?
1. Use local server (not `file://`)
2. Check browser console (F12)
3. Look for red errors
4. Check `data/projects.json` is valid

### Cube not rotating?
1. Press F12 → check Console for errors
2. Try different browser (Chrome vs Firefox)
3. Disable any browser extensions
4. Check if "Reduce motion" is enabled in OS settings

### Modal doesn't open?
1. Open DevTools (F12)
2. Click a project card
3. Look at Console tab
4. See any red errors? Fix those first.

---

## 📚 Documentation Map

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **QUICK_START.md** | This file - get started fast | 5 min |
| **DEVELOPMENT.md** | Deep dive into code | 20 min |
| **CLAUDE.md** | Asset pipeline & git explained | 10 min |
| **IMPROVEMENTS_SUMMARY.md** | What changed in last update | 5 min |

---

## 🎯 Common Tweaks

### Slow down the cube rotation
```javascript
// In js/script.js, find "autoSpin"
if (autoSpin) {
  rotY += 0.08;    // ← Try 0.04 instead
  rotX += 0.03;    // ← Try 0.01 instead
}
```

### Speed up drag momentum
```javascript
// In js/script.js, find "inertia animation loop"
velX *= 0.92;  // ← Try 0.88 for faster stopping
velY *= 0.92;  // ← Try 0.85 for really fast
```

### Change cube size
```css
/* In css/style.css, find :root */
--size: clamp(210px, 60vmin, 320px);
       /* Change 320px to 400px for bigger */
       /* Change 210px to 150px for smaller */
```

### Change hamburger menu width
```css
/* In css/style.css, find .hamburger */
.hamburger {
  width: 36px;    /* ← Change this */
  height: 36px;   /* ← And this */
}
```

---

## ✅ Checklist Before Deploying

- [ ] Tested cube navigation on desktop
- [ ] Tested on mobile (touch works?)
- [ ] Clicked all project cards
- [ ] Modal opens and navigates
- [ ] Keyboard shortcuts work (arrow keys, ESC)
- [ ] Images load from CDN
- [ ] No red errors in console
- [ ] Text is readable on small screens
- [ ] Page loads under 3 seconds

---

## 🆘 Help!

### My changes aren't showing up
- **Cause**: Browser cache  
- **Fix**: Hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)

### Images are broken
- **Cause**: CDN not responding or offline  
- **Fix**: Check network tab (F12), or use local server with local images

### Touch doesn't work on phone
- **Cause**: Device viewport not set  
- **Fix**: Refresh page, or clear browser cache

### Everything's broken!
- **Last Resort**: 
  ```bash
  git checkout -- .  # Undo all changes
  ```

---

## 📞 When to Read Full Docs

Read **DEVELOPMENT.md** if you need to:
- ✅ Understand code architecture
- ✅ Add new features
- ✅ Fix bugs
- ✅ Optimize performance
- ✅ Setup automation (GitHub Actions)
- ✅ Add tests

Read **CLAUDE.md** if you need to:
- ✅ Understand asset pipeline
- ✅ Add new project categories
- ✅ Manage CDN updates
- ✅ Handle git commits

---

## 🎓 Learning Path

1. **5 min**: Read this file (QUICK_START.md)
2. **10 min**: Add a test project to see the pipeline
3. **20 min**: Read DEVELOPMENT.md
4. **30 min**: Modify `js/script.js` or `css/style.css`
5. **Congrats!**: You're now a Sayfit Studio developer! 🚀

---

## 💻 Tech Stack (TL;DR)

| Tech | What | Why |
|------|------|-----|
| HTML5 | Structure | Semantic, accessible |
| CSS3 | Styling | 3D transforms, animations |
| JavaScript | Logic | Physics, interactivity |
| SVG | Graphics | Logo, polygon nav |
| jsDelivr | CDN | Fast image delivery |
| Python | Automation | Asset pipeline |
| Git | Version control | Track media & metadata |

**No frameworks. No build tools. Pure web standards.**

---

## 🎨 Design System

### Colors
```
--bg: #ffffff       White background
--ink: #111111      Dark text
--gray-1: #333333   Dark gray (headings)
--gray-2: #777777   Medium gray (secondary text)
--gray-3: #e6e6e6   Light gray (borders)
```

### Fonts
```
Font: Space Grotesk  (modern, clean)
Fallback: Helvetica Neue, Arial
```

### Spacing
```
Cube: clamp(210px, 60vmin, 320px)   Responsive size
Padding: 10vw                        Responsive padding
Gap: 12-28px                         Consistent spacing
```

### Breakpoints
```
720px   Mobile ↔ Tablet
900px   Tablet ↔ Desktop
1200px+ Desktop (max-width containers)
```

---

## 🚀 You're Ready!

Go ahead and explore the code. Don't break anything. Have fun! 🎉

For more details, see **DEVELOPMENT.md**.
