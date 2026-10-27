const fs = require("fs");
const path = require("path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

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
  OPPORTUNITY_GENRES,
  ALL_GENRES,
  canonicalGenre,
  canonicalGenreList,
  parseOpportunityGenres,
  genreMatchesQuery,
} = loadExportedFunctions("lib/opportunityGenres.js");

const {
  parseBriefDescription,
  parseInlineBold,
  briefRequirementsText,
  briefOtherDetailsText,
} = loadExportedFunctions("lib/opportunityBrief.js");

const { isLiveOpportunityRow } = loadExportedFunctions(
  "lib/opportunities/liveOpportunity.js"
);

describe("opportunity genres", () => {
  it("matches Studio's list", () => {
    assert.deepEqual(OPPORTUNITY_GENRES, [
      "House", "Tech House", "Deep House", "Techno", "Electronic", "R&B",
      "Hip-Hop", "Amapiano", "Afrobeats", "Garage", "Disco", "Funk",
      "Drum & Bass", "Dubstep", "Trap", "Progressive", "Trance", "Ambient",
      "Breakbeat",
    ]);
  });

  it("treats Hip Hop and Hip-Hop as one genre", () => {
    assert.equal(canonicalGenre("Hip Hop"), "Hip-Hop");
    assert.equal(canonicalGenre("hip-hop"), "Hip-Hop");
    assert.deepEqual(canonicalGenreList(["Hip Hop", "Hip-Hop", "Jungle"]), [
      "Hip-Hop",
      "Jungle",
    ]);
    assert.ok(genreMatchesQuery("Hip-Hop", "hip hop"));
    assert.ok(genreMatchesQuery("Hip Hop", "Hip-Hop"));
  });

  it("splits the comma-separated genre column", () => {
    assert.deepEqual(parseOpportunityGenres("Techno, Hip Hop, electronic"), [
      "Techno",
      "Hip-Hop",
      "Electronic",
    ]);
    assert.deepEqual(parseOpportunityGenres("All genres"), [ALL_GENRES]);
    assert.deepEqual(parseOpportunityGenres(""), []);
  });
});

describe("opportunity brief description", () => {
  it("styles headings on their own line and keeps line breaks", () => {
    const blocks = parseBriefDescription(
      "The opportunity\n\nA **video** for UE Pro.\nSecond line.\n\nWho it\u2019s for\n\nConfident DJs."
    );
    assert.deepEqual(blocks, [
      { type: "heading", text: "The opportunity" },
      { type: "text", text: "A **video** for UE Pro." },
      { type: "text", text: "Second line." },
      { type: "gap" },
      { type: "heading", text: "Who it's for" },
      { type: "text", text: "Confident DJs." },
    ]);
  });

  it("splits inline headings", () => {
    const blocks = parseBriefDescription(
      "What we want back: One reel.\n**Delivery confirmed when:** the post is live."
    );
    assert.deepEqual(blocks, [
      { type: "heading", text: "What we want back" },
      { type: "text", text: "One reel." },
      { type: "gap" },
      { type: "heading", text: "Delivery confirmed when" },
      { type: "text", text: "the post is live." },
    ]);
  });

  it("leaves text without headings alone", () => {
    assert.deepEqual(parseBriefDescription("Play this song and film it."), [
      { type: "text", text: "Play this song and film it." },
    ]);
  });

  it("renders **bold** without asterisks", () => {
    assert.deepEqual(parseInlineBold("A **Soundboks Gen 5**, yours."), [
      { text: "A ", bold: false },
      { text: "Soundboks Gen 5", bold: true },
      { text: ", yours.", bold: false },
    ]);
    assert.deepEqual(parseInlineBold("Odd ** marker"), [
      { text: "Odd ", bold: false },
      { text: " marker", bold: false },
    ]);
  });

  it("shows real requirements but hides legacy skill levels", () => {
    assert.equal(briefRequirementsText("Must be original song(s)"), "Must be original song(s)");
    assert.equal(briefRequirementsText("intermediate"), null);
    assert.equal(briefRequirementsText("  "), null);
    assert.equal(briefOtherDetailsText(" Apply by 1 Nov "), "Apply by 1 Nov");
    assert.equal(briefOtherDetailsText(null), null);
  });
});

describe("live opportunity rule", () => {
  const live = { listing_status: "active", is_active: true, is_archived: false };

  it("shows only active, published, unarchived listings", () => {
    assert.ok(isLiveOpportunityRow(live));
    assert.ok(isLiveOpportunityRow({ ...live, is_archived: null }));
  });

  it("hides draft, pending, closed, completed and archived listings", () => {
    for (const listing_status of ["draft", "pending", "closed", "completed"]) {
      assert.equal(isLiveOpportunityRow({ ...live, listing_status }), false, listing_status);
    }
    assert.equal(isLiveOpportunityRow({ ...live, is_active: false }), false);
    assert.equal(isLiveOpportunityRow({ ...live, is_archived: true }), false);
    assert.equal(isLiveOpportunityRow({ is_active: true }), false);
  });
});
