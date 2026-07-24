import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { registrarMovimientoMateriaPrima } from "../src/shared/inventario/movimiento-inventario.service.js";

async function main() {
  const materiaPrimaId = 1n; // Polipropileno Virgen
  const usuarioAdmin = await prisma.usuario.findUniqueOrThrow({ where: { usuario: "admin01" } });

  console.log("--- Estado inicial del inventario ---");
  const antes = await prisma.inventarioMateriaPrima.findUnique({ where: { materiaPrimaId } });
  console.log(antes);

  console.log("\n--- Registrando ENTRADA de 100kg ---");
  const resultadoEntrada = await registrarMovimientoMateriaPrima({
    materiaPrimaId,
    tipoMovimiento: "ENTRADA",
    motivo: "ENTRADA_PROVEEDOR",
    cantidad: 100,
    usuarioId: usuarioAdmin.id,
    descripcion: "Prueba de entrada",
  });
  console.log(resultadoEntrada);

  console.log("\n--- Registrando SALIDA de 30kg ---");
  const resultadoSalida = await registrarMovimientoMateriaPrima({
    materiaPrimaId,
    tipoMovimiento: "SALIDA",
    motivo: "CONSUMO_PRODUCCION",
    cantidad: 30,
    usuarioId: usuarioAdmin.id,
    descripcion: "Prueba de salida",
  });
  console.log(resultadoSalida);

  console.log("\n--- Historial generado ---");
  const historial = await prisma.historialMovimientoInventario.findMany({
    where: { tipoInventario: "MATERIA_PRIMA", materiaPrimaId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(
    historial.map((h) => ({
      ...h,
      id: h.id.toString(),
      cantidadAnterior: Number(h.cantidadAnterior),
      cantidadMovimiento: Number(h.cantidadMovimiento),
      cantidadNueva: Number(h.cantidadNueva),
    }))
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });