const grid = document.querySelector('[data-photo-grid]');
const loadingNote = document.querySelector('[data-loading-note]');
const lightbox = document.querySelector('[data-lightbox]');
const lightboxImage = document.querySelector('[data-lightbox-image]');
const lightboxCaption = document.querySelector('[data-lightbox-caption]');
const aboutPanel = document.querySelector('[data-about-panel]');

let photos = [];
let activeIndex = 0;

const fallbackSite = {
  name: 'Chung Woo Young',
  location: 'Seoul, South Korea',
  tagline: 'Visual stories crafted through light, texture, and precise framing.',
  email: 'hello@chungwooyoung.com'
};

function seededShuffle(items) {
  const copy = [...items];
  let seed = 127;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const target = Math.floor((seed / 233280) * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function orientation(photo) {
  if (photo.width > photo.height) return 'landscape';
  if (photo.height > photo.width) return 'portrait';
  return 'square';
}

function renderGallery(items) {
  grid.replaceChildren();
  const fragment = document.createDocumentFragment();

  items.forEach((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `photo-card is-${orientation(photo)}`;
    button.dataset.photoIndex = String(index);
    button.setAttribute('aria-label', `Open ${photo.title}`);

    const media = document.createElement('span');
    media.className = 'photo-media';

    const image = document.createElement('img');
    image.src = photo.assets.gridWebp;
    image.alt = photo.alt || photo.title;
    image.loading = index < 9 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.width = photo.width;
    image.height = photo.height;

    const number = document.createElement('span');
    number.className = 'photo-index';
    number.textContent = String(index + 1).padStart(2, '0');

    media.append(image);
    button.append(media, number);
    button.addEventListener('click', () => openLightbox(index));
    fragment.append(button);
  });

  grid.append(fragment);
  loadingNote.hidden = true;
}

function openLightbox(index) {
  activeIndex = (index + photos.length) % photos.length;
  const photo = photos[activeIndex];
  lightboxImage.src = photo.assets.fullJpg;
  lightboxImage.alt = photo.alt || photo.title;
  lightboxCaption.textContent = `${String(activeIndex + 1).padStart(2, '0')} — ${photo.title}`;
  if (!lightbox.open) lightbox.showModal();
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function applySite(site) {
  const info = { ...fallbackSite, ...site };
  document.querySelectorAll('[data-site-name]').forEach((node) => { node.textContent = info.name; });
  document.querySelector('[data-site-location]').textContent = info.location;
  document.querySelector('[data-site-tagline]').textContent = info.tagline;
  document.querySelectorAll('[data-email-link], [data-about-email]').forEach((link) => {
    link.href = `mailto:${info.email}`;
    if (link.hasAttribute('data-about-email')) link.textContent = info.email;
  });
}

async function initialise() {
  try {
    const [photoResponse, siteResponse] = await Promise.all([
      fetch('data/photos.json'),
      fetch('data/site.json')
    ]);
    if (!photoResponse.ok) throw new Error('Unable to load photographs');
    const sourcePhotos = await photoResponse.json();
    photos = seededShuffle(sourcePhotos);
    renderGallery(photos);
    if (siteResponse.ok) applySite(await siteResponse.json());
  } catch (error) {
    loadingNote.textContent = 'Photographs could not be loaded.';
    console.error(error);
  }
}

document.querySelector('[data-year]').textContent = new Date().getFullYear();
document.querySelector('[data-lightbox-close]').addEventListener('click', () => closeDialog(lightbox));
document.querySelector('[data-lightbox-prev]').addEventListener('click', () => openLightbox(activeIndex - 1));
document.querySelector('[data-lightbox-next]').addEventListener('click', () => openLightbox(activeIndex + 1));
document.querySelector('[data-about-open]').addEventListener('click', () => aboutPanel.showModal());
document.querySelector('[data-about-close]').addEventListener('click', () => closeDialog(aboutPanel));

[lightbox, aboutPanel].forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

document.addEventListener('keydown', (event) => {
  if (!lightbox.open) return;
  if (event.key === 'ArrowLeft') openLightbox(activeIndex - 1);
  if (event.key === 'ArrowRight') openLightbox(activeIndex + 1);
});

initialise();
