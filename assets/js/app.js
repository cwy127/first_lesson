const BATCH_SIZE = 24;
const FALLBACK_IMAGES = {
  thumbWebp: "assets/images/thumb/placeholder-thumb.webp",
  gridWebp: "assets/images/grid/placeholder-grid.webp",
  fullJpg: "assets/images/full/placeholder-full.jpg",
};

const els = {
  siteName: document.querySelector("[data-site-name]"),
  siteNameInline: document.querySelector("[data-site-name-inline]"),
  siteTagline: document.querySelector("[data-site-tagline]"),
  siteLocation: document.querySelector("[data-site-location]"),
  siteLocationInline: document.querySelector("[data-site-location-inline]"),
  siteLocationSecondary: document.querySelector("[data-site-location-secondary]"),
  contactEmail: document.querySelector("[data-contact-email]"),
  contactInstagram: document.querySelector("[data-contact-instagram]"),
  filterList: document.querySelector("[data-filter-list]"),
  galleryGrid: document.querySelector("[data-gallery-grid]"),
  loadMore: document.querySelector("[data-load-more]"),
  toast: document.querySelector("[data-toast]"),
  lightbox: document.querySelector("[data-lightbox]"),
  lightboxClose: document.querySelector("[data-lightbox-close]"),
  lightboxPrev: document.querySelector("[data-lightbox-prev]"),
  lightboxNext: document.querySelector("[data-lightbox-next]"),
  lightboxWebp: document.querySelector("[data-lightbox-webp]"),
  lightboxImage: document.querySelector("[data-lightbox-image]"),
  lightboxTitle: document.querySelector("[data-lightbox-title]"),
  lightboxMeta: document.querySelector("[data-lightbox-meta]"),
};

const state = {
  site: null,
  photos: [],
  categories: [],
  activeCategory: "all",
  visibleCount: BATCH_SIZE,
  lightboxIndex: -1,
  previousFocus: null,
  toastShown: false,
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value) {
  return String(value || "")
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function normalizePhoto(raw, index) {
  const category = slugify(raw.category) || "uncategorized";
  const slugBase = slugify(raw.id || raw.title || `photo-${index + 1}`);
  const id = slugBase.startsWith(`${category}-`) ? slugBase : `${category}-${slugBase}`;
  const title = raw.title || titleCase(slugBase);
  const alt = raw.alt || title;
  const width = Number(raw.width) || 1600;
  const height = Number(raw.height) || 1200;
  const assets = {
    thumbWebp: raw.assets?.thumbWebp || FALLBACK_IMAGES.thumbWebp,
    gridWebp: raw.assets?.gridWebp || raw.assets?.thumbWebp || FALLBACK_IMAGES.gridWebp,
    fullJpg: raw.assets?.fullJpg || raw.assets?.gridWebp || FALLBACK_IMAGES.fullJpg,
  };

  return {
    id,
    title,
    category,
    alt,
    width,
    height,
    assets,
  };
}

function applySiteConfig(site) {
  const name = site.name || "Chung Woo Young";
  const location = site.location || "Seoul, South Korea";
  const tagline = site.tagline || "Visual stories crafted through light, texture, and precise framing.";
  const email = site.email || "hello@chungwooyoung.com";
  const instagram = site.instagram || "https://instagram.com/chungwooyoung";

  if (els.siteName) els.siteName.textContent = name;
  if (els.siteNameInline) els.siteNameInline.textContent = name;
  if (els.siteLocation) els.siteLocation.textContent = location;
  if (els.siteLocationInline) els.siteLocationInline.textContent = location;
  if (els.siteLocationSecondary) els.siteLocationSecondary.textContent = location;
  if (els.siteTagline) els.siteTagline.textContent = tagline;

  if (els.contactEmail) {
    els.contactEmail.textContent = email;
    els.contactEmail.href = `mailto:${email}`;
  }

  if (els.contactInstagram) {
    const handle = instagram.includes("instagram.com/")
      ? `@${instagram.split("instagram.com/")[1].replace(/\/+$/, "")}`
      : instagram;
    els.contactInstagram.href = instagram;
    els.contactInstagram.textContent = handle;
  }
}

function getFilteredPhotos() {
  if (state.activeCategory === "all") return state.photos;
  return state.photos.filter((photo) => photo.category === state.activeCategory);
}

function categoryLabel(category) {
  if (category === "all") return "All";
  return category.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function syncQuery() {
  const url = new URL(window.location.href);
  if (state.activeCategory === "all") {
    url.searchParams.delete("category");
  } else {
    url.searchParams.set("category", state.activeCategory);
  }
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function syncHash(photoId) {
  const url = new URL(window.location.href);
  url.hash = photoId ? `photo=${photoId}` : "";
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function enforceCanonicalHost() {
  const { hostname, pathname, search, hash } = window.location;
  if (hostname !== "chungwooyoung.com") return;
  window.location.replace(`https://www.chungwooyoung.com${pathname}${search}${hash}`);
}

function renderFilters() {
  if (!els.filterList) return;
  els.filterList.textContent = "";

  const categories = ["all", ...state.categories];
  const fragment = document.createDocumentFragment();

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(category === state.activeCategory));
    button.dataset.category = category;
    button.textContent = categoryLabel(category);

    button.addEventListener("click", () => {
      if (state.activeCategory === category) return;
      state.activeCategory = category;
      state.visibleCount = BATCH_SIZE;
      syncQuery();
      closeLightbox();
      renderFilters();
      renderGallery();
    });

    fragment.appendChild(button);
  });

  els.filterList.appendChild(fragment);
}

function showToast(message) {
  if (!els.toast || state.toastShown) return;
  state.toastShown = true;
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2000);
}

function createPhotoCard(photo, index) {
  const figure = document.createElement("button");
  figure.type = "button";
  figure.className = "photo-card";
  figure.dataset.id = photo.id;
  figure.style.setProperty("--delay-step", String(index % BATCH_SIZE));

  const title = photo.title;
  const category = categoryLabel(photo.category);

  figure.innerHTML = `
    <picture>
      <source type="image/webp" srcset="${photo.assets.thumbWebp} 640w, ${photo.assets.gridWebp} 1600w" sizes="(min-width: 1024px) 33vw, (min-width: 700px) 50vw, 100vw" />
      <img
        src="${photo.assets.gridWebp}"
        alt="${photo.alt}"
        width="${photo.width}"
        height="${photo.height}"
        loading="lazy"
        decoding="async"
      />
    </picture>
    <figcaption>
      <span class="photo-card-title">${title}</span>
      <span class="photo-card-meta">${category}</span>
    </figcaption>
  `;

  const image = figure.querySelector("img");
  image.addEventListener("error", () => {
    image.src = FALLBACK_IMAGES.fullJpg;
    showToast("Some images are missing. Showing fallback placeholders.");
  });

  figure.addEventListener("click", () => openLightboxById(photo.id));
  return figure;
}

function renderGallery() {
  if (!els.galleryGrid) return;

  const filtered = getFilteredPhotos();
  const visible = filtered.slice(0, state.visibleCount);

  els.galleryGrid.textContent = "";

  if (!visible.length) {
    const message = document.createElement("p");
    message.textContent = "No images available in this category yet.";
    message.className = "hero-copy";
    els.galleryGrid.appendChild(message);
  } else {
    const fragment = document.createDocumentFragment();
    visible.forEach((photo, index) => fragment.appendChild(createPhotoCard(photo, index)));
    els.galleryGrid.appendChild(fragment);
  }

  if (els.loadMore) {
    const remaining = filtered.length - visible.length;
    els.loadMore.hidden = remaining <= 0;
    if (remaining > 0) {
      els.loadMore.textContent = `Load more (${Math.min(BATCH_SIZE, remaining)})`;
    }
  }
}

function findPhotoIndexById(photoId) {
  if (!photoId) return -1;
  const filtered = getFilteredPhotos();
  return filtered.findIndex((photo) => photo.id === photoId);
}

function setLightboxPhoto(photo) {
  if (!photo) return;
  if (els.lightboxWebp) {
    els.lightboxWebp.srcset = `${photo.assets.gridWebp} 1600w`;
  }
  if (els.lightboxImage) {
    els.lightboxImage.src = photo.assets.fullJpg;
    els.lightboxImage.alt = photo.alt;
    els.lightboxImage.width = photo.width;
    els.lightboxImage.height = photo.height;
    els.lightboxImage.onerror = () => {
      els.lightboxImage.src = FALLBACK_IMAGES.fullJpg;
      showToast("Image not found. Using fallback placeholder.");
    };
  }

  if (els.lightboxTitle) {
    els.lightboxTitle.textContent = photo.title;
  }
  if (els.lightboxMeta) {
    els.lightboxMeta.textContent = categoryLabel(photo.category);
  }
}

function getLightboxPhotos() {
  return getFilteredPhotos();
}

function openLightbox(index) {
  const photos = getLightboxPhotos();
  if (!photos.length || index < 0 || index >= photos.length) return;

  state.lightboxIndex = index;
  const photo = photos[state.lightboxIndex];
  setLightboxPhoto(photo);

  state.previousFocus = document.activeElement;
  if (els.lightbox) {
    els.lightbox.hidden = false;
  }
  syncHash(photo.id);
  document.body.style.overflow = "hidden";

  if (els.lightboxClose) {
    els.lightboxClose.focus({ preventScroll: true });
  }
}

function openLightboxById(photoId) {
  const idx = findPhotoIndexById(photoId);
  if (idx === -1) return;

  const filteredLength = getFilteredPhotos().length;
  if (state.visibleCount < filteredLength) {
    while (state.visibleCount < filteredLength) {
      state.visibleCount += BATCH_SIZE;
      if (findPhotoIndexById(photoId) < state.visibleCount) break;
    }
    renderGallery();
  }

  openLightbox(idx);
}

function closeLightbox() {
  if (!els.lightbox || els.lightbox.hidden) return;
  els.lightbox.hidden = true;
  state.lightboxIndex = -1;
  syncHash("");
  document.body.style.overflow = "";

  if (state.previousFocus instanceof HTMLElement) {
    state.previousFocus.focus({ preventScroll: true });
  }
}

function navigateLightbox(direction) {
  const photos = getLightboxPhotos();
  if (!photos.length || state.lightboxIndex < 0) return;

  const nextIndex = (state.lightboxIndex + direction + photos.length) % photos.length;
  state.lightboxIndex = nextIndex;
  const photo = photos[state.lightboxIndex];
  setLightboxPhoto(photo);
  syncHash(photo.id);
}

function parseIncomingState() {
  const url = new URL(window.location.href);
  const fromQuery = slugify(url.searchParams.get("category") || "");
  if (fromQuery) state.activeCategory = fromQuery;

  const hashMatch = /^#photo=([a-z0-9-]+)$/.exec(url.hash);
  return hashMatch ? hashMatch[1] : "";
}

function applyInitialState(photoFromHash) {
  const availableCategories = new Set(["all", ...state.categories]);
  if (!availableCategories.has(state.activeCategory)) {
    state.activeCategory = "all";
  }

  renderFilters();
  renderGallery();

  if (photoFromHash) {
    const idx = findPhotoIndexById(photoFromHash);
    if (idx > -1) {
      openLightbox(idx);
    }
  }
}

function trapFocus(event) {
  if (!els.lightbox || els.lightbox.hidden || event.key !== "Tab") return;

  const focusable = Array.from(
    els.lightbox.querySelectorAll(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )
  );

  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function bindEvents() {
  if (els.loadMore) {
    els.loadMore.addEventListener("click", () => {
      state.visibleCount += BATCH_SIZE;
      renderGallery();
    });
  }

  if (els.lightboxClose) {
    els.lightboxClose.addEventListener("click", closeLightbox);
  }

  if (els.lightboxPrev) {
    els.lightboxPrev.addEventListener("click", () => navigateLightbox(-1));
  }

  if (els.lightboxNext) {
    els.lightboxNext.addEventListener("click", () => navigateLightbox(1));
  }

  if (els.lightbox) {
    els.lightbox.addEventListener("click", (event) => {
      if (event.target === els.lightbox) {
        closeLightbox();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (els.lightbox?.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateLightbox(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateLightbox(1);
    }

    trapFocus(event);
  });

  window.addEventListener("hashchange", () => {
    const match = /^#photo=([a-z0-9-]+)$/.exec(window.location.hash);
    if (!match) {
      closeLightbox();
      return;
    }

    openLightboxById(match[1]);
  });
}

async function init() {
  try {
    enforceCanonicalHost();

    const [site, photosRaw] = await Promise.all([
      fetchJson("data/site.json"),
      fetchJson("data/photos.json"),
    ]);

    state.site = site;
    applySiteConfig(site);

    state.photos = (Array.isArray(photosRaw) ? photosRaw : []).map(normalizePhoto);
    state.categories = Array.from(new Set(state.photos.map((photo) => photo.category))).sort();

    const photoFromHash = parseIncomingState();
    bindEvents();
    applyInitialState(photoFromHash);
    syncQuery();
  } catch (error) {
    if (els.galleryGrid) {
      els.galleryGrid.innerHTML = `<p class="hero-copy">Unable to load gallery data. ${error.message}</p>`;
    }
  }
}

init();
