const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

function loadExportedFunctions(relPath) {
  const abs = path.join(__dirname, "..", relPath);
  let src = fs.readFileSync(abs, "utf8");
  src = src.replace(/^import [\s\S]+? from .+?;?\s*$/gm, "");
  src = src.replace(/^import .+?;?\s*$/gm, "");
  const names = [];
  src = src.replace(/export const (\w+)/g, (_, name) => {
    names.push(name);
    return `const ${name}`;
  });
  src = src.replace(/export (async )?function (\w+)/g, (_, isAsync, name) => {
    names.push(name);
    return `${isAsync || ""}function ${name}`;
  });
  src += `\nmodule.exports = { ${names.join(", ")} };\n`;
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "require", src);
  fn(mod, mod.exports, require);
  return mod.exports;
}

const { isRemoteUri } = loadExportedFunctions("lib/uploadUtils.js");
const { buildProfileViewModel, formatRatingDisplay } = loadExportedFunctions(
  "lib/profileScreen/model.js"
);
const { onAppDataChanged, emitAppDataChanged } = loadExportedFunctions(
  "lib/appDataEvents.js"
);

describe("mix artwork upload guard", () => {
  it("treats existing online artwork as not a new upload", () => {
    assert.equal(
      isRemoteUri("https://x.supabase.co/storage/v1/object/public/mixes/a.png"),
      true
    );
  });

  it("allows local picks from the photo library", () => {
    assert.equal(isRemoteUri("file:///var/mobile/Containers/tmp/a.jpg"), false);
    assert.equal(isRemoteUri("ph://ABC-123"), false);
    assert.equal(isRemoteUri(undefined), false);
  });
});

describe("profile star rating", () => {
  const baseProfile = { id: "u1", dj_name: "Eloka", rating: "0.0", genres: [] };

  it("does not show the 0.0 column default as a rating", () => {
    assert.equal(formatRatingDisplay(baseProfile), null);
  });

  it("uses the average from the ratings table, like the portal", () => {
    const vm = buildProfileViewModel({
      userProfile: baseProfile,
      recentGigs: [],
      achievements: [],
      achievementsStats: { earnedCount: 0, totalCount: 0 },
      creditsValue: 0,
      primaryMix: null,
      ratingAverage: 4.5,
    });
    assert.equal(vm.ratingDisplay, "4.5");
  });

  it("prefers the database's combined rating over the ratings-table average", () => {
    const vm = buildProfileViewModel({
      userProfile: { ...baseProfile, rating: "4.0" },
      recentGigs: [],
      achievements: [],
      achievementsStats: { earnedCount: 0, totalCount: 0 },
      creditsValue: 0,
      primaryMix: null,
      ratingAverage: 5,
    });
    assert.equal(vm.ratingDisplay, "4.0");
  });
});

describe("profile gigs done", () => {
  const build = (gigs_completed, gigsCompletedOverride) =>
    buildProfileViewModel({
      userProfile: { id: "u1", dj_name: "Eloka", genres: [], gigs_completed },
      recentGigs: [],
      achievements: [],
      achievementsStats: { earnedCount: 0, totalCount: 0 },
      creditsValue: 0,
      primaryMix: null,
      gigsCompletedOverride,
    });

  it("counts completed gig records even when no application was completed", () => {
    assert.equal(build(3, 0).gigsCompleted, 3);
  });

  it("still counts completed applications when the stored count lags", () => {
    assert.equal(build(0, 2).gigsCompleted, 2);
  });
});

describe("app data change signals", () => {
  it("notifies listeners and stops after unsubscribe", () => {
    let calls = 0;
    const off = onAppDataChanged("mixes", () => {
      calls += 1;
    });
    emitAppDataChanged("mixes", { mix: { id: "m1" } });
    off();
    emitAppDataChanged("mixes", { mix: { id: "m1" } });
    assert.equal(calls, 1);
  });
});
