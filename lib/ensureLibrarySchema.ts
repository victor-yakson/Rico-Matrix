import type { PrismaClient } from "@prisma/client";

let ensurePromise: Promise<void> | null = null;

const createBookTable = async (prisma: PrismaClient) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`Book\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`authorWallet\` VARCHAR(64) NOT NULL,
      \`payoutWallet\` VARCHAR(64) NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NOT NULL,
      \`ipfsCid\` VARCHAR(255) NULL,
      \`priceWei\` VARCHAR(100) NULL,
      \`sha256Hash\` VARCHAR(64) NOT NULL,
      \`simhash\` BIGINT UNSIGNED NOT NULL,
      \`similarityScore\` DOUBLE NOT NULL,
      \`status\` ENUM('pending','approved','rejected','listed') NOT NULL DEFAULT 'pending',
      \`processStage\` ENUM(
        'initiated',
        'validating_pdf',
        'extracting_text',
        'moderating',
        'uploading_ipfs',
        'ipfs_failed',
        'ready_for_listing',
        'listing_submitted',
        'completed',
        'rejected'
      ) NOT NULL DEFAULT 'initiated',
      \`processProgress\` INT NOT NULL DEFAULT 0,
      \`processMessage\` VARCHAR(255) NULL,
      \`ipfsRetryCount\` INT NOT NULL DEFAULT 0,
      \`rejectionReason\` TEXT NULL,
      \`txHash\` VARCHAR(100) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`Book_sha256Hash_key\` (\`sha256Hash\`),
      KEY \`Book_simhash_idx\` (\`simhash\`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
};

const ensureProcessColumns = async (prisma: PrismaClient) => {
  const columns = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Book'
    `
  );
  const names = new Set(columns.map((c) => c.COLUMN_NAME));

  const alterStatements: string[] = [];
  if (!names.has("processStage")) {
    alterStatements.push(
      "ADD COLUMN `processStage` ENUM('initiated','validating_pdf','extracting_text','moderating','uploading_ipfs','ipfs_failed','ready_for_listing','listing_submitted','completed','rejected') NOT NULL DEFAULT 'initiated'"
    );
  }
  if (!names.has("processProgress")) {
    alterStatements.push(
      "ADD COLUMN `processProgress` INT NOT NULL DEFAULT 0"
    );
  }
  if (!names.has("processMessage")) {
    alterStatements.push("ADD COLUMN `processMessage` VARCHAR(255) NULL");
  }
  if (!names.has("ipfsRetryCount")) {
    alterStatements.push(
      "ADD COLUMN `ipfsRetryCount` INT NOT NULL DEFAULT 0"
    );
  }

  if (alterStatements.length > 0) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`Book\` ${alterStatements.join(", ")}`
    );
  }
};

export const ensureLibrarySchema = async (prisma: PrismaClient) => {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await createBookTable(prisma);
      await ensureProcessColumns(prisma);
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
};
