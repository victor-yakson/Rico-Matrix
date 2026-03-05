const U64_MASK = (BigInt(1) << BigInt(64)) - BigInt(1);

const asU64 = (value: bigint) => value & U64_MASK;

export const hammingDistance = (a: bigint, b: bigint) => {
  let x = (asU64(a) ^ asU64(b)) & U64_MASK;
  let count = 0;
  while (x !== BigInt(0)) {
    count += Number(x & BigInt(1));
    x >>= BigInt(1);
  }
  return count;
};

export const computeSimilarity = (a: bigint, b: bigint) => {
  const distance = hammingDistance(a, b);
  return 100 - (distance / 64) * 100;
};
