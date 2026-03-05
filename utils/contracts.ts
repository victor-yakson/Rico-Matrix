import type { Abi } from "viem";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  USDT_CONTRACT_ADDRESS,
  USDT_ABI,
  SURVEY_CONTRACT_ADDRESS,
  SURVEY_ABI,
  LIBRARY_CONTRACT_ADDRESS,
  LIBRARY_ABI,
} from "./constants";

export const quantuMatrixContract = {
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI as unknown as Abi,
} as const;

export const usdtContract = {
  address: USDT_CONTRACT_ADDRESS,
  abi: USDT_ABI as unknown as Abi,
} as const;

export const surveyContract = {
  address: SURVEY_CONTRACT_ADDRESS,
  abi: SURVEY_ABI as unknown as Abi,
} as const;

export const libraryContract = {
  address: LIBRARY_CONTRACT_ADDRESS,
  abi: LIBRARY_ABI as unknown as Abi,
} as const;
