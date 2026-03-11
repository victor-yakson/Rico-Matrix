import "server-only";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  decodeFunctionData,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { LIBRARY_ABI, LIBRARY_CONTRACT_ADDRESS } from "@/utils/constants";

/**
 * ENVIRONMENT CONFIGURATION
 * We use getter functions or safe checks to prevent the Node.js process
 * from crashing if an environment variable is missing or malformed.
 */
const rpcUrl = process.env.NEXT_PUBLIC_BSC_RPC_URL || "";
const rawKey = process.env.PRIVATE_KEY;


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
 * 1. SAFE ACCOUNT INITIALIZATION
 * This prevents the "invalid private key" 500 error at the top level.
 */
const getAccount = () => {
  if (!rawKey) {
    console.warn("⚠️ PRIVATE_KEY is missing from environment variables.");
    return undefined;
  }

  // Viem requires the 0x prefix. This auto-fixes or validates the string.
  const formattedKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;

  try {
    return privateKeyToAccount(formattedKey as Hex);
  } catch (error) {
    console.error(
      "❌ Failed to initialize account. Check if PRIVATE_KEY is a valid Hex:",
      error,
    );
    return undefined;
  }
};

const account = getAccount();

/**
 * 2. CLIENT INITIALIZATION
 */
export const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

export const walletClient = account
  ? createWalletClient({
      account,
      transport: http(rpcUrl),
    })
  : null;

/**
 * 3. CONTRACT READ HELPER
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
 * 4. CONTRACT WRITE HELPER
 */
export const writeContract = async <
  TFunctionName extends
    | "listBook"
    | "buyBook"
    | "giftBook"
    | "voteBook"
    | "voteAuthor",
>(
  functionName: TFunctionName,
  args: readonly unknown[],
) => {
  // Instead of crashing the server on boot, we throw an error when the function is actually called.
  if (!walletClient || !account) {
    throw new Error(
      "Wallet configuration missing. Please check PRIVATE_KEY in your .env file.",
    );
  }

  return walletClient.writeContract({
    account,
    address: contractAddress,
    abi: LIBRARY_ABI,
    functionName,
    args,
  } as any);
};

/**
 * 5. TRANSACTION HELPERS
 */
export const waitForTransactionReceipt = async (hash: Hex) => {
  return await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  });
};

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
