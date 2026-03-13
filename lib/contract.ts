import "server-only";
import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  http,
  type Hex,
} from "viem";
import { LIBRARY_ABI, LIBRARY_CONTRACT_ADDRESS } from "@/utils/constants";

/**
 * ENVIRONMENT CONFIGURATION
 * We use getter functions or safe checks to prevent the Node.js process
 * from crashing if an environment variable is missing or malformed.
 */
const rpcUrl = process.env.NEXT_PUBLIC_BSC_RPC_URL || "";
if (!rpcUrl || rpcUrl === "YOUR_RPC_URL") {
  // This will now show up clearly in your console logs
  throw new Error("CRITICAL: RPC_URL is not configured in .env.local");
}

// Ensure the contract address is typed correctly
const contractAddress =
  (process.env.CONTRACT_ADDRESS as Hex) || (LIBRARY_CONTRACT_ADDRESS as Hex);

if (!rpcUrl) {
  console.warn("⚠️ RPC_URL is not configured. Public client calls will fail.");
}

/**
 * 1. CLIENT INITIALIZATION
 */
export const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

/**
 * 2. CONTRACT READ HELPER
 */
export const readContract = async <
  TFunctionName extends "hasAccess" | "getBook" | "uri" | "books" | "balanceOf",
>(
  functionName: TFunctionName,
  args: readonly unknown[],
) => {
  return publicClient.readContract({
    address: contractAddress,
    abi: LIBRARY_ABI,
    functionName,
    args,
  } as any);
};

/**
 * 3. TRANSACTION HELPERS
 */
export const getListBookArgsFromTx = async (hash: Hex) => {
  const tx = await publicClient.getTransaction({ hash });
  const decoded = decodeFunctionData({
    abi: LIBRARY_ABI,
    data: tx.input,
  });

  if (decoded.functionName !== "listBook") {
    throw new Error("Transaction is not a listBook call.");
  }

  const args = decoded.args as [string, bigint, Hex];
  return {
    cid: args[0],
    priceWei: args[1].toString(),
    payoutWallet: args[2],
  };
};

export const getListBookCallFromTx = async (hash: Hex) => {
  const tx = await publicClient.getTransaction({ hash });
  const decoded = decodeFunctionData({
    abi: LIBRARY_ABI,
    data: tx.input,
  });

  if (decoded.functionName !== "listBook") {
    throw new Error("Transaction is not a listBook call.");
  }

  const args = decoded.args as [string, bigint, Hex];
  return {
    cid: args[0],
    priceWei: args[1].toString(),
    payoutWallet: args[2],
    sender: tx.from,
    to: tx.to,
  };
};

export const getDecodedContractCallFromTx = async (hash: Hex) => {
  const tx = await publicClient.getTransaction({ hash });
  const decoded = decodeFunctionData({
    abi: LIBRARY_ABI,
    data: tx.input,
  });

  return {
    functionName: decoded.functionName,
    args: (decoded.args || []) as readonly unknown[],
    sender: tx.from,
    to: tx.to,
  };
};

export const getTransactionStatus = async (hash: Hex) => {
  const receipt = await publicClient.getTransactionReceipt({ hash });
  return receipt.status;
};

export const getBookListedFromReceipt = async (hash: Hex) => {
  const receipt = await publicClient.getTransactionReceipt({ hash });
  let bookId: string | null = null;
  let author: Hex | null = null;
  let priceWei: string | null = null;

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: LIBRARY_ABI,
        data: log.data,
        topics: log.topics,
        strict: false,
      });

      if (decoded.eventName === "BookListed") {
        const args = decoded.args as {
          bookId: bigint;
          author: Hex;
          price: bigint;
        };
        bookId = args.bookId.toString();
        author = args.author;
        priceWei = args.price.toString();
        break;
      }
    } catch {
      continue; // Skip logs that don't match our ABI
    }
  }

  return {
    status: receipt.status,
    bookId,
    author,
    priceWei,
  };
};
