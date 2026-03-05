/*
  Warnings:

  - You are about to alter the column `simhash` on the `Book` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `UnsignedBigInt`.

*/
-- AlterTable
ALTER TABLE `Book` MODIFY `simhash` BIGINT UNSIGNED NOT NULL;
