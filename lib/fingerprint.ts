import { createHash } from "crypto";

export const generateFingerprint = (buffer: Buffer) => {
  return createHash("sha256").update(buffer).digest("hex");
};

