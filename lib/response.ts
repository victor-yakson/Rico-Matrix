import { NextResponse } from "next/server";

export const ensureBigIntJson = () => {
  if (!(BigInt.prototype as any).toJSON) {
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
  }
};

export const jsonResponse = (payload: unknown, init?: ResponseInit) => {
  ensureBigIntJson();
  return NextResponse.json(JSON.parse(JSON.stringify(payload)), init);
};
