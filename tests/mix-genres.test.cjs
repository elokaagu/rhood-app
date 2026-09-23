const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

function loadExportedFunctions(relPath) {
  const abs = path.join(__dirname, "..", relPath);
  let src = fs.readFileSync(abs, "utf8");
  src = src.replace(/^import .+?;?\s*$/gm, "");
  const names = [];
  src = src.replace(/export const (\w+)/g, (_, name) => {
    names.push(name);
    return `const ${name}`;
  });
  src = src.replace(/export function (\w+)/g, (_, name) => {
    names.push(name);
    return `function ${name}`;
  });
  src += `\nmodule.exports = { ${names.join(", ")} };\n`;
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "require", src);
  fn(mod, mod.exports, require);
  return mod.exports;
}

const {
  GENRE_OTHER,
  MIN_MIX_GENRES,
  formatMixGenreLabel,
  parseMixGenresForForm,
  resolveMixGenres,
} = loadExportedFunctions("lib/mixGenres.js");

describe("mix genres", () => {
  it("requires only one genre", () => {
    assert.equal(MIN_MIX_GENRES, 1);
  });

  it("replaces Other with the typed custom genre", () => {
    assert.deepEqual(resolveMixGenres(["House", GENRE_OTHER], " Amapiano "), [
      "House",
      "Amapiano",
    ]);
  });

  it("drops empty Other values", () => {
    assert.deepEqual(resolveMixGenres(["House", GENRE_OTHER], "  "), ["House"]);
  });

  it("parses a stored custom genre back onto Other", () => {
    assert.deepEqual(parseMixGenresForForm("House, Amapiano"), {
      genres: ["House", GENRE_OTHER],
      customGenre: "Amapiano",
    });
  });

  it("hides Other when formatting mix genres for display", () => {
    assert.equal(formatMixGenreLabel("R&B,Other,Hip-Hop"), "R&B · Hip-Hop");
    assert.equal(formatMixGenreLabel("Other"), "");
  });
});
