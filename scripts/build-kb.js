/**
 * Build a lightweight in-app knowledge base (KB) from markdown docs.
 * Produces lib/kb.json with chunks for simple on-device retrieval.
 *
 * Usage:
 *   node scripts/build-kb.js
 *
 * Then import in the app:
 *   import KB from "../lib/kb.json";
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, "docs");
const EXTRA_FILES = [
  path.join(ROOT, "README.md"),
  path.join(ROOT, "SOLUTION.md"),
  path.join(ROOT, "EAS_BUILD_INSTRUCTIONS.md"),
  path.join(ROOT, "TESTING_GUIDE.md"),
  path.join(ROOT, "QUICK_DEBUG.md"),
];
const OUT_PATH = path.join(ROOT, "lib", "kb.json");

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...listMarkdownFiles(p));
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
      files.push(p);
    }
  }
  return files;
}

function normalize(text) {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .trim();
}

function chunkMarkdown(filePath, content) {
  const lines = content.split("\n");
  const chunks = [];
  let current = [];
  let currentTitle = path.basename(filePath);

  const flush = () => {
    if (current.length) {
      const text = normalize(current.join("\n"));
      if (text.length > 0) {
        // Further split long text into ~1200 char soft chunks
        const soft = [];
        let start = 0;
        while (start < text.length) {
          soft.push(text.slice(start, start + 1200));
          start += 1200;
        }
        for (const s of soft) {
          chunks.push({
            source: path.relative(ROOT, filePath),
            title: currentTitle,
            text: s,
          });
        }
      }
    }
    current = [];
  };

  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.*)/);
    if (h) {
      flush();
      currentTitle = h[1].trim();
    }
    current.push(line);
  }
  flush();
  return chunks;
}

function build() {
  const sources = [...listMarkdownFiles(DOCS_DIR), ...EXTRA_FILES].filter((p) =>
    fs.existsSync(p)
  );
  const allChunks = [];
  for (const file of sources) {
    const content = fs.readFileSync(file, "utf8");
    const chunks = chunkMarkdown(file, content);
    allChunks.push(...chunks);
  }
  const kb = {
    builtAt: new Date().toISOString(),
    chunkCount: allChunks.length,
    chunks: allChunks,
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(kb, null, 2), "utf8");
  console.log(
    `KB generated: ${path.relative(ROOT, OUT_PATH)} (${kb.chunkCount} chunks)`
  );
}

build();


