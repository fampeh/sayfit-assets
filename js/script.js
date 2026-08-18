// ==== DOM / page state ====
// Prevent browser from restoring scroll position on reload
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const navigationEntry = performance.getEntriesByType("navigation")[0];
const isReload = navigationEntry?.type === "reload";

if (isReload && !window.location.hash) {
  window.scrollTo(0, 0);
}

// ----- Project data -----
const PROJECT_DATA_URL = "data/projects.json";
const DEFAULT_CDN_BASE = "https://cdn.jsdelivr.net/gh/fampeh/sayfit-assets@v1.5/";

let projectData = {};
const projectDataReady = loadProjectData();

// ----- DOM references -----
const scene = document.getElementById("scene");
const cube = document.getElementById("cube");
const faces = document.querySelectorAll(".face");
const landing = document.querySelector(".landing");

const stickyWork = document.getElementById("stickyWork");
const stickyApp = document.getElementById("stickyApp");
const stickyArchive = document.getElementById("stickyArchive");
const homeCubeButton = document.getElementById("homeCube");

const navItems = Array.from(document.querySelectorAll("[data-nav]"));
const hamburger = document.getElementById("hamburgerBtn");
const navCenter = document.getElementById("navCenter");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const isMobileViewport = () => window.innerWidth <= 720;

// ---- Cube rotation state ----
const DEFAULT_ROT_X = -25;
const DEFAULT_ROT_Y = 35;
const INTRO_DELAY = prefersReducedMotion ? 0 : 3200;
const INTRO_ROTATE = prefersReducedMotion ? 0 : 1600;

let dragging = false;
let lastX = 0, lastY = 0;
let rotX = 0, rotY = 0;
let velX = 0, velY = 0;
let dragDistance = 0;
let autoSpin = false;
let pendingFaceScroll = null; // { target: string, isMobile: boolean }

// ---- Hover-to-face feature ----
let hoverTargetRotX = 0, hoverTargetRotY = 0;
let savedRotX = 0, savedRotY = 0;
let savedVelX = 0, savedVelY = 0;
let savedAutoSpin = false;
let isHoveringFace = false;
let isReturningFromHover = false;
const DRAG_THRESHOLD = 8;
const FACE_FOCUS_TOLERANCE = 7;

// ---- Hover intent (delay before focusing) ----
let hoverIntentTimer = null;
const HOVER_INTENT_DELAY = 250; // ms

function getFaceTargetRotation(faceElement) {
  const orient = faceElement.getAttribute('data-face-orient');
  switch (orient) {
    case 'front':  return { rotX: 0,   rotY: 0 };
    case 'back':   return { rotX: 0,   rotY: 180 };
    case 'left':   return { rotX: 0,   rotY: 90 };
    case 'right':  return { rotX: 0,   rotY: -90 };
    case 'top':    return { rotX: -90, rotY: 0 };
    case 'bottom': return { rotX: 90,  rotY: 0 };
    default:       return null;
  }
}

// Handle cube face focus (desktop hover / mobile touch)
function focusFace(face) {
  const target = getFaceTargetRotation(face);
  if (!target) return;

  if (!isHoveringFace && !isReturningFromHover) {
    savedRotX = rotX;
    savedRotY = rotY;
    savedVelX = velX;
    savedVelY = velY;
    savedAutoSpin = autoSpin;

    autoSpin = false;
    velX = 0;
    velY = 0;
    dragging = false; 
    cube.classList.add('no-cube-transition');
  }

  hoverTargetRotX = getNearestRotation(rotX, target.rotX);
  hoverTargetRotY = getNearestRotation(rotY, target.rotY);
  isHoveringFace = true;
  isReturningFromHover = false; 
}

function unfocusCube() {
  if (isHoveringFace && !isReturningFromHover) {
    isHoveringFace = false;
    isReturningFromHover = true;
    hoverTargetRotX = savedRotX;
    hoverTargetRotY = savedRotY;
  }
}

function isAbsoluteUrl(src) {
  return /^[a-z][a-z\d+\-.]*:/i.test(src) || src.startsWith("//");
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function resolveMediaSrc(src, baseUrl) {
  if (!src || isAbsoluteUrl(src)) return src || "";
  return `${ensureTrailingSlash(baseUrl)}${src.replace(/^\/+/, "")}`;
}

function normalizeProjectData(rawData) {
  const baseUrl = rawData.cdnBase || rawData.baseUrl || DEFAULT_CDN_BASE;
  const groups = rawData.projects || {};

  return Object.fromEntries(
    Object.entries(groups).map(([key, projects]) => [
      key,
      (Array.isArray(projects) ? projects : []).map((project) => ({
        ...project,
        media: (project.media || []).map((item) => ({
          ...item,
          src: resolveMediaSrc(item.src, baseUrl)
        }))
      }))
    ])
  );
}

async function loadProjectData() {
  try {
    const response = await fetch(PROJECT_DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');
    projectData = normalizeProjectData(data);
  } catch (error) {
    console.error("Project data could not be loaded.", error);
    projectData = {};
    showErrorNotification('Failed to load projects. Please refresh the page.');
  }
}

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#e74c3c;color:white;padding:15px 20px;border-radius:4px;z-index:1000;font-size:14px;';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

function getNearestRotation(current, target) {
  const delta = ((((target - current) % 360) + 540) % 360) - 180;
  return current + delta;
}

// ---- Slider state map ----
const sliderStates = new Map();

// ---- Modal elements ----
const modal = document.getElementById("projectModal");
const modalMainMedia = document.getElementById("modalMainMedia");
const modalThumbnails = document.getElementById("modalThumbnails");
const closeModalBtn = document.getElementById("closeModal");
const modalYear = document.getElementById("modalYear");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");

let currentModalProject = null;
let currentModalMediaIndex = 0;
let isDownThumb = false;
let startXThumb = 0;
let scrollLeftThumb = 0;

// =====================================================
// 1. Cube intro / activation
// =====================================================
const activateScene = () => {
  if (!scene) return;
  scene.classList.add("active");
  document.body.classList.add("cube-visible");
};

function updateTransform() {
  if (!cube) return;
  cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

function closeAllFaces() {
  faces.forEach((face) => {
    face.classList.remove("active");
    if (face.classList.contains("has-sub")) {
      face.setAttribute("aria-expanded", "false");
    }
  });
}

function resetCube() {
  rotX = DEFAULT_ROT_X;
  rotY = DEFAULT_ROT_Y;
  velX = 0;
  velY = 0;
  isHoveringFace = false;
  isReturningFromHover = false;
  updateTransform();
  closeAllFaces();
}

function runIntroSequence() {
  activateScene();
  updateTransform();
  document.body.classList.add("cube-intro");
  document.body.classList.add("intro-stroke-off");

  if (prefersReducedMotion) {
    rotX = DEFAULT_ROT_X;
    rotY = DEFAULT_ROT_Y;
    updateTransform();
    document.body.classList.add("float-on");
    document.body.classList.remove("intro-stroke-off", "cube-intro");
    autoSpin = true;
    return;
  }

  window.setTimeout(() => {
    rotX = DEFAULT_ROT_X;
    rotY = DEFAULT_ROT_Y;
    updateTransform();
    document.body.classList.add("float-on");
    document.body.classList.remove("intro-stroke-off");
  }, INTRO_DELAY);

  window.setTimeout(() => {
    document.body.classList.remove("cube-intro");
    autoSpin = true;
  }, INTRO_DELAY + INTRO_ROTATE);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runIntroSequence, { once: true });
} else {
  runIntroSequence();
}

// =====================================================
// 2. Cube drag behaviour
// =====================================================
function startDrag(x, y) {
  if (isHoveringFace || isReturningFromHover) {
    isHoveringFace = false;
    isReturningFromHover = false;
    cube.classList.remove('no-cube-transition');
  }
  pendingFaceScroll = null;
  autoSpin = false;
  dragging = true;
  lastX = x;
  lastY = y;
  dragDistance = 0;
}

function moveDrag(x, y) {
  if (!dragging) return;
  const dx = x - lastX;
  const dy = y - lastY;
  
  dragDistance += Math.abs(dx) + Math.abs(dy);

  velY = dx * 0.4;
  velX = dy * 0.4;
  rotY += velY;
  rotX -= velX;
  updateTransform();

  lastX = x;
  lastY = y;
}

function endDrag() {
  dragging = false;
}

if (cube) {
  // Desktop Drag
  if (isDesktop) {
    window.addEventListener("mousedown", (e) => {
      if (!landing || !landing.contains(e.target)) return;
      startDrag(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", endDrag);
  }

  // Touch Drag
  cube.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  cube.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    if (dragDistance > 5 && e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, { passive: false });

  cube.addEventListener("touchend", endDrag);
}

// ---- Inertia / auto-spin animation loop ----
function animate() {
  if (!dragging) {
    if (isHoveringFace || isReturningFromHover) {
      const lerpFactor = 0.12;
      const diffX = hoverTargetRotX - rotX;
      const diffY = hoverTargetRotY - rotY;

      if (Math.abs(diffX) < 0.02 && Math.abs(diffY) < 0.02) {
        rotX = hoverTargetRotX;
        rotY = hoverTargetRotY;

        if (pendingFaceScroll) {
          scrollToTarget(pendingFaceScroll.target);
          if (pendingFaceScroll.isMobile) {
            unfocusCube();
          }
          pendingFaceScroll = null;
        } else if (isReturningFromHover) {
          isReturningFromHover = false;
          autoSpin = savedAutoSpin;
          velX = savedVelX;
          velY = savedVelY;
          cube.classList.remove('no-cube-transition');
        }
      } else {
        rotX += diffX * lerpFactor;
        rotY += diffY * lerpFactor;
      }
      updateTransform();
    } else {
      if (autoSpin) {
        rotY += 0.08;
        rotX += 0.03;
      }
      velX *= 0.92;
      velY *= 0.92;
      if (Math.abs(velX) < 0.01) velX = 0;
      if (Math.abs(velY) < 0.01) velY = 0;

      rotY += velY;
      rotX -= velX;
      updateTransform();
    }
  }
  if (!prefersReducedMotion) requestAnimationFrame(animate);
}

if (!prefersReducedMotion) {
  requestAnimationFrame(animate);
}

// =====================================================
// 3. Face interactions (sub‑menus, scrolling)
// =====================================================
function scrollToTarget(id) {
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

faces.forEach((face) => {
  // Desktop hover with intent delay
  if (isDesktop) {
    face.addEventListener("mouseenter", () => {
      if (dragging) return;
      clearTimeout(hoverIntentTimer);
      hoverIntentTimer = setTimeout(() => {
        cube.classList.add("hovering");
        focusFace(face);
      }, HOVER_INTENT_DELAY);
    });

    face.addEventListener("mouseleave", () => {
      clearTimeout(hoverIntentTimer);
      cube.classList.remove("hovering");
    });
  }

  // Click / touch handling (mobile + desktop)
  face.addEventListener("click", (e) => {
    if (dragDistance > DRAG_THRESHOLD) return;

    const subItem = e.target.closest(".submenu-item");
    if (subItem) {
      if (subItem.dataset.target) scrollToTarget(subItem.dataset.target);
      closeAllFaces();
      if (!isDesktop) unfocusCube();
      return;
    }

    pendingFaceScroll = null;
    focusFace(face);

    if (face.classList.contains("has-sub")) {
      faces.forEach(f => {
        if (f !== face) {
          f.classList.remove("active");
          f.setAttribute("aria-expanded", "false");
        }
      });
      const isActive = face.classList.toggle("active");
      face.setAttribute("aria-expanded", String(isActive));
      if (!isActive && !isDesktop) {
        unfocusCube();
      }
    } else {
      closeAllFaces();
      if (face.dataset.target) {
        pendingFaceScroll = {
          target: face.dataset.target,
          isMobile: !isDesktop
        };
      } else {
        if (!isDesktop) unfocusCube();
      }
    }
  });

  face.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      face.click();
    }
    if (e.key === "Escape") closeAllFaces();
  });
});

// Return cube to free spin when mouse leaves (desktop)
if (isDesktop) {
  cube.addEventListener("mouseleave", () => {
    clearTimeout(hoverIntentTimer);
    unfocusCube();
  });
}

// Return cube to free spin when clicking outside (mobile)
document.addEventListener("click", (e) => {
  if (!e.target.closest(".face")) {
    closeAllFaces();
    pendingFaceScroll = null;
    if (!isDesktop) unfocusCube();
  }
  if (!isDesktop && !e.target.closest(".sticky-menu")) closeStickyMenus();
});

// =====================================================
// 4. Sticky menus (Work / App submenus on mobile)
// =====================================================
const stickyMenus = [stickyWork, stickyApp, stickyArchive].filter(Boolean);

function closeStickyMenus() {
  stickyMenus.forEach((menu) => {
    if (!menu) return;
    menu.classList.remove("open");
    const button = menu.querySelector(".sticky-button");
    if (button) button.setAttribute("aria-expanded", "false");
  });
}

stickyMenus.forEach((menu) => {
  const button = menu.querySelector(".sticky-button");
  if (!button) return;

  button.addEventListener("click", (e) => {
    if (!isMobileViewport()) return;
    e.stopPropagation();
    const wasOpen = menu.classList.contains("open");
    closeStickyMenus();
    const isOpen = !wasOpen;
    menu.classList.toggle("open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

if (stickyWork) {
  stickyWork.querySelectorAll("button[data-target]").forEach((button) => {
    button.addEventListener("click", () => {
      scrollToTarget(button.dataset.target);
      closeStickyMenus();
    });
  });
}

// =====================================================
// 5. Active navigation highlighting on scroll
// =====================================================
const sectionToNav = {
  sculpture: "work",
  "tailor-made-glasses": "work",
  "logo-design": "work",
  archive: "archive",
  about: "about",
  contact: "contact",
  app: "app"
};

const sections = Object.keys(sectionToNav)
  .map((id) => document.getElementById(id))
  .filter(Boolean);

function updateActiveNav() {
  const marker = window.scrollY + 160;
  let activeId = null;
  const firstSectionTop = sections[0] ? sections[0].offsetTop : 0;

  for (const section of sections) {
    if (marker >= section.offsetTop && marker < section.offsetTop + section.offsetHeight) {
      activeId = section.id;
      break;
    }
  }

  if (!activeId) {
    if (window.scrollY < Math.max(firstSectionTop - 160, 80)) {
      navItems.forEach((item) => item.classList.toggle("active", item.dataset.nav === "home"));
    }
    return;
  }

  const navKey = sectionToNav[activeId] || "home";
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.nav === navKey));
}

// =====================================================
// 6. Scroll‑driven UI updates
// =====================================================
function handleScroll() {
  document.body.classList.toggle("scrolled", window.scrollY > 40);
  if (landing) {
      const triggerY = landing.offsetTop + (landing.offsetHeight * 0.75);
      document.body.classList.toggle("at-content", window.scrollY >= triggerY);
  }
  updateActiveNav();
}

handleScroll();
window.addEventListener("scroll", handleScroll, { passive: true });

// =====================================================
// 7. Home cube button
// =====================================================
if (homeCubeButton) {
  homeCubeButton.addEventListener("click", () => {
    resetCube();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// =====================================================
// 8. Mobile menu (hamburger)
// =====================================================
function toggleMobileMenu(forceClose = false) {
  if (!hamburger || !navCenter) return;
  const isOpen = navCenter.classList.contains("open");

  if (forceClose && !isOpen) return;

  if (forceClose) {
    navCenter.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
  } else {
    navCenter.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", navCenter.classList.contains("open"));
  }
}

if (hamburger && navCenter) {
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMobileMenu();
  });

  navCenter.querySelectorAll("a, .sticky-submenu button").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 720) toggleMobileMenu(true);
    });
  });

  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 720 && navCenter.classList.contains("open")) {
      if (!navCenter.contains(e.target) && !hamburger.contains(e.target)) {
        toggleMobileMenu(true);
      }
    }
  });
}

// =====================================================
// 9. 3D project sliders
// =====================================================
function buildPolygonNav(state) {
  const { polygonNav, projects, activeIndex } = state;
  if (!polygonNav || !projects.length) return;

  const totalSlides = projects.length;
  const size = 70;
  const center = size / 2;
  const polyRadius = 24;
  const vertices = [];

  for (let i = 0; i < totalSlides; i++) {
    const angle = (i * 2 * Math.PI) / totalSlides - Math.PI / 2;
    const x = center + polyRadius * Math.cos(angle);
    const y = center + polyRadius * Math.sin(angle);
    vertices.push({ x: x.toFixed(2), y: y.toFixed(2) });
  }

  let svgHtml = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow: visible;">`;
  for (let i = 0; i < totalSlides; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % totalSlides];
    svgHtml += `<line class="nav-edge${i === activeIndex ? " active" : ""}" data-index="${i}" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" />`;
  }
  svgHtml += `</svg>`;
  polygonNav.innerHTML = svgHtml;

  polygonNav.querySelectorAll(".nav-edge").forEach((edge) => {
    edge.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetIdx = parseInt(edge.getAttribute("data-index"), 10);
      rotateSliderTo(state, targetIdx);
    });
  });
}

function setSliderInfo(state) {
  const { projects, activeIndex, projectInfo } = state;
  if (!projectInfo || !projects.length) return;

  if (state.infoTimer) clearTimeout(state.infoTimer);

  projectInfo.classList.add("changing");
  state.infoTimer = window.setTimeout(() => {
    const p = projects[activeIndex];
    projectInfo.querySelector(".project-year").textContent = p.year;
    projectInfo.querySelector(".project-title").textContent = p.title;
    projectInfo.querySelector(".project-desc").textContent = p.desc;
    projectInfo.classList.remove("changing");
  }, 220);
}

function renderSlider(state) {
  const { carousel, radius, currentRotation } = state;
  if (!carousel) return;
  carousel.style.transform = `translateZ(-${radius}px) rotateY(${currentRotation}deg)`;
}

// Modal handling
function openProjectModal(project) {
  if (!modal || !project) return;
  currentModalProject = project;
  currentModalMediaIndex = 0;

  modalYear.textContent = project.year || "";
  modalTitle.textContent = project.title || "";
  modalDesc.textContent = project.desc || "";
  modalThumbnails.innerHTML = "";
  modalMainMedia.innerHTML = "";

  project.media.forEach((item, idx) => {
    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "thumb-wrapper";
    if (idx === 0) thumbWrapper.classList.add("active");

    const el = document.createElement(item.type === "video" ? "video" : "img");
    el.src = item.src;
    if (item.type === "video") {
      el.muted = true;
      el.playsInline = true;
    } else {
      el.loading = "lazy";
      el.alt = project.title || "Project media";
    }
    thumbWrapper.appendChild(el);

    thumbWrapper.addEventListener("click", () => {
      currentModalMediaIndex = idx;
      updateModalActiveThumbnail();
      setMainMedia(item, project.title || "");
      updateModalCounter();
    });

    modalThumbnails.appendChild(thumbWrapper);
  });

  setMainMedia(project.media[0], project.title || "");
  updateModalCounter();
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function navigateModal(direction) {
  if (!currentModalProject) return;
  const total = currentModalProject.media.length;
  if (total <= 1) return;

  currentModalMediaIndex = (currentModalMediaIndex + direction + total) % total;

  const item = currentModalProject.media[currentModalMediaIndex];
  setMainMedia(item, currentModalProject.title || "");
  updateModalActiveThumbnail();
  updateModalCounter();

  const activeThumb = modalThumbnails?.children[currentModalMediaIndex];
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}

function updateModalActiveThumbnail() {
  if (!modalThumbnails) return;
  Array.from(modalThumbnails.children).forEach((child, i) => {
    child.classList.toggle("active", i === currentModalMediaIndex);
  });
}

function updateModalCounter() {
  const counter = document.getElementById("modalCounter");
  if (!counter || !currentModalProject) return;
  const total = currentModalProject.media.length;
  counter.textContent = total > 1 ? `${currentModalMediaIndex + 1} / ${total}` : "";
}

const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");
if (modalPrev) modalPrev.addEventListener("click", () => navigateModal(-1));
if (modalNext) modalNext.addEventListener("click", () => navigateModal(1));

document.addEventListener("keydown", (e) => {
  if (!modal || !modal.classList.contains("open")) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    navigateModal(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    navigateModal(1);
  } else if (e.key === "Escape") {
    closeModal();
  }
});

if (modalMainMedia) {
  let touchStartX = 0;
  let touchEndX = 0;

  modalMainMedia.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  modalMainMedia.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 60) {
      navigateModal(diff > 0 ? 1 : -1);
    }
  });
}

function setMainMedia(item, altText) {
  if (!item) return;
  modalMainMedia.innerHTML = "";

  const mainEl = document.createElement(item.type === "video" ? "video" : "img");
  mainEl.src = item.src;
  if (item.type === "video") {
    mainEl.controls = true;
    mainEl.autoplay = true;
    mainEl.muted = true;
    mainEl.loop = true;
    mainEl.playsInline = true;
  } else {
    mainEl.loading = "eager";
    mainEl.alt = altText;
  }
  modalMainMedia.appendChild(mainEl);
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modalMainMedia.innerHTML = "";
  modalThumbnails.innerHTML = "";
  currentModalProject = null;
}

function rotateSliderTo(state, targetIdx) {
  const totalSlides = state.projects.length;
  let diff = targetIdx - state.activeIndex;
  if (diff > totalSlides / 2) diff -= totalSlides;
  if (diff < -totalSlides / 2) diff += totalSlides;

  state.currentRotation -= diff * state.theta;
  state.activeIndex = targetIdx;

  buildPolygonNav(state);
  setSliderInfo(state);
  renderSlider(state);
}

function autoRotateDemo(state) {
  if (state.autoPlayed) return;
  state.autoPlayed = true;

  const targetAngle = -20; 
  const duration = 800;  
  const startRotation = state.currentRotation;
  let demoPhase = 0;      
  let startTime = null;

  function animate(now) {
    if (!state.demoAnimationId) return; 
    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    let progress = Math.min(elapsed / duration, 1);
    
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    if (demoPhase === 0) {
      state.currentRotation = startRotation + targetAngle * ease;
      if (progress >= 1) {
        demoPhase = 1;
        startTime = now;
      }
    } else {
      state.currentRotation = (startRotation + targetAngle) - targetAngle * ease;
      if (progress >= 1) {
        state.currentRotation = startRotation;
        renderSlider(state);
        state.demoAnimationId = null;
        return;
      }
    }
    renderSlider(state);
    state.demoAnimationId = requestAnimationFrame(animate);
  }

  state.demoAnimationId = requestAnimationFrame(animate);
}

// -- Initialise a single slider --
function initSlider(root) {
  const key = root.dataset.slider;
  const projects = projectData[key] || [];

  const carousel = root.querySelector(".carousel");
  const sliderContainer = root.querySelector(".slider-container");
  const projectInfo = root.querySelector(".project-info");
  const polygonNav = root.querySelector(".polygon-nav");
  const prevBtn = root.querySelector(".prev-btn");
  const nextBtn = root.querySelector(".next-btn");

  if (!carousel || !sliderContainer || !projectInfo || !polygonNav || !projects.length) return;

  const state = {
    root, projects, carousel, sliderContainer, projectInfo, polygonNav, prevBtn, nextBtn,
    activeIndex: 0,
    currentRotation: 0,
    radius: 0,
    theta: 360 / projects.length,
    isDragging: false,
    startX: 0,
    startY: 0,
    dragDeltaX: 0,
    isScrollingVertically: false,
    clickedIdx: -1,
    infoTimer: null,
    blockNextClick: false,
    autoPlayed: false,
    demoAnimationId: null
  };

  sliderStates.set(root, state);
  carousel.innerHTML = "";
  const containerWidth = sliderContainer.offsetWidth;
  state.radius = (containerWidth / 2) / Math.tan(Math.PI / projects.length);

  projects.forEach((project, idx) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    const angle = idx * state.theta;
    slide.style.transform = `rotateY(${angle}deg) translateZ(${state.radius}px)`;

    const coverMedia = project.media[0];
    const mediaEl = document.createElement(coverMedia.type === "video" ? "video" : "img");
    mediaEl.src = coverMedia.src;
    if (coverMedia.type === "video") {
      mediaEl.muted = true;
      mediaEl.loop = true;
      mediaEl.autoplay = true;
      mediaEl.playsInline = true;
    } else {
      mediaEl.loading = idx === 0 ? "eager" : "lazy";
      mediaEl.alt = project.title || "Project cover";
    }
    slide.appendChild(mediaEl);
    carousel.appendChild(slide);
  });

  buildPolygonNav(state);
  setSliderInfo(state);

  carousel.style.transition = 'none';
  renderSlider(state);
  carousel.offsetHeight; 
  carousel.style.transition = '';

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    state.currentRotation -= state.theta;
    state.activeIndex = (state.activeIndex - 1 + projects.length) % projects.length;
    buildPolygonNav(state);
    setSliderInfo(state);
    renderSlider(state);
  });

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    state.currentRotation += state.theta;
    state.activeIndex = (state.activeIndex + 1) % projects.length;
    buildPolygonNav(state);
    setSliderInfo(state);
    renderSlider(state);
  });

  sliderContainer.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".nav-btn")) return;

    if (state.demoAnimationId) {
      cancelAnimationFrame(state.demoAnimationId);
      state.demoAnimationId = null;
      state.currentRotation = state.activeIndex * state.theta;
      renderSlider(state);
    }

    state.isDragging = true;
    state.isScrollingVertically = false;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.dragDeltaX = 0;
    carousel.classList.add("dragging");

    const clickedSlide = e.target.closest(".slide");
    state.clickedIdx = clickedSlide
      ? Array.from(carousel.querySelectorAll(".slide")).indexOf(clickedSlide)
      : -1;

    try { sliderContainer.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });

  sliderContainer.addEventListener("pointermove", (e) => {
    if (!state.isDragging) return;

    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;

    if (!state.isScrollingVertically && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 6) {
      state.isScrollingVertically = true;
      state.isDragging = false;
      carousel.classList.remove("dragging");
      renderSlider(state);
      return;
    }
    
    if (state.isScrollingVertically) return;
    
    if (e.cancelable) e.preventDefault();

    state.dragDeltaX = deltaX;
    const moveRotation = (state.dragDeltaX / sliderContainer.offsetWidth) * state.theta;
    carousel.style.transform = `translateZ(-${state.radius}px) rotateY(${state.currentRotation + moveRotation}deg)`;
  });

  const finishPointer = (e) => {
    if (state.isScrollingVertically) {
      state.isScrollingVertically = false;
      return;
    }
    if (!state.isDragging) return;

    state.isDragging = false;
    carousel.classList.remove("dragging");

    if (Math.abs(state.dragDeltaX) < 7) {
      state.blockNextClick = true;
      setTimeout(() => { state.blockNextClick = false; }, 100);
      if (state.clickedIdx !== undefined && state.clickedIdx !== -1 && state.clickedIdx !== state.activeIndex) {
        rotateSliderTo(state, state.clickedIdx);
      } else {
        openProjectModal(projects[state.activeIndex]);
      }
      renderSlider(state);
      return;
    }

    if (state.dragDeltaX > 50) {
      state.currentRotation += state.theta;
      state.activeIndex = (state.activeIndex - 1 + projects.length) % projects.length;
    } else if (state.dragDeltaX < -50) {
      state.currentRotation -= state.theta;
      state.activeIndex = (state.activeIndex + 1) % projects.length;
    }

    buildPolygonNav(state);
    setSliderInfo(state);
    renderSlider(state);
  };

  sliderContainer.addEventListener("pointerup", finishPointer);
  sliderContainer.addEventListener("pointercancel", finishPointer);

  state.rebuild = () => {
    const width = sliderContainer.offsetWidth;
    state.radius = (width / 2) / Math.tan(Math.PI / projects.length);

    carousel.innerHTML = "";
    projects.forEach((project, idx) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      const angle = idx * state.theta;
      slide.style.transform = `rotateY(${angle}deg) translateZ(${state.radius}px)`;

      const coverMedia = project.media[0];
      const mediaEl = document.createElement(coverMedia.type === "video" ? "video" : "img");
      mediaEl.src = coverMedia.src;
      if (coverMedia.type === "video") {
        mediaEl.muted = true;
        mediaEl.loop = true;
        mediaEl.autoplay = true;
        mediaEl.playsInline = true;
      } else {
        mediaEl.loading = idx === 0 ? "eager" : "lazy";
        mediaEl.alt = project.title || "Project cover";
      }
      slide.appendChild(mediaEl);
      carousel.appendChild(slide);
    });

    buildPolygonNav(state);
    carousel.style.transition = 'none';
    renderSlider(state);
    carousel.offsetHeight; 
    carousel.style.transition = '';
  };

  if (root.dataset.autoDemo === "true") {
    root.dataset.autoDemo = "";
    autoRotateDemo(state);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".stroke").forEach(path => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
  });

  await projectDataReady;

  const sliderObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        initSlider(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "400px 0px" });

  document.querySelectorAll(".project-slider").forEach(slider => sliderObserver.observe(slider));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const section = entry.target;
        const slider = section.querySelector(".project-slider");
        if (slider) {
          const state = sliderStates.get(slider);
          if (state) {
            state.autoPlayed = false;
            autoRotateDemo(state);
          } else {
            slider.dataset.autoDemo = "true";
          }
        }
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll(".work-section").forEach(section => {
    sectionObserver.observe(section);
  });

  handleScroll(); 
});

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    sliderStates.forEach(state => {
      if (typeof state.rebuild === "function") state.rebuild();
    });

    if (window.innerWidth > 720 && navCenter && navCenter.classList.contains("open")) {
      toggleMobileMenu(true);
    }
  }, 250);
});

// =====================================================
// 10. Modal events (close, thumbnail drag)
// =====================================================
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeModal);
}
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}
if (modalThumbnails) {
  modalThumbnails.addEventListener("mousedown", (e) => {
    isDownThumb = true;
    startXThumb = e.pageX - modalThumbnails.offsetLeft;
    scrollLeftThumb = modalThumbnails.scrollLeft;
  });
  modalThumbnails.addEventListener("mouseleave", () => { isDownThumb = false; });
  modalThumbnails.addEventListener("mouseup", () => { isDownThumb = false; });
  modalThumbnails.addEventListener("mousemove", (e) => {
    if (!isDownThumb) return;
    e.preventDefault();
    const x = e.pageX - modalThumbnails.offsetLeft;
    const walk = (x - startXThumb) * 2;
    modalThumbnails.scrollLeft = scrollLeftThumb - walk;
  });
}

// =====================================================
// 11. Global keyboard shortcuts
// =====================================================
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeStickyMenus();
    toggleMobileMenu(true);
    closeAllFaces();
    closeModal();
  }
});