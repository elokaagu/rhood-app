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

const {
  sendIndividualChatMessages,
  buildDirectBase,
} = loadExportedFunctions("lib/messagesScreen/sendMessagesOperations.js");
const {
  validateBlockTarget,
  interpretBoostRpc,
  blockUserFlow,
  boostApplicationFlow,
  sendDirectMessageFlow,
  canAttemptSend,
} = loadExportedFunctions("lib/productFlows.js");
const {
  citiesShareSameCity,
} = loadExportedFunctions("lib/cityMatch.js");
const { buildChatListRows, formatDaySeparator } = loadExportedFunctions(
  "lib/messagesScreen/messageList.js"
);
const { getReferralLink, normalizeProfileForUI } = loadExportedFunctions(
  "lib/profileScreen/model.js"
);

function mockSupabase({ insertError = null, inserted = [] } = {}) {
  return {
    from() {
      return {
        async insert(row) {
          inserted.push(row);
          return { error: insertError };
        },
      };
    },
  };
}

describe("send-message flow", () => {
  it("refuses a send when the other DJ is blocked", async () => {
    const inserted = [];
    const result = await sendDirectMessageFlow({
      sendIndividualChatMessages,
      supabase: mockSupabase({ inserted }),
      db: { findOrCreateIndividualMessageThread: async () => "thread-1" },
      userId: "me",
      djId: "them",
      threadId: "thread-1",
      messageContent: "hey",
      mediaArray: [],
      canMessage: async () => {
        throw new Error("You can't message this person.");
      },
    });
    assert.equal(result.ok, false);
    assert.match(String(result.error.message), /can't message/i);
    assert.equal(inserted.length, 0);
  });

  it("inserts a direct text row on a happy-path send", async () => {
    const inserted = [];
    const result = await sendDirectMessageFlow({
      sendIndividualChatMessages,
      supabase: mockSupabase({ inserted }),
      db: { findOrCreateIndividualMessageThread: async () => "thread-1" },
      userId: "me",
      djId: "them",
      threadId: "thread-1",
      messageContent: "hey",
      mediaArray: [],
      canMessage: async () => {},
    });
    assert.equal(result.ok, true);
    assert.equal(inserted.length, 1);
    assert.deepEqual(inserted[0], {
      ...buildDirectBase("thread-1", "me"),
      content: "hey",
      message_type: "text",
    });
  });

  it("does not send when there is no text and no media", async () => {
    const result = await sendDirectMessageFlow({
      sendIndividualChatMessages,
      supabase: mockSupabase(),
      db: {},
      userId: "me",
      djId: "them",
      threadId: "thread-1",
      messageContent: "  ",
      mediaArray: [],
      canMessage: async () => {},
    });
    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
  });

  it("canAttemptSend matches the composer gate", () => {
    assert.equal(canAttemptSend({ sending: true, text: "hi", mediaCount: 0 }), false);
    assert.equal(canAttemptSend({ sending: false, text: "hi", mediaCount: 0 }), true);
    assert.equal(canAttemptSend({ sending: false, text: "", mediaCount: 1 }), true);
  });
});

describe("block flow", () => {
  it("rejects blocking yourself", () => {
    assert.throws(
      () => validateBlockTarget("user-1", "user-1"),
      /Unable to block/
    );
  });

  it("inserts a blocked_users row for another DJ", async () => {
    const rows = [];
    const result = await blockUserFlow({
      insertBlock: async (row) => {
        rows.push(row);
        return { error: null };
      },
      blockerId: "me",
      blockedId: "them",
    });
    assert.equal(result.ok, true);
    assert.deepEqual(rows[0], { blocker_id: "me", blocked_id: "them" });
  });

  it("treats a duplicate block as success", async () => {
    const result = await blockUserFlow({
      insertBlock: async () => ({ error: { code: "23505" } }),
      blockerId: "me",
      blockedId: "them",
    });
    assert.equal(result.ok, true);
  });
});

describe("boost flow", () => {
  it("calls boost_application with 24h / 10 credits", async () => {
    let params = null;
    const ok = await boostApplicationFlow({
      rpcBoost: async (p) => {
        params = p;
        return { data: true, error: null };
      },
      applicationId: "app-1",
    });
    assert.equal(ok, true);
    assert.deepEqual(params, {
      application_id_param: "app-1",
      boost_duration_hours: 24,
      credits_cost: 10,
    });
  });

  it("surfaces RPC errors instead of a client fallback", async () => {
    await assert.rejects(
      () =>
        boostApplicationFlow({
          rpcBoost: async () => ({
            data: null,
            error: new Error("Boost Failed: record application_record has no field is_boosted"),
          }),
          applicationId: "app-1",
        }),
      /Boost Failed/
    );
  });

  it("interpretBoostRpc only succeeds on true", () => {
    assert.equal(interpretBoostRpc(true, null), true);
    assert.equal(interpretBoostRpc(false, null), false);
  });
});

describe("message list grouping", () => {
  it("inserts a day separator before the first message", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const rows = buildChatListRows(
      [
        {
          id: "m1",
          senderId: "a",
          timestamp: "2026-09-10T11:00:00Z",
          content: "hi",
        },
      ],
      (ts) => formatDaySeparator(ts, now)
    );
    assert.equal(rows[0].rowType, "separator");
    assert.equal(rows[0].label, "Today");
    assert.equal(rows[1].id, "m1");
  });
});

describe("profile model", () => {
  it("builds an invite URL from the shared code", () => {
    assert.equal(getReferralLink("8F758ACA"), "https://rhood.io/invite/8F758ACA");
  });

  it("normalizes genres stored as a string", () => {
    const p = normalizeProfileForUI({ genres: "house", socialLinks: null });
    assert.deepEqual(p.genres, ["house"]);
    assert.equal(p.socialLinks.instagram, null);
  });
});

describe("nearby still matches boroughs after the profile split", () => {
  it("keeps Barnet in London", () => {
    assert.equal(citiesShareSameCity("Barnet", "London"), true);
  });
});
