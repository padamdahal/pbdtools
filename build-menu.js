// Scans public/<folder>/index.html and writes public/menu.json.
// Each tool page can set its menu label and card text with:
//   <meta name="menu-title" content="Number to Nepali words">
//   <meta name="description" content="Short one-line description">
import fs from "node:fs";
import path from "node:path";

const root = "public";
const meta = (html, name) =>
  html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, "i"))?.[1];

const items = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, "index.html")))
  .filter((d) => {
    const html = fs.readFileSync(path.join(root, d.name, "index.html"), "utf8");
    // Pages like /privacy/ and /about/ opt out of the tools menu with this tag.
    return !/<meta\s+name=["']menu-hide["']\s+content=["']true["']/i.test(html);
  })
  .map((d) => {
    const html = fs.readFileSync(path.join(root, d.name, "index.html"), "utf8");
    return {
      title: meta(html, "menu-title") ?? html.match(/<title>(.*?)<\/title>/i)?.[1] ?? d.name,
      description: meta(html, "description") ?? "",
      path: `/${d.name}/`,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

fs.writeFileSync(path.join(root, "menu.json"), JSON.stringify(items, null, 2));
console.log(`menu.json: ${items.length} page(s)`);
