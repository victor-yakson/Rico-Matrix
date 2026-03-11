import "server-only";
import { nanoid } from "nanoid";

const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_UNPIN_URL = "https://api.pinata.cloud/pinning/unpin";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

const getPinataJwt = () => {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error("PINATA_JWT is not configured.");
  }
  return jwt;
};

const extractCid = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  const cid = record.IpfsHash ?? record.Hash ?? record.cid;
  return typeof cid === "string" ? cid : "";
};

type UploadFolderParams = {
  bookFile: File | Buffer;
  thumbnailFile: File | Buffer;
  title: string;
  description: string;
  author: string;
};

const toBlob = (input: File | Buffer, contentType: string) => {
  if (input instanceof File) return input;
  return new Blob([new Uint8Array(input)], { type: contentType });
};

export const uploadBookFolder = async (
  params: UploadFolderParams
): Promise<string> => {
  const jwt = getPinataJwt();
  const folderName = `book-${Date.now()}`;

  const metadata = {
    title: params.title,
    description: params.description,
    author: params.author,
    bookFile: "book.pdf",
    thumbnail: "thumbnail.jpg",
    createdAt: Date.now(),
  };

  const formData = new FormData();
  const bookBlob = toBlob(params.bookFile, "application/pdf");
  const thumbnailBlob = toBlob(params.thumbnailFile, "image/jpeg");
  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: "application/json",
  });

  formData.append("file", bookBlob, `${folderName}/book.pdf`);
  formData.append("file", thumbnailBlob, `${folderName}/thumbnail.jpg`);
  formData.append("file", metadataBlob, `${folderName}/metadata.json`);

  const response = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const reason =
      (payload as any)?.error?.reason ||
      (payload as any)?.message ||
      raw ||
      "Pinata folder upload failed.";
    throw new Error(reason);
  }

  const folderCID = extractCid(payload);
  if (!folderCID) {
    throw new Error("Pinata response did not include a folder CID.");
  }

  return folderCID;
};

export const uploadToIPFS = async (file: File | Buffer): Promise<string> => {
  const jwt = getPinataJwt();
  const formData = new FormData();

  if (file instanceof File) {
    formData.append("file", file, file.name || `book-${nanoid(8)}.pdf`);
  } else {
    const blob = new Blob([new Uint8Array(file)], {
      type: "application/pdf",
    });
    formData.append("file", blob, `book-${nanoid(8)}.pdf`);
  }

  const response = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const reason =
      (payload as any)?.error?.reason ||
      (payload as any)?.message ||
      raw ||
      "Pinata upload failed.";
    throw new Error(reason);
  }

  const cid = extractCid(payload);
  if (!cid) {
    throw new Error("Pinata response did not include a CID.");
  }

  return cid;
};

export const unpinFromIPFS = async (cid: string): Promise<void> => {
  const jwt = getPinataJwt();
  const trimmedCid = cid.trim();
  if (!trimmedCid) return;

  const response = await fetch(`${PINATA_UNPIN_URL}/${trimmedCid}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const raw = await response.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
    const reason =
      (payload as any)?.error?.reason ||
      (payload as any)?.message ||
      raw ||
      "Pinata unpin failed.";
    throw new Error(reason);
  }
};

export const pinJsonToIPFS = async (
  content: Record<string, unknown>,
  name?: string
): Promise<string> => {
  const jwt = getPinataJwt();
  const response = await fetch(PINATA_JSON_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataMetadata: name ? { name } : undefined,
      pinataContent: content,
    }),
  });

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const reason =
      (payload as any)?.error?.reason ||
      (payload as any)?.message ||
      raw ||
      "Pinata JSON upload failed.";
    throw new Error(reason);
  }

  const cid = extractCid(payload);
  if (!cid) {
    throw new Error("Pinata response did not include a CID.");
  }
  return cid;
};
