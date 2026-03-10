import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const COOKIE_SECRET_ENV = "TRIAL_COOKIE_SECRET";
const ENCRYPTION_SECRET_ENV = "TRIAL_ENCRYPTION_SECRET";

function requiredSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function signGuestCookie(guestId: string): string {
  const secret = requiredSecret(COOKIE_SECRET_ENV);
  const signature = createHmac("sha256", secret).update(guestId).digest("base64url");
  return `${guestId}.${signature}`;
}

export function verifyGuestCookie(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  const parts = raw.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [guestId, signature] = parts;
  const expected = createHmac("sha256", requiredSecret(COOKIE_SECRET_ENV))
    .update(guestId)
    .digest("base64url");

  const valid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  return valid ? guestId : null;
}

export function encryptSecret(value: string): string {
  const secret = process.env[ENCRYPTION_SECRET_ENV]?.trim() || requiredSecret(COOKIE_SECRET_ENV);
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(payload: string): string {
  const secret = process.env[ENCRYPTION_SECRET_ENV]?.trim() || requiredSecret(COOKIE_SECRET_ENV);
  const key = deriveKey(secret);
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Encrypted secret payload is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivRaw, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
