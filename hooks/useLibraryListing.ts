import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { libraryContract } from "@/utils/contracts";
import { toast } from "sonner";

export const useLibraryListing = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const formatListingError = (error: unknown) => {
    const message =
      (error as { shortMessage?: string; message?: string })?.shortMessage ||
      (error as { message?: string })?.message ||
      "Listing failed.";

    if (
      message.includes("Non-200 status code: '401'") ||
      message.includes("status code: '401'")
    ) {
      return "RPC provider unauthorized (401). Update NEXT_PUBLIC_BSC_RPC_URL or use an unrestricted BSC RPC endpoint.";
    }
    if (
      message.toLowerCase().includes("user rejected") ||
      message.toLowerCase().includes("rejected the request")
    ) {
      return "Transaction was rejected in wallet.";
    }
    return message;
  };

  const listBookOnChain = async (params: {
    cid: string;
    priceWei: bigint;
    payoutWallet: `0x${string}`;
  }) => {
    if (!address) {
      throw new Error("Wallet not connected.");
    }
    if (!publicClient) {
      throw new Error("Wallet client not available.");
    }

    const toastId = "list-book";
    toast.loading("Listing book on-chain...", { id: toastId });

    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "listBook",
        args: [params.cid, params.priceWei, params.payoutWallet],
      });

      toast.loading("Transaction submitted...", { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status !== "success") {
        toast.error("Listing failed on-chain.", { id: toastId });
        throw new Error("Listing failed on-chain.");
      }

      toast.success("Book listed successfully.", { id: toastId });
      return hash;
    } catch (error) {
      const formatted = formatListingError(error);
      toast.error(formatted, { id: toastId });
      throw new Error(formatted);
    }
  };

  return { listBookOnChain };
};
