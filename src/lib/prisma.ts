import { PrismaClient } from "../../prisma/generated/prisma/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false }, // Supabase usa certificados que requieren esto para conexiones pooled
});
export const prisma = new PrismaClient({ adapter });