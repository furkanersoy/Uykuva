import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync
} from "expo-crypto";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToUtf8, clean, utf8ToBytes } from "@noble/hashes/utils.js";
import { AppState } from "./types";
import { createDataExport } from "./export";

const FORMAT = "uykuva-encrypted-export";
const ENVELOPE_VERSION = 1;
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const MAX_ENCRYPTED_EXPORT_CHARS = 5_000_000;
const ADDITIONAL_DATA = utf8ToBytes("uykuva-encrypted-export:v1:PBKDF2-HMAC-SHA256:600000:AES-256-GCM");

type EncryptedExportEnvelope = {
  format: typeof FORMAT;
  envelopeVersion: typeof ENVELOPE_VERSION;
  kdf: "PBKDF2-HMAC-SHA256";
  iterations: typeof ITERATIONS;
  salt: string;
  cipher: "AES-256-GCM";
  payload: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("Şifreli yedek biçimi geçersiz.");
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function validatePassword(password: string) {
  const length = Array.from(password).length;
  if (length < 12) throw new Error("Yedek parolası en az 12 karakter olmalı.");
  if (length > 128) throw new Error("Yedek parolası 128 karakterden uzun olamaz.");
}

export function isEncryptedDataExport(raw: string) {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null && !Array.isArray(value) && (value as Record<string, unknown>).format === FORMAT;
  } catch {
    return false;
  }
}

export async function createEncryptedDataExport(state: AppState, password: string) {
  validatePassword(password);
  const raw = createDataExport(state);
  if (raw.length > 2_000_000) throw new Error("Yedek metni 2 MB sınırını aşıyor.");
  const salt = await getRandomBytesAsync(SALT_BYTES);
  const keyBytes = await pbkdf2Async(sha256, utf8ToBytes(password), salt, { c: ITERATIONS, dkLen: 32 });
  try {
    const key = await AESEncryptionKey.import(keyBytes);
    const plaintext = utf8ToBytes(raw);
    const sealed = await aesEncryptAsync(plaintext, key, { nonce: { length: NONCE_BYTES }, additionalData: ADDITIONAL_DATA });
    const envelope: EncryptedExportEnvelope = {
      format: FORMAT,
      envelopeVersion: ENVELOPE_VERSION,
      kdf: "PBKDF2-HMAC-SHA256",
      iterations: ITERATIONS,
      salt: bytesToBase64(salt),
      cipher: "AES-256-GCM",
      payload: await sealed.combined("base64")
    };
    return JSON.stringify(envelope, null, 2);
  } finally {
    clean(keyBytes);
  }
}

export async function decryptDataExport(raw: string, password: string) {
  if (raw.length > MAX_ENCRYPTED_EXPORT_CHARS) throw new Error("Şifreli yedek 5 MB sınırını aşıyor.");
  if (!password) throw new Error("Şifreli yedek için parolayı girin.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Şifreli yedek geçerli bir JSON zarfı değil.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Şifreli yedek biçimi geçersiz.");
  const value = parsed as Record<string, unknown>;
  if (value.format !== FORMAT || value.envelopeVersion !== ENVELOPE_VERSION || value.kdf !== "PBKDF2-HMAC-SHA256" || value.iterations !== ITERATIONS || value.cipher !== "AES-256-GCM" || typeof value.salt !== "string" || typeof value.payload !== "string") {
    throw new Error("Bu şifreli yedek sürümü desteklenmiyor.");
  }
  if (value.salt.length !== 24) throw new Error("Şifreli yedekteki parola tuzu geçersiz.");
  const salt = base64ToBytes(value.salt);
  if (salt.length !== SALT_BYTES || value.payload.length < 40 || value.payload.length > MAX_ENCRYPTED_EXPORT_CHARS || value.payload.length % 4 !== 0) {
    throw new Error("Şifreli yedek verisi geçersiz veya bozuk.");
  }
  const keyBytes = await pbkdf2Async(sha256, utf8ToBytes(password), salt, { c: ITERATIONS, dkLen: 32 });
  try {
    const key = await AESEncryptionKey.import(keyBytes);
    const sealed = AESSealedData.fromCombined(value.payload, { ivLength: NONCE_BYTES, tagLength: TAG_BYTES });
    const plaintext = await aesDecryptAsync(sealed, key, { additionalData: ADDITIONAL_DATA });
    return bytesToUtf8(plaintext);
  } catch {
    throw new Error("Parola yanlış olabilir veya şifreli yedek hasar görmüş olabilir.");
  } finally {
    clean(keyBytes);
  }
}
