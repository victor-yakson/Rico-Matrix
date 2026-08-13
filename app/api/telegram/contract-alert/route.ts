import { NextRequest, NextResponse } from "next/server";
import type { Hex } from "viem";

import {
  sendMatrixContractAlert,
  type MatrixAlertAction,
} from "@/lib/telegram-contract-alerts";

export const dynamic = "force-dynamic";

function isMatrixAlertAction(value: unknown): value is MatrixAlertAction {
  return (
    value === "registration" ||
    value === "chapter-upgrade" ||
    value === "royalty-claim"
  );
}

function isHexHash(value: unknown): value is Hex {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    const txHash = body?.txHash;

    if (!isMatrixAlertAction(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing action." },
        { status: 400 },
      );
    }

    if (!isHexHash(txHash)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing transaction hash." },
        { status: 400 },
      );
    }

    const result = await sendMatrixContractAlert({
      action,
      txHash,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send Telegram contract alert.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
