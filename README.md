# first_lesson

Static photo portfolio for GitHub Pages.

## Stack
- Static `index.html` + `assets/css/styles.css` + `assets/js/app.js`
- Data-driven content with `data/site.json` and `data/photos.json`
- Local image pipeline with `scripts/prepare-images.mjs` (Sharp)

## Local Workflow
1. Install dependencies:
   ```bash
   npm install
   ```
2. Put source images in `source-images/` with this naming rule:
   ```
   <category>__<slug>.<ext>
   ```
   Example: `portrait__evening-window.jpg`
3. Generate optimized images and refresh `data/photos.json`:
   ```bash
   npm run prepare:images
   ```
4. Run a static local server and open the site:
   ```bash
   python3 -m http.server 8080
   ```

## Data Contracts
### `data/site.json`
Required keys: `name`, `location`, `tagline`, `email`, `instagram`

### `data/photos.json`
Required keys per item:
- `id`
- `title`
- `category`
- `alt`
- `width`
- `height`
- `assets.thumbWebp`
- `assets.gridWebp`
- `assets.fullJpg`

## GitHub Pages
- Repository: `cwy127/first_lesson`
- Source: `main` branch, `/root`
- Custom domain file: `CNAME` (`www.chungwooyoung.com`)

## DNS Runbook
- `www` record: `CNAME` -> `cwy127.github.io`
- Apex (`@`) records:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`

Then in GitHub Pages settings:
1. Set Custom domain to `www.chungwooyoung.com`
2. Enable `Enforce HTTPS`

## Notes
- Site canonical URL is `https://www.chungwooyoung.com/`
- Requests to `https://chungwooyoung.com` are redirected to the canonical `www` host in frontend logic.
