import type { Abi } from "viem";
import {
  CONTRACT_ADDRESS,
  RICO_MATRIX_V3_ABI,
  USDT_CONTRACT_ADDRESS,
  USDT_ABI,
  SURVEY_CONTRACT_ADDRESS,
  SURVEY_ABI,
  VOTING_CONTRACT_ADDRESS,
  VOTING_ABI,
  LIBRARY_CONTRACT_ADDRESS,
  LIBRARY_ABI,
  RICO_STAKING_CONTRACT_ADDRESS,
  RICO_STAKING_ABI,
} from "./constants";

export const quantuMatrixContract = {
  address: CONTRACT_ADDRESS,
  abi: RICO_MATRIX_V3_ABI as unknown as Abi,
} as const;

export const usdtContract = {
  address: USDT_CONTRACT_ADDRESS,
  abi: USDT_ABI as unknown as Abi,
} as const;

export const surveyContract = {
  address: SURVEY_CONTRACT_ADDRESS,
  abi: SURVEY_ABI as unknown as Abi,
} as const;

export const votingContract = {
  address: VOTING_CONTRACT_ADDRESS,
  abi: VOTING_ABI as unknown as Abi,
} as const;

export const libraryContract = {
  address: LIBRARY_CONTRACT_ADDRESS,
  abi: LIBRARY_ABI as unknown as Abi,
} as const;

export const ricoStakingContract = {
  address: RICO_STAKING_CONTRACT_ADDRESS,
  abi: RICO_STAKING_ABI as unknown as Abi,
} as const;
