import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { parseResumeData, type ResumeData } from "@/lib/schema/resume";

// resume_data_encrypted is app-layer AES-256-GCM ciphertext (HLD.md §5.3).
// The key lives in its own env var, separate from DATABASE_URL, so a DB
// leak alone never exposes plaintext resume content.
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.RESUME_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("RESUME_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("RESUME_ENCRYPTION_KEY must decode to 32 bytes (AES-256)");
  }
  return key;
}

// Packed as iv(12) + authTag(16) + ciphertext.
export function encryptResumeData(data: ResumeData): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptResumeData(blob: Buffer): ResumeData {
  const iv = blob.subarray(0, IV_LENGTH);
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return parseResumeData(JSON.parse(plaintext.toString("utf8")));
}
