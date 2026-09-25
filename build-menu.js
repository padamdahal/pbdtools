// Scans public/ and writes:
//   public/menu.json   — tools nav + home cards
//   public/sitemap.xml — SEO sitemap (all indexable pages)
//   public/robots.txt  — points crawlers at the sitemap
//
// Tool pages set:
//   <meta name="menu-title" content="Number to Nepali words">
//   <meta name="description" content="Short one-line description">
// Non-tool pages (about, privacy) opt out of the menu with:
//   <meta name="menu-hide" content="true">
// Pages with robots noindex are omitted from the sitemap:
//   <meta name="robots" content="noindex, …">
//
// Set your live origin before deploy, e.g.:
//   SITE_URL=https://yourdomain.com npm run deploy
// or edit DEFAULT_SITE_URL below.

import fs from "node:fs";
import path from "node:path";

const root = "public";
const DEFAULT_SITE_URL = "https://nepalitools.pbd.com.np";
const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");

const meta = (html, name) =>
  html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, "i"))?.[1];

const isNoindex = (html) =>
  /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);

const isoDate = (filePath) => {
  try {
    return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const escapeXml = (s) =>
  String(s)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "'");

// --- collect pages ---
const dirs = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, "index.html")));

const toolItems = [];
const sitemapEntries = [];

// Home page
const homePath = path.join(root, "index.html");
if (fs.existsSync(homePath)) {
  const homeHtml = fs.readFileSync(homePath, "utf8");
  if (!isNoindex(homeHtml)) {
    sitemapEntries.push({
      loc: `${siteUrl}/`,
      lastmod: isoDate(homePath),
      changefreq: "daily",
      priority: "1.0",
    });
  }
}

for (const d of dirs) {
  const filePath = path.join(root, d.name, "index.html");
  const html = fs.readFileSync(filePath, "utf8");
  const pagePath = `/${d.name}/`;
  const hideFromMenu = /<meta\s+name=["']menu-hide["']\s+content=["']true["']/i.test(html);

  if (!hideFromMenu) {
    toolItems.push({
      title: meta(html, "menu-title") ?? html.match(/<title>(.*?)<\/title>/i)?.[1] ?? d.name,
      description: meta(html, "description") ?? "",
      path: pagePath,
    });
  }

  if (!isNoindex(html)) {
    // Tools rank higher than legal/info pages
    const priority = hideFromMenu ? "0.5" : "0.8";
    const changefreq = hideFromMenu ? "monthly" : "weekly";
    sitemapEntries.push({
      loc: `${siteUrl}${pagePath}`,
      lastmod: isoDate(filePath),
      changefreq,
      priority,
    });
  }
}

toolItems.sort((a, b) => a.title.localeCompare(b.title));
// Home first, then tools by path, then the rest
sitemapEntries.sort((a, b) => {
  if (a.loc === `${siteUrl}/`) return -1;
  if (b.loc === `${siteUrl}/`) return 1;
  return a.loc.localeCompare(b.loc);
});

// --- menu.json ---
fs.writeFileSync(path.join(root, "menu.json"), JSON.stringify(toolItems, null, 2) + "\n");
console.log(`menu.json: ${toolItems.length} tool(s)`);

// --- sitemap.xml ---
const urlNodes = sitemapEntries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>
`;

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
console.log(`sitemap.xml: ${sitemapEntries.length} URL(s) → ${siteUrl}`);

// --- robots.txt ---
const robots = `User-agent: *
Allow: /

# Privacy policy is noindex; keep crawlers off it
Disallow: /privacy/

Sitemap: ${siteUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(root, "robots.txt"), robots);
console.log(`robots.txt: Sitemap → ${siteUrl}/sitemap.xml`);
