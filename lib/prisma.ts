import { PrismaClient } from "@prisma/client";

const env = process.env.NODE_ENV === "production" ? "production" : "development";
const prefix = env === "production" ? "PROD_" : "DEV_";

const getEnv = (key: string) =>
  process.env[`${prefix}${key}`] ?? process.env[key];

const buildDatabaseUrl = () => {
  const host = getEnv("DB_HOST");
  const user = getEnv("DB_USER");
  const pass = getEnv("DB_PASS");
  const name = getEnv("DB_NAME");
  const port = getEnv("DB_PORT") || "3306";

  if (!host || !user || !pass || !name) return null;
  const encodedPass = encodeURIComponent(pass);
  return `mysql://${user}:${encodedPass}@${host}:${port}/${name}`;
};

const databaseUrl = process.env.DATABASE_URL ?? buildDatabaseUrl();

export const prisma =
  databaseUrl != null
    ? new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      })
    : null;

export const prismaStatus = {
  enabled: Boolean(databaseUrl),
  databaseUrl,
};
