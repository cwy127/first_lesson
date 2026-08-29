const FALLBACK_IMAGES = {
  thumbWebp: "assets/images/thumb/placeholder-thumb.webp",
  gridWebp: "assets/images/grid/placeholder-grid.webp",
  fullJpg: "assets/images/full/placeholder-full.jpg",
};

const PLACEHOLDER_ART = [
  "radial-gradient(ellipse at 54% 38%, #dba792 0 17%, transparent 18%), linear-gradient(125deg,#22211f 0 34%,#8a7468 35% 58%,#d7d0c5 59%)",
  "linear-gradient(72deg,transparent 0 36%,#e1b8a7 37% 46%,#242321 47% 62%,transparent 63%),linear-gradient(145deg,#ded8cf,#766d68 54%,#171716)",
  "radial-gradient(circle at 54% 52%,rgba(239,242,230,.92) 0 15%,rgba(69,94,82,.85) 16% 31%,transparent 32%),linear-gradient(120deg,#151b18,#8fa095 52%,#c8bda9)",
  "linear-gradient(155deg,transparent 0 38%,#d4a08f 39% 48%,#171716 49% 63%,transparent 64%),linear-gradient(42deg,#817d72,#e1d8cb 55%,#393733)",
  "radial-gradient(ellipse at 48% 40%,#edc1b0 0 18%,transparent 19%),linear-gradient(102deg,#18201f 0 28%,#9a7b70 29% 57%,#d9d2c7 58%)",
  "radial-gradient(ellipse at 51% 54%,#a92d23 0 16%,#d17a6c 17% 28%,transparent 29%),linear-gradient(138deg,#e4d9c9 0 49%,#40302b 50%)",
  "linear-gradient(110deg,transparent 0 30%,#d9a994 31% 42%,#242321 43% 63%,transparent 64%),linear-gradient(150deg,#ded8cf,#5e5954 55%,#171716)",
  "radial-gradient(circle at 47% 40%,#e8baa8 0 13%,transparent 14%),radial-gradient(ellipse at 49% 57%,#272220 0 21%,transparent 22%),linear-gradient(125deg,#c6b9ad,#47423e)",
  "linear-gradient(30deg,transparent 0 39%,#e5ded2 40% 54%,transparent 55%),radial-gradient(ellipse at 57% 39%,#ca9181 0 15%,transparent 16%),linear-gradient(130deg,#1e2524,#8d776f 53%,#d9d0c3)",
  "radial-gradient(circle at 58% 35%,#e7b8aa 0 7%,transparent 8%),radial-gradient(ellipse at 58% 49%,#ca897b 0 19%,transparent 20%),linear-gradient(134deg,#dbd2c7 0 38%,#755d55 39% 61%,#121211 62%)",
  "linear-gradient(18deg,transparent 0 41%,#b7b1a8 42% 58%,transparent 59%),radial-gradient(ellipse at 50% 40%,#d8a596 0 15%,transparent 16%),linear-gradient(132deg,#372d2a,#d5c6b8)",
  "radial-gradient(ellipse at 55% 42%,#d9aa99 0 17%,transparent 18%),linear-gradient(82deg,#181918 0 35%,#9d8479 36% 58%,#dbd4ca 59%)",
];

const els = {
  body: document.body,
  identity: document.querySelector("[data-identity]"),
  coverScene: document.querySelector("[data-cover-scene]"),
  openBook: document.querySelector("[data-open-book]"),
  bookView: document.querySelector("[data-book-view]"),
  book: document.querySelector("[data-book]"),
  pageLeft: document.querySelector("[data-page-left]"),
  pageRight: document.querySelector("[data-page-right]"),
  prev: document.querySelector("[data-book-prev]"),
  next: document.querySelector("[data-book-next]"),
  returnCover: document.querySelector("[data-return-cover]"),
  pageStatus: document.querySelector("[data-page-status]"),
  openInfo: document.querySelector("[data-open-info]"),
  infoPanel: document.querySelector("[data-info-panel]"),
  closeInfo: document.querySelector("[data-close-info]"),
  siteNames: document.querySelectorAll("[data-site-name], [data-site-name-main], [data-site-name-inline]"),
  siteLocation: document.querySelector("[data-site-location]"),
  contactEmail: document.querySelector("[data-contact-email]"),
  contactInstagram: document.querySelector("[data-contact-instagram]"),
  lightbox: document.querySelector("[data-lightbox]"),
  lightboxClose: document.querySelector("[data-lightbox-close]"),
  lightboxPrev: document.querySelector("[data-lightbox-prev]"),
  lightboxNext: document.querySelector("[data-lightbox-next]"),
  lightboxWebp: document.querySelector("[data-lightbox-webp]"),
  lightboxImage: document.querySelector("[data-lightbox-image]"),
  lightboxTitle: document.querySelector("[data-lightbox-title]"),
  lightboxMeta: document.querySelector("[data-lightbox-meta]"),
  toast: document.querySelector("[data-toast]"),
};

const state = {
  site: {},
  photos: [],
  spreadIndex: 0,
  spreadCount: 1,
  lightboxIndex: -1,
  animating: false,
  previousFocus: null,
  singlePage: window.matchMedia("(max-width: 760px)").matches,
};

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function titleCase(value) {
  return String(value || "").split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

function normalizePhoto(raw, index) {
  const category = slugify(raw.category) || "uncategorized";
  const id = slugify(raw.id || raw.title || `photo-${index + 1}`);
  return {
    id,
    title: raw.title || titleCase(id),
    category,
    alt: raw.alt || raw.title || `Photograph ${index + 1}`,
    width: Number(raw.width) || 1600,
    height: Number(raw.height) || 1200,
    assets: {
      thumbWebp: raw.assets?.thumbWebp || FALLBACK_IMAGES.thumbWebp,
      gridWebp: raw.assets?.gridWebp || FALLBACK_IMAGES.gridWebp,
      fullJpg: raw.assets?.fullJpg || FALLBACK_IMAGES.fullJpg,
    },
  };
}

function categoryLabel(category) {
  return String(category || "").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function applySite(site) {
  const name = site.name || "Chung Woo Young";
  const location = site.location || "Seoul, South Korea";
  const email = site.email || "hello@chungwooyoung.com";
  const instagram = site.instagram || "https://instagram.com/chungwooyoung";
  els.siteNames.forEach((node) => { node.textContent = name; });
  if (els.siteLocation) els.siteLocation.textContent = location;
  if (els.contactEmail) { els.contactEmail.textContent = email; els.contactEmail.href = `mailto:${email}`; }
  if (els.contactInstagram) {
    els.contactInstagram.href = instagram;
    els.contactInstagram.textContent = instagram.includes("instagram.com/") ? `@${instagram.split("instagram.com/")[1].replace(/\/+$/, "")}` : instagram;
  }
}

function pageCapacity() { return state.singlePage ? 4 : 8; }
function leafCapacity() { return 4; }

function isPlaceholder(photo) {
  return Object.values(photo.assets).some((path) => String(path).includes("placeholder"));
}

function createThumb(photo, absoluteIndex) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "thumb-card";
  button.dataset.photoIndex = String(absoluteIndex);
  button.setAttribute("aria-label", `Open ${photo.title}`);

  if (isPlaceholder(photo)) {
    const art = document.createElement("span");
    art.className = "thumb-art";
    art.style.background = PLACEHOLDER_ART[absoluteIndex % PLACEHOLDER_ART.length];
    art.setAttribute("aria-hidden", "true");
    button.appendChild(art);
  } else {
    const img = document.createElement("img");
    img.src = photo.assets.thumbWebp;
    img.alt = photo.alt;
    img.width = photo.width;
    img.height = photo.height;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      img.replaceWith(Object.assign(document.createElement("span"), { className: "thumb-art" }));
      button.querySelector(".thumb-art").style.background = PLACEHOLDER_ART[absoluteIndex % PLACEHOLDER_ART.length];
    });
    button.appendChild(img);
  }

  const label = document.createElement("span");
  label.className = "thumb-label";
  label.textContent = `${String(absoluteIndex + 1).padStart(2, "0")} · ${categoryLabel(photo.category)}`;
  button.appendChild(label);
  button.addEventListener("click", () => openLightbox(absoluteIndex));
  return button;
}

function renderLeaf(target, photos, startIndex, pageNumber) {
  target.textContent = "";
  target.dataset.pageNumber = String(pageNumber).padStart(2, "0");

  if (!photos.length) {
    const empty = document.createElement("div");
    empty.className = "page-empty";
    empty.textContent = "End of selection";
    target.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "thumb-grid";
  photos.forEach((photo, index) => grid.appendChild(createThumb(photo, startIndex + index)));
  target.appendChild(grid);
}

function renderSpread() {
  const capacity = pageCapacity();
  state.spreadCount = Math.max(1, Math.ceil(state.photos.length / capacity));
  state.spreadIndex = Math.min(state.spreadIndex, state.spreadCount - 1);
  const base = state.spreadIndex * capacity;

  if (state.singlePage) {
    renderLeaf(els.pageLeft, [], base, state.spreadIndex + 1);
    renderLeaf(els.pageRight, state.photos.slice(base, base + 4), base, state.spreadIndex + 1);
  } else {
    renderLeaf(els.pageLeft, state.photos.slice(base, base + 4), base, state.spreadIndex * 2 + 1);
    renderLeaf(els.pageRight, state.photos.slice(base + 4, base + 8), base + 4, state.spreadIndex * 2 + 2);
  }

  els.pageStatus.textContent = `${String(state.spreadIndex + 1).padStart(2, "0")} / ${String(state.spreadCount).padStart(2, "0")}`;
  els.prev.disabled = state.spreadIndex === 0;
  els.next.disabled = state.spreadIndex >= state.spreadCount - 1;
}

function openBook() {
  if (els.body.dataset.view !== "cover") return;
  els.body.dataset.view = "opening";
  window.setTimeout(() => {
    els.body.dataset.view = "book";
    els.bookView.setAttribute("aria-hidden", "false");
    renderSpread();
    els.next.focus({ preventScroll: true });
  }, 720);
}

function returnToCover() {
  if (state.animating) return;
  els.bookView.setAttribute("aria-hidden", "true");
  els.body.dataset.view = "cover";
  window.setTimeout(() => els.openBook.focus({ preventScroll: true }), 450);
}

function turnPages(direction) {
  if (state.animating) return;
  const nextIndex = state.spreadIndex + direction;
  if (nextIndex < 0 || nextIndex >= state.spreadCount) return;
  state.animating = true;
  els.book.classList.add(direction > 0 ? "turning-next" : "turning-prev");
  window.setTimeout(() => {
    state.spreadIndex = nextIndex;
    renderSpread();
  }, 350);
  window.setTimeout(() => {
    els.book.classList.remove("turning-next", "turning-prev");
    state.animating = false;
  }, 790);
}

function setLightboxPhoto(index) {
  const photo = state.photos[index];
  if (!photo) return;
  if (els.lightboxWebp) els.lightboxWebp.srcset = `${photo.assets.gridWebp} 1600w`;
  els.lightboxImage.src = isPlaceholder(photo) ? FALLBACK_IMAGES.fullJpg : photo.assets.fullJpg;
  els.lightboxImage.alt = photo.alt;
  els.lightboxImage.width = photo.width;
  els.lightboxImage.height = photo.height;
  els.lightboxTitle.textContent = photo.title;
  els.lightboxMeta.textContent = categoryLabel(photo.category);
}

function openLightbox(index) {
  if (index < 0 || index >= state.photos.length) return;
  state.previousFocus = document.activeElement;
  state.lightboxIndex = index;
  setLightboxPhoto(index);
  els.lightbox.hidden = false;
  els.lightboxClose.focus({ preventScroll: true });
}

function closeLightbox() {
  if (els.lightbox.hidden) return;
  els.lightbox.hidden = true;
  state.lightboxIndex = -1;
  if (state.previousFocus instanceof HTMLElement) state.previousFocus.focus({ preventScroll: true });
}

function navigateLightbox(direction) {
  if (state.lightboxIndex < 0 || !state.photos.length) return;
  state.lightboxIndex = (state.lightboxIndex + direction + state.photos.length) % state.photos.length;
  setLightboxPhoto(state.lightboxIndex);
}

function openInfo() {
  state.previousFocus = document.activeElement;
  els.infoPanel.hidden = false;
  els.closeInfo.focus({ preventScroll: true });
}

function closeInfo() {
  if (els.infoPanel.hidden) return;
  els.infoPanel.hidden = true;
  if (state.previousFocus instanceof HTMLElement) state.previousFocus.focus({ preventScroll: true });
}

function bindEvents() {
  els.openBook.addEventListener("click", openBook);
  els.prev.addEventListener("click", () => turnPages(-1));
  els.next.addEventListener("click", () => turnPages(1));
  els.returnCover.addEventListener("click", returnToCover);
  els.openInfo.addEventListener("click", openInfo);
  els.closeInfo.addEventListener("click", closeInfo);
  els.lightboxClose.addEventListener("click", closeLightbox);
  els.lightboxPrev.addEventListener("click", () => navigateLightbox(-1));
  els.lightboxNext.addEventListener("click", () => navigateLightbox(1));

  document.addEventListener("keydown", (event) => {
    if (!els.lightbox.hidden) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") navigateLightbox(-1);
      if (event.key === "ArrowRight") navigateLightbox(1);
      return;
    }
    if (!els.infoPanel.hidden) {
      if (event.key === "Escape") closeInfo();
      return;
    }
    if (els.body.dataset.view === "cover" && (event.key === "Enter" || event.key === " ")) return;
    if (els.body.dataset.view === "book") {
      if (event.key === "ArrowLeft") turnPages(-1);
      if (event.key === "ArrowRight") turnPages(1);
      if (event.key === "Home" || event.key === "Escape") returnToCover();
    }
  });

  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", (event) => {
    const absoluteStart = state.spreadIndex * pageCapacity();
    state.singlePage = event.matches;
    state.spreadIndex = Math.floor(absoluteStart / pageCapacity());
    renderSpread();
  });
}

function enforceCanonicalHost() {
  const { hostname, pathname, search, hash } = window.location;
  if (hostname === "chungwooyoung.com") window.location.replace(`https://www.chungwooyoung.com${pathname}${search}${hash}`);
}

async function init() {
  enforceCanonicalHost();
  bindEvents();
  try {
    const [site, rawPhotos] = await Promise.all([fetchJson("data/site.json"), fetchJson("data/photos.json")]);
    state.site = site;
    state.photos = rawPhotos.map(normalizePhoto);
    applySite(site);
    renderSpread();
  } catch (error) {
    console.error(error);
    els.toast.textContent = "Portfolio data could not be loaded.";
    els.toast.hidden = false;
  }
}

init();
