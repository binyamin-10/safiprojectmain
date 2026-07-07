
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment.");
}

const connectionString = process.env.DATABASE_URL;
console.log("INITIALIZING PRISMA WITH CONNECTION STRING:", connectionString?.substring(0, 25) + "...");

if (process.env.NODE_ENV === "production") {
  const adapter = new PrismaNeon({ connectionString });
  prismaInstance = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaNeon({ connectionString });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;
