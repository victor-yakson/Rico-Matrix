import { createHash } from "crypto";

const hashToken64 = (token: string) => {
  const digest = createHash("sha1").update(token).digest();
  let value = BigInt(0);
  for (let i = 0; i < 8; i++) {
    value = (value << BigInt(8)) + BigInt(digest[i]);
  }
  return value;
};

export const computeSimhash = (text: string): bigint => {
  const tokens = text.split(/\s+/).filter(Boolean);
  const weights = new Array<number>(64).fill(0);

  for (const token of tokens) {
    const hash = hashToken64(token);
    for (let i = 0; i < 64; i++) {
      const bit = (hash >> BigInt(i)) & BigInt(1);
      weights[i] += bit === BigInt(1) ? 1 : -1;
    }
  }

  let fingerprint = BigInt(0);
  for (let i = 0; i < 64; i++) {
    if (weights[i] > 0) {
      fingerprint |= BigInt(1) << BigInt(i);
    }
  }

  return fingerprint;
};
