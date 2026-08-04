import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  await prisma.tipoMolido.createMany({
    data: [
      { tipoMaterial: "POLIPROPILENO", origen: "COMPRADO", codigoInterno: "JU-MCP1" },
      { tipoMaterial: "POLIPROPILENO", origen: "INTERNO", codigoInterno: "JU-MPI1" },
      { tipoMaterial: "POLIESTIRENO", origen: "INTERNO", codigoInterno: "JU-MSI1" },
    ],
  });

  console.log("Tipos de molido creados correctamente.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });