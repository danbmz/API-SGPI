import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const passwordHash = await argon2.hash("admin123");

  const usuario = await prisma.usuario.create({
    data: {
      nombre: "Juan Pérez",
      usuario: "admin01",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Usuario admin creado:", { ...usuario, id: usuario.id.toString(), password: "[oculto]" });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });