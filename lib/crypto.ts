import crypto from "crypto";

function encKey(): Buffer {
  const hex = process.env.PHONE_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("PHONE_ENCRYPTION_KEY는 64자리 hex여야 합니다.");
  }
  return Buffer.from(hex, "hex");
}

// AES-256-GCM 암호화 → "iv:ciphertext:tag" (hex)
export function encryptPhone(phone: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(phone, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${enc.toString("hex")}:${tag.toString("hex")}`;
}

export function decryptPhone(payload: string): string {
  const [ivH, encH, tagH] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivH, "hex"));
  decipher.setAuthTag(Buffer.from(tagH, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encH, "hex")), decipher.final()]).toString("utf8");
}

// 중복 조회용 해시 (원문 복호화 없이 비교)
export function hashPhone(phone: string): string {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

export function normalizePhone(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

export function isValidPhone(phone: string): boolean {
  const d = normalizePhone(phone);
  return /^010\d{8}$/.test(d);
}

export function formatPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function maskPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length !== 11) return "****";
  return `${d.slice(0, 3)}-****-${d.slice(7)}`;
}
