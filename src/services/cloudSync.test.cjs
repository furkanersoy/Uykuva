const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const path = require("node:path");

const secureValues = new Map();
let clientOptions;
const memberships = [
  { family_id: "family-owner", role: "parent", joined_at: "2026-10-01T00:00:00Z" },
  { family_id: "family-member", role: "caregiver", joined_at: "2026-10-02T00:00:00Z" }
];
const inviteRows = [
  { id: "invite-pending", invited_email: "care@example.com", role: "caregiver", expires_at: "2099-01-01T00:00:00Z", accepted_at: null, revoked_at: null },
  { id: "invite-accepted", invited_email: "done@example.com", role: "parent", expires_at: "2099-01-01T00:00:00Z", accepted_at: "2026-10-29T00:00:00Z", revoked_at: null },
  { id: "invite-expired", invited_email: "old@example.com", role: "family", expires_at: "2000-01-01T00:00:00Z", accepted_at: null, revoked_at: null }
];
const rpcCalls = [];
const mockClient = {
  auth: { getUser: async () => ({ data: { user: { id: "user-owner", email: "parent@example.com" } }, error: null }) },
  rpc: async (name, args) => { rpcCalls.push({ name, args }); return { data: true, error: null }; },
  from(table) {
    return {
      select() { return this; },
      eq() { return this; },
      async order() { return { data: table === "family_invites" ? inviteRows : memberships, error: null }; },
      async in(_column, ids) {
        return {
          data: ids.filter((id) => id.startsWith("family-")).map((id) => ({ id, owner_id: id === "family-owner" ? "user-owner" : "someone-else" })),
          error: null
        };
      }
    };
  }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "react-native-url-polyfill/auto") return {};
  if (request === "@supabase/supabase-js") return { createClient: (_url, _key, options) => { clientOptions = options; return mockClient; } };
  if (request === "expo-secure-store") return {
    getItemAsync: async (key) => secureValues.get(key) ?? null,
    setItemAsync: async (key, value) => { secureValues.set(key, value); },
    deleteItemAsync: async (key) => { secureValues.delete(key); }
  };
  if (request === "expo-crypto") return {
    getRandomBytesAsync: async (size) => new Uint8Array(size),
    getRandomValues: (array) => array,
    randomUUID: () => "test-uuid",
    AESEncryptionKey: { import: async () => ({}) },
    AESSealedData: { fromCombined: () => ({}) },
    aesEncryptAsync: async () => ({ combined: async () => "" }),
    aesDecryptAsync: async () => new Uint8Array()
  };
  if (request === "@noble/hashes/utils.js") return {
    clean: () => {},
    utf8ToBytes: (value) => new TextEncoder().encode(value),
    bytesToUtf8: (value) => new TextDecoder().decode(value)
  };
  return originalLoad.call(this, request, parent, isMain);
};

let service;
try {
  const buildDirectory = process.env.UYKUVA_TEST_BUILD || path.resolve(__dirname, "../../.test-build");
  service = require(path.join(buildDirectory, "services", "cloudSync.js"));
} finally {
  Module._load = originalLoad;
}

test("cloud sync stays disabled without explicit Supabase configuration", () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.equal(service.isCloudSyncConfigured(), false);
});

test("family membership identifies the owner without granting ownership to invitees", async () => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://uykuva.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key_long_enough";
  const families = await service.getMyCloudFamilies();
  assert.equal(families[0].isOwner, true);
  assert.equal(families[1].isOwner, false);
  assert.equal(families[1].role, "caregiver");
});

test("family owners see only active invites and can revoke an invite through the guarded RPC", async () => {
  const invites = await service.getCloudFamilyInvites("family-owner");
  assert.deepEqual(invites.map((invite) => invite.id), ["invite-pending"]);
  await service.revokeCloudFamilyInvite("family-owner", "invite-pending");
  assert.deepEqual(rpcCalls.at(-1), {
    name: "revoke_family_invite",
    args: { p_family_id: "family-owner", p_invite_id: "invite-pending" }
  });
});

test("secure auth storage splits long Unicode sessions without changing their value", async () => {
  const storage = clientOptions.auth.storage;
  const value = "A😀B".repeat(1_000);
  await storage.setItem("session", value);
  assert.equal(await storage.getItem("session"), value);
  const sessionChunks = [...secureValues.entries()].filter(([key]) => key.includes(":session:") && !key.endsWith(":count"));
  assert.ok(sessionChunks.length > 1);
  assert.ok(sessionChunks.every(([, chunk]) => chunk.length <= 1_600));
  await storage.removeItem("session");
  assert.equal(await storage.getItem("session"), null);
});

test("family encryption keys are stored locally only after checking for 256-bit length", async () => {
  const valid = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  await service.storeSharedFamilyEncryptionKey("family-owner", valid);
  assert.equal(await service.getFamilyEncryptionKey("family-owner"), valid);
  await assert.rejects(service.storeSharedFamilyEncryptionKey("family-owner", "AAAAAAAAAAAAAAAAAAAAAA=="), /256 bit/i);
});

test("family document revision conflicts are recognized without masking other failures", () => {
  assert.equal(service.isFamilyRevisionConflict({ code: "40001", message: "serialization failure" }), true);
  assert.equal(service.isFamilyRevisionConflict({ message: "The family document changed on another device." }), true);
  assert.equal(service.isFamilyRevisionConflict({ code: "42501", message: "permission denied" }), false);
  assert.equal(service.isFamilyRevisionConflict(new Error("network unavailable")), false);
});

test("family document sync fetches and merges the latest revision after a write conflict", async () => {
  const writes = [];
  let latestReads = 0;
  const result = await service.saveFamilyDocumentWithRevisionRetry({
    value: { entries: ["local"] },
    revision: 3,
    loadLatest: async () => { latestReads += 1; return { revision: 4, value: { entries: ["remote"] } }; },
    merge: (current, latest) => ({ entries: [...new Set([...current.entries, ...latest.entries])] }),
    save: async (revision, value) => {
      writes.push({ revision, value });
      if (writes.length === 1) throw { code: "40001", message: "revision conflict" };
      return revision + 1;
    }
  });

  assert.equal(latestReads, 1);
  assert.deepEqual(writes, [
    { revision: 3, value: { entries: ["local"] } },
    { revision: 4, value: { entries: ["local", "remote"] } }
  ]);
  assert.deepEqual(result, { revision: 5, value: { entries: ["local", "remote"] } });
});

test("family document sync stops after bounded retries and preserves the retry error", async () => {
  let writes = 0;
  let reads = 0;
  await assert.rejects(service.saveFamilyDocumentWithRevisionRetry({
    value: { local: true },
    revision: 1,
    loadLatest: async () => { reads += 1; return { revision: reads + 1, value: { remote: reads } }; },
    merge: (current, latest) => ({ ...current, ...latest }),
    save: async () => { writes += 1; throw { code: "40001", message: "revision conflict" }; }
  }), /Bu cihazdaki kayıtlar korundu/i);
  assert.equal(writes, 3);
  assert.equal(reads, 2);
});
