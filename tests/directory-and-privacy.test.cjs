const fs = require("fs");
const path = require("path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

function loadExportedFunctions(relPath) {
  const abs = path.join(__dirname, "..", relPath);
  let src = fs.readFileSync(abs, "utf8");
  src = src.replace(/^import .+?;?\s*$/gm, "");
  const names = [];
  src = src.replace(/export async function (\w+)/g, (_, name) => {
    names.push(name);
    return `async function ${name}`;
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

const { excludeUserIds, isDirectoryReadyDj } = loadExportedFunctions(
  "lib/accountUtils.js"
);
const { canonicalCityName, citiesShareSameCity } = loadExportedFunctions(
  "lib/cityMatch.js"
);
const { sanitizePublicProfile } = loadExportedFunctions("lib/publicProfile.js");
const {
  buildDirectBase,
  mapMediaToDirectRow,
  mapMediaToGroupRow,
} = loadExportedFunctions("lib/messagesScreen/sendMessagesOperations.js");
const { normalizeInviteCode } = loadExportedFunctions("lib/pendingInvite.js");

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
    assert.equal(
      isDirectoryReadyDj({
        dj_name: "DJ Test",
        profile_image_url: "https://example.com/p.jpg",
        membership_status: "pending",
      }),
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

  it("treats Barnet as London", () => {
    assert.equal(citiesShareSameCity("Barnet", "London"), true);
    assert.equal(
      citiesShareSameCity("Barnet, London, United Kingdom", "London"),
      true
    );
  });

  it("does not match Amsterdam to London", () => {
    assert.equal(citiesShareSameCity("Amsterdam", "London"), false);
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

describe("chat send payloads", () => {
  it("builds a direct text row with thread and sender", () => {
    assert.deepEqual(buildDirectBase("thread-1", "user-1"), {
      thread_id: "thread-1",
      sender_id: "user-1",
    });
  });

  it("maps media onto a direct message without dropping the file", () => {
    const row = mapMediaToDirectRow(buildDirectBase("t1", "u1"), {
      type: "image",
      url: "https://cdn.example/mix.jpg",
      filename: "mix.jpg",
      size: 12,
      mimeType: "image/jpeg",
      thumbnailUrl: null,
      extension: "jpg",
    });
    assert.equal(row.message_type, "image");
    assert.equal(row.media_url, "https://cdn.example/mix.jpg");
    assert.equal(row.thread_id, "t1");
    assert.equal(row.content, "");
  });

  it("maps group media onto community_posts shape", () => {
    const row = mapMediaToGroupRow("comm-1", "u1", {
      type: "audio",
      url: "https://cdn.example/a.m4a",
      filename: "a.m4a",
      size: 9,
      mimeType: "audio/mp4",
      duration: 1500,
    });
    assert.equal(row.community_id, "comm-1");
    assert.equal(row.author_id, "u1");
    assert.equal(row.metadata.duration_millis, 1500);
  });
});

describe("invite codes", () => {
  it("normalizes codes the same way Studio and the app share them", () => {
    assert.equal(normalizeInviteCode(" 8f758aca "), "8F758ACA");
    assert.equal(normalizeInviteCode("8F-758-ACA"), "8F758ACA");
  });
});

const {
  normalizeMembershipStatus,
  isMembershipApproved,
  isMembershipPending,
} = loadExportedFunctions("lib/membership.js");

describe("invite-only membership", () => {
  it("treats a missing status as approved so existing DJs stay in", () => {
    assert.equal(normalizeMembershipStatus(null), "approved");
    assert.equal(isMembershipApproved({}), true);
  });

  it("holds organic applicants until Studio approves", () => {
    assert.equal(isMembershipPending({ membership_status: "pending" }), true);
    assert.equal(isMembershipApproved({ membership_status: "pending" }), false);
  });
});
