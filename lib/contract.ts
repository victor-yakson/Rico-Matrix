import "server-only";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { LIBRARY_ABI, LIBRARY_CONTRACT_ADDRESS } from "@/utils/constants";

const rpcUrl = process.env.RPC_URL || "";
const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;
const contractAddress =
  (process.env.CONTRACT_ADDRESS as `0x${string}` | undefined) ||
  LIBRARY_CONTRACT_ADDRESS;

if (!rpcUrl) {
  throw new Error("RPC_URL is not configured.");
}

const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

const account = privateKey ? privateKeyToAccount(privateKey) : undefined;
const walletClient = account
  ? createWalletClient({
      account,
      transport: http(rpcUrl),
    })
  : null;

export const readContract = async <
  TFunctionName extends
    | "hasAccess"
    | "getBook"
    | "uri"
    | "books"
    | "balanceOf"
>(
  functionName: TFunctionName,
  args: readonly unknown[]
) =>
  publicClient.readContract({
    address: contractAddress,
    abi: LIBRARY_ABI,
    functionName,
    args,
  } as any);

export const writeContract = async <
  TFunctionName extends
    | "listBook"
    | "buyBook"
    | "giftBook"
    | "voteBook"
    | "voteAuthor"
>(
  functionName: TFunctionName,
  args: readonly unknown[]
) => {
  if (!walletClient || !account) {
    throw new Error("PRIVATE_KEY is not configured.");
  }

  return walletClient.writeContract({
    account,
    address: contractAddress,
    abi: LIBRARY_ABI,
    functionName,
    args,
  } as any);
};

export const waitForTransactionReceipt = async (hash: `0x${string}`) => {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  });
  return receipt;
};
