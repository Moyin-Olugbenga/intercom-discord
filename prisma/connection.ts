import { PrismaClient } from "@/lib/generated/prisma";
// lib/database.ts (new file)
// import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// MySQL connection helper
export const ensureConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export { prisma };