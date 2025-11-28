import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  USDT_CONTRACT_ADDRESS,
  USDT_ABI,
} from "./constants";

export const quantuMatrixContract = {
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
} as const;

export const usdtContract = {
  address: USDT_CONTRACT_ADDRESS,
  abi: USDT_ABI,
} as const;
