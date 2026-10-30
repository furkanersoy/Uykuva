import "./cryptoPolyfill";
import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync
} from "expo-crypto";
import { clean, utf8ToBytes, bytesToUtf8 } from "@noble/hashes/utils.js";

const AUTH_SESSION_KEY = "uykuva:cloud-auth-session:v1";
const AUTH_SESSION_CHUNK_SIZE = 1_600;
const FAMILY_KEY_PREFIX = "uykuva:family-key:v1:";
const ENVELOPE_PREFIX = "uykuva-e2ee-v1:";
const ENCRYPTION_VERSION = 1;
const KEY_BYTES = 32;
const MAX_DOCUMENT_BYTES = 7_500_000;

type EncryptedDocument = {
  familyId: string;
  documentId: string;
  revision: number;
  encryptionVersion: number;
  ciphertext: string;
  updatedAt: string;
};

type FamilyMembership = {
  family_id: string;
  role: "parent" | "caregiver" | "family";
  joined_at: string;
  isOwner: boolean;
};

function supabaseUrl() {
  return process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function publishableKey() {
  return process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
}

export function isCloudSyncConfigured() {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl())
    && publishableKey().length > 20;
}

export function cloudSyncSetupMessage() {
  return isCloudSyncConfigured()
    ? "Bulut bağlantısı ayarlı. Eşitleme, siz aile hesabı açıp onay vermeden başlamaz."
    : "Bulut eşitlemesini kullanmak için Uykuva'nın Supabase adresi ve herkese açık anahtarı yapılandırılmalı. Cihazınızdaki kayıtlar etkilenmez.";
}

let client: SupabaseClient | null = null;

function getClient() {
  if (!isCloudSyncConfigured()) throw new Error("Bulut eşitlemesi henüz yapılandırılmadı.");
  if (!client) {
    client = createClient(supabaseUrl(), publishableKey(), {
      auth: {
        storage: {
          getItem: async (key) => {
            const storageKey = `${AUTH_SESSION_KEY}:${key}`;
            const count = Number(await SecureStore.getItemAsync(`${storageKey}:count`));
            if (!Number.isInteger(count) || count < 1 || count > 64) return null;
            const pieces = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${storageKey}:${index}`)));
            return pieces.every((piece): piece is string => piece !== null) ? pieces.join("") : null;
          },
          setItem: async (key, value) => {
            const storageKey = `${AUTH_SESSION_KEY}:${key}`;
            const oldCount = Number(await SecureStore.getItemAsync(`${storageKey}:count`)) || 0;
            const pieces: string[] = [];
            let piece = "";
            for (const character of value) {
              if (piece.length + character.length > AUTH_SESSION_CHUNK_SIZE) {
                pieces.push(piece);
                piece = "";
              }
              piece += character;
            }
            if (piece || pieces.length === 0) pieces.push(piece);
            const count = pieces.length;
            if (count < 1 || count > 64) throw new Error("Oturum bilgisi güvenli depolama sınırını aşıyor.");
            for (let index = 0; index < count; index += 1) {
              await SecureStore.setItemAsync(`${storageKey}:${index}`, pieces[index]!);
            }
            await SecureStore.setItemAsync(`${storageKey}:count`, String(count));
            for (let index = count; index < oldCount; index += 1) await SecureStore.deleteItemAsync(`${storageKey}:${index}`);
          },
          removeItem: async (key) => {
            const storageKey = `${AUTH_SESSION_KEY}:${key}`;
            const count = Number(await SecureStore.getItemAsync(`${storageKey}:count`)) || 0;
            await Promise.all(Array.from({ length: Math.min(count, 64) }, (_, index) => SecureStore.deleteItemAsync(`${storageKey}:${index}`)));
            await SecureStore.deleteItemAsync(`${storageKey}:count`);
          }
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
  }
  return client;
}

export async function signUpForCloudSync(email: string, password: string) {
  const normalizedEmail = email.trim().toLocaleLowerCase("en-US");
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Geçerli bir e-posta adresi yazın.");
  if (password.length < 12) throw new Error("Hesap parolası en az 12 karakter olmalı.");
  const { data, error } = await getClient().auth.signUp({ email: normalizedEmail, password });
  if (error) throw error;
  return { confirmationRequired: !data.session, userId: data.user?.id ?? null };
}

export async function signInToCloudSync(email: string, password: string) {
  const { data, error } = await getClient().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data.user;
}

export async function signOutOfCloudSync() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

export async function getCloudSyncAccount() {
  const { data, error } = await getClient().auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw error;
  return data.user ?? null;
}

export async function getMyCloudFamilies() {
  const api = getClient();
  const [{ data, error }, { data: userData, error: userError }] = await Promise.all([
    api.from("family_members").select("family_id, role, joined_at").order("joined_at", { ascending: true }),
    api.auth.getUser()
  ]);
  if (error) throw error;
  if (userError) throw userError;
  const rows = data ?? [];
  if (!rows.length || !userData.user) return [];
  const familyIds = rows.map((row) => row.family_id);
  const { data: familyData, error: familyError } = await api.from("families").select("id, owner_id").in("id", familyIds);
  if (familyError) throw familyError;
  const owners = new Map((familyData ?? []).map((family) => [family.id, family.owner_id]));
  return rows.map((row) => ({ ...row, isOwner: owners.get(row.family_id) === userData.user.id })) as FamilyMembership[];
}

export async function removeCloudFamily(familyId: string) {
  const { data, error } = await getClient().rpc("delete_family", { p_family_id: familyId });
  if (error) throw error;
  if (data !== true) throw new Error("Aile silinemedi veya bu aileyi silme yetkiniz yok.");
  await removeFamilyEncryptionKey(familyId);
}

export async function createCloudFamily() {
  const { data, error } = await getClient().rpc("create_family");
  if (error) throw error;
  return data as string;
}

export async function createCloudFamilyInvite(familyId: string, email: string, role: "parent" | "caregiver" | "family") {
  const { data, error } = await getClient().rpc("create_family_invite", {
    p_family_id: familyId,
    p_invited_email: email.trim().toLocaleLowerCase("en-US"),
    p_role: role
  });
  if (error) throw error;
  const invite = Array.isArray(data) ? data[0] : data;
  if (!invite?.invite_token || !invite?.invite_expires_at) throw new Error("Davet oluşturuldu ancak yanıt okunamadı.");
  return { token: invite.invite_token as string, expiresAt: invite.invite_expires_at as string };
}

export async function acceptCloudFamilyInvite(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token.trim())) throw new Error("Davet kodu geçersiz.");
  const { data, error } = await getClient().rpc("accept_family_invite", { p_invite_token: token.trim().toLowerCase() });
  if (error) throw error;
  return data as string;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("Aile anahtarı biçimi geçersiz.");
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export async function createFamilyEncryptionKey(familyId: string) {
  const bytes = await getRandomBytesAsync(KEY_BYTES);
  try {
    const encoded = toBase64(bytes);
    await SecureStore.setItemAsync(`${FAMILY_KEY_PREFIX}${familyId}`, encoded);
    return encoded;
  } finally {
    clean(bytes);
  }
}

export async function getFamilyEncryptionKey(familyId: string) {
  return SecureStore.getItemAsync(`${FAMILY_KEY_PREFIX}${familyId}`);
}

export async function storeSharedFamilyEncryptionKey(familyId: string, encodedKey: string) {
  const bytes = fromBase64(encodedKey.trim());
  if (bytes.length !== KEY_BYTES) {
    clean(bytes);
    throw new Error("Aile anahtarı 256 bit olmalı.");
  }
  clean(bytes);
  await SecureStore.setItemAsync(`${FAMILY_KEY_PREFIX}${familyId}`, encodedKey.trim());
}

async function importFamilyKey(familyId: string) {
  const encoded = await SecureStore.getItemAsync(`${FAMILY_KEY_PREFIX}${familyId}`);
  if (!encoded) throw new Error("Bu cihazda aile şifreleme anahtarı yok. Anahtarı aile sahibinden güvenli bir kanalla alın.");
  const bytes = fromBase64(encoded);
  try {
    if (bytes.length !== KEY_BYTES) throw new Error("Aile şifreleme anahtarı geçersiz.");
    return await AESEncryptionKey.import(bytes);
  } finally {
    clean(bytes);
  }
}

function additionalData(familyId: string, documentId: string) {
  return utf8ToBytes(`${ENVELOPE_PREFIX}${familyId}:${documentId}:${ENCRYPTION_VERSION}`);
}

export async function encryptFamilyDocument(familyId: string, documentId: string, value: unknown) {
  const plaintext = utf8ToBytes(JSON.stringify(value));
  if (plaintext.length > MAX_DOCUMENT_BYTES) {
    clean(plaintext);
    throw new Error("Eşitlenecek veri 7,5 MB sınırını aşıyor. Fotoğrafları yerel yedekle aktarın.");
  }
  try {
    const sealed = await aesEncryptAsync(plaintext, await importFamilyKey(familyId), {
      nonce: { length: 12 },
      additionalData: additionalData(familyId, documentId)
    });
    return `${ENVELOPE_PREFIX}${await sealed.combined("base64")}`;
  } finally {
    clean(plaintext);
  }
}

export async function decryptFamilyDocument(familyId: string, documentId: string, envelope: string) {
  if (!envelope.startsWith(ENVELOPE_PREFIX) || envelope.length > MAX_DOCUMENT_BYTES * 2) throw new Error("Buluttaki şifreli kayıt biçimi geçersiz.");
  let plaintext: Uint8Array | undefined;
  try {
    const sealed = AESSealedData.fromCombined(envelope.slice(ENVELOPE_PREFIX.length), { ivLength: 12, tagLength: 16 });
    plaintext = await aesDecryptAsync(sealed, await importFamilyKey(familyId), {
      additionalData: additionalData(familyId, documentId)
    });
    return JSON.parse(bytesToUtf8(plaintext)) as unknown;
  } catch {
    throw new Error("Kayıt açılamadı. Aile anahtarı yanlış olabilir veya şifreli veri bozulmuş olabilir.");
  } finally {
    if (plaintext) clean(plaintext);
  }
}

export async function fetchEncryptedFamilyDocument(familyId: string, documentId: string): Promise<EncryptedDocument | null> {
  const { data, error } = await getClient()
    .from("sync_documents")
    .select("family_id, child_id, revision, encryption_version, ciphertext, updated_at")
    .eq("family_id", familyId)
    .eq("child_id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ciphertext = typeof data.ciphertext === "string" && data.ciphertext.startsWith("\\x")
    ? data.ciphertext.slice(2)
    : "";
  if (!/^(?:[a-f0-9]{2})+$/i.test(ciphertext)) throw new Error("Buluttaki şifreli kayıt okunamadı.");
  return {
    familyId: data.family_id,
    documentId: data.child_id,
    revision: Number(data.revision),
    encryptionVersion: Number(data.encryption_version),
    ciphertext: `${ENVELOPE_PREFIX}${toBase64(Uint8Array.from(ciphertext.match(/.{2}/g)!, (pair) => Number.parseInt(pair, 16)))}`,
    updatedAt: data.updated_at
  };
}

export async function saveEncryptedFamilyDocument(familyId: string, documentId: string, expectedRevision: number, value: unknown) {
  const envelope = await encryptFamilyDocument(familyId, documentId, value);
  const base64 = envelope.slice(ENVELOPE_PREFIX.length);
  const bytes = fromBase64(base64);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  clean(bytes);
  const { data, error } = await getClient().rpc("append_sync_document", {
    p_family_id: familyId,
    p_child_id: documentId,
    p_expected_revision: expectedRevision,
    p_encryption_version: ENCRYPTION_VERSION,
    p_ciphertext: `\\x${hex}`
  });
  if (error) throw error;
  return Number(data);
}

export async function removeFamilyEncryptionKey(familyId: string) {
  await SecureStore.deleteItemAsync(`${FAMILY_KEY_PREFIX}${familyId}`);
}
