import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PINATA_LIST_URL = "https://api.pinata.cloud/data/pinList";
const FOLDER_NAME = "ricomatrix_business_doc";

const getPreferredFileNames = (lang: string) => {
  if (lang === "fr") {
    return ["french.pdf", "french"];
  }
  return ["english.pdf", "english"];
};

const resolveFolderCid = async () => {
  const jwt = process.env.PINATA_JWT?.trim();
  if (!jwt) {
    throw new Error("PINATA_JWT is not configured.");
  }

  const url = new URL(PINATA_LIST_URL);
  url.searchParams.set("status", "pinned");
  url.searchParams.set("pageLimit", "10");
  url.searchParams.set("metadata[name]", FOLDER_NAME);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Unable to resolve documentation folder (${res.status}).`);
  }

  const payload = (await res.json()) as {
    rows?: Array<{
      ipfs_pin_hash?: string;
      metadata?: { name?: string | null } | null;
    }>;
  };

  const row = payload.rows?.find(
    (item) => item.metadata?.name === FOLDER_NAME && item.ipfs_pin_hash
  );

  if (!row?.ipfs_pin_hash) {
    throw new Error(`Pinata folder "${FOLDER_NAME}" was not found.`);
  }

  return row.ipfs_pin_hash;
};

const fetchFromGateway = async (folderCid: string, lang: string) => {
  const jwt = process.env.PINATA_JWT?.trim();
  const gateway = (
    process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs"
  ).replace(/\/+$/, "");

  const candidates = getPreferredFileNames(lang);

  for (const fileName of candidates) {
    const res = await fetch(`${gateway}/${folderCid}/${fileName}`, {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      cache: "no-store",
    });

    if (res.ok && res.body) {
      return { res, fileName };
    }
  }

  throw new Error(`Documentation file for language "${lang}" was not found.`);
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawLang = searchParams.get("lang")?.trim().toLowerCase() || "en";
    const lang = rawLang === "fr" ? "fr" : "en";

    const folderCid = await resolveFolderCid();
    const { res, fileName } = await fetchFromGateway(folderCid, lang);

    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load documentation PDF." },
      { status: 500 }
    );
  }
}
