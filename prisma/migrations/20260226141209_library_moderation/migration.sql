-- CreateTable
CREATE TABLE `Book` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `authorWallet` VARCHAR(64) NOT NULL,
    `payoutWallet` VARCHAR(64) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `ipfsCid` VARCHAR(255) NULL,
    `priceWei` VARCHAR(100) NULL,
    `sha256Hash` VARCHAR(64) NOT NULL,
    `simhash` BIGINT NOT NULL,
    `similarityScore` DOUBLE NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'listed') NOT NULL DEFAULT 'pending',
    `rejectionReason` TEXT NULL,
    `txHash` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Book_sha256Hash_key`(`sha256Hash`),
    INDEX `Book_simhash_idx`(`simhash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
