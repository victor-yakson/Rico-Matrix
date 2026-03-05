-- AlterTable
ALTER TABLE `Book`
  ADD COLUMN `processStage` ENUM(
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
  ADD COLUMN `processProgress` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `processMessage` VARCHAR(255) NULL,
  ADD COLUMN `ipfsRetryCount` INTEGER NOT NULL DEFAULT 0;
