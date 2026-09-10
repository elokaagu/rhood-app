const fs = require("fs");
const path = require("path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

function loadExportedFunctions(relPath) {
  const abs = path.join(__dirname, "..", relPath);
  let src = fs.readFileSync(abs, "utf8");
  const names = [];
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

const { excludeUserIds, isDirectoryReadyDj } = loadExportedFunctions(
  "lib/accountUtils.js"
);
const { canonicalCityName, citiesShareSameCity } = loadExportedFunctions(
  "lib/cityMatch.js"
);
const { sanitizePublicProfile } = loadExportedFunctions("lib/publicProfile.js");

describe("excludeUserIds", () => {
  it("drops blocked profiles", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.deepEqual(excludeUserIds(rows, ["b"]), [{ id: "a" }, { id: "c" }]);
  });

  it("returns the original list when nothing is blocked", () => {
    const rows = [{ id: "a" }];
    assert.deepEqual(excludeUserIds(rows, []), rows);
  });
});

describe("isDirectoryReadyDj", () => {
  it("requires a real name and photo", () => {
    assert.equal(
      isDirectoryReadyDj({
        dj_name: "DJ Test",
        profile_image_url: "https://example.com/p.jpg",
      }),
      true
    );
    assert.equal(
      isDirectoryReadyDj({ dj_name: "DJ Test", profile_image_url: "" }),
      false
    );
  });
});

describe("cityMatch", () => {
  it("treats Hackney, London as London", () => {
    assert.equal(canonicalCityName("Hackney, London, United Kingdom"), "london");
    assert.equal(
      citiesShareSameCity("Hackney, London, United Kingdom", "London"),
      true
    );
  });
});

describe("sanitizePublicProfile", () => {
  it("strips email and phone unless the owner opted in", () => {
    const hidden = sanitizePublicProfile({
      id: "1",
      email: "hidden@example.com",
      phone: "123",
      show_email: false,
      show_phone: false,
    });
    assert.equal(hidden.email, null);
    assert.equal(hidden.phone, null);

    const shown = sanitizePublicProfile({
      id: "1",
      email: "shown@example.com",
      phone: "123",
      show_email: true,
      show_phone: true,
    });
    assert.equal(shown.email, "shown@example.com");
    assert.equal(shown.phone, "123");
  });
});
