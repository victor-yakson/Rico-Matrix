-- CreateTable
CREATE TABLE IF NOT EXISTS `visits` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NULL,
  `country` VARCHAR(255) NOT NULL DEFAULT 'Unknown',
  `country_code` VARCHAR(2) NOT NULL DEFAULT 'XX',
  `city` VARCHAR(255) NULL,
  `latitude` FLOAT NULL,
  `longitude` FLOAT NULL,
  `user_agent` TEXT NULL,
  `path` VARCHAR(255) NULL DEFAULT '/',
  `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `visits_ip_address_timestamp_idx` (`ip_address`, `timestamp`),
  INDEX `visits_country_code_idx` (`country_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
