#!/usr/bin/env node
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "source-images");
const THUMB_DIR = path.join(ROOT, "assets", "images", "thumb");
const GRID_DIR = path.join(ROOT, "assets", "images", "grid");
const FULL_DIR = path.join(ROOT, "assets", "images", "full");
const PHOTO_DATA_PATH = path.join(ROOT, "data", "photos.json");

const FILE_PATTERN = /^([a-z0-9-]+)__([a-z0-9-]+)\.(jpe?g|png|webp|tiff|avif)$/i;

function titleCase(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureDirectories() {
  await Promise.all([
    mkdir(SOURCE_DIR, { recursive: true }),
    mkdir(THUMB_DIR, { recursive: true }),
    mkdir(GRID_DIR, { recursive: true }),
    mkdir(FULL_DIR, { recursive: true }),
    mkdir(path.dirname(PHOTO_DATA_PATH), { recursive: true }),
  ]);
}

async function buildEntry(fileName) {
  const match = FILE_PATTERN.exec(fileName);
  if (!match) return null;

  const category = normalizeSlug(match[1]);
  const slug = normalizeSlug(match[2]);

  if (!category || !slug) {
    throw new Error(`Invalid file name: ${fileName}`);
  }

  const sourcePath = path.join(SOURCE_DIR, fileName);
  const id = `${category}-${slug}`;
  const title = titleCase(slug);

  const thumbPath = path.join(THUMB_DIR, `${id}.webp`);
  const gridPath = path.join(GRID_DIR, `${id}.webp`);
  const fullPath = path.join(FULL_DIR, `${id}.jpg`);

  const pipeline = sharp(sourcePath).rotate();

  await pipeline
    .clone()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(thumbPath);

  await pipeline
    .clone()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(gridPath);

  await pipeline
    .clone()
    .resize({ width: 2800, withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(fullPath);

  const metadata = await sharp(fullPath).metadata();

  return {
    id,
    title,
    category,
    alt: title,
    width: metadata.width || 1600,
    height: metadata.height || 1200,
    assets: {
      thumbWebp: path.posix.join("assets/images/thumb", `${id}.webp`),
      gridWebp: path.posix.join("assets/images/grid", `${id}.webp`),
      fullJpg: path.posix.join("assets/images/full", `${id}.jpg`),
    },
  };
}

async function main() {
  await ensureDirectories();

  const files = await readdir(SOURCE_DIR);
  const supported = files.filter((file) => FILE_PATTERN.test(file));

  if (supported.length === 0) {
    console.error("No source images found.");
    console.error("Use file names in the pattern <category>__<slug>.<ext>.");
    process.exitCode = 1;
    return;
  }

  const entries = [];
  for (const fileName of supported.sort()) {
    const entry = await buildEntry(fileName);
    if (entry) entries.push(entry);
  }

  await writeFile(PHOTO_DATA_PATH, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

  console.log(`Processed ${entries.length} images.`);
  console.log(`Updated ${path.relative(ROOT, PHOTO_DATA_PATH)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
