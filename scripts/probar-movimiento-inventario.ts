import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { registrarMovimientoMateriaPrima, registrarMovimientoMolido } from "../src/shared/inventario/movimiento-inventario.service.js";

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

    // ---------- Nueva prueba: molido ----------
  console.log("\n\n=== MOLIDO ===");

  const colorRojo = await prisma.colorSolido.findUniqueOrThrow({ where: { nombre: "Rojo Intenso" } });

  console.log("--- Estado inicial ---");
  const inventarioMolidoAntes = await prisma.inventarioMolido.findUnique({
    where: {
      materiaPrimaId_origen_colorSolidoId: {
        materiaPrimaId,
        origen: "COMPRADO",
        colorSolidoId: colorRojo.id,
      },
    },
  });
  console.log(inventarioMolidoAntes ?? "No existe todavía (esperado en la primera corrida)");

  console.log("\n--- Registrando ENTRADA de 50kg de molido comprado, color Rojo ---");
  const resultadoMolido = await registrarMovimientoMolido({
    materiaPrimaId,
    origen: "COMPRADO",
    colorSolidoId: colorRojo.id,
    tipoMovimiento: "ENTRADA",
    motivo: "ENTRADA_PROVEEDOR",
    cantidad: 50,
    usuarioId: usuarioAdmin.id,
    descripcion: "Prueba de entrada de molido comprado",
  });
  console.log(resultadoMolido);

  console.log("\n--- Registrando SALIDA de 20kg del mismo molido ---");
  const resultadoSalidaMolido = await registrarMovimientoMolido({
    materiaPrimaId,
    origen: "COMPRADO",
    colorSolidoId: colorRojo.id,
    tipoMovimiento: "SALIDA",
    motivo: "CONSUMO_PRODUCCION",
    cantidad: 20,
    usuarioId: usuarioAdmin.id,
    descripcion: "Prueba de consumo de molido comprado",
  });
  console.log(resultadoSalidaMolido);

  console.log("\n--- Historial generado para este molido ---");
  const historialMolido = await prisma.historialMovimientoInventario.findMany({
    where: {
      tipoInventario: "MOLIDO",
      materialMolidoId: materiaPrimaId,
      colorSolidoId: colorRojo.id,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(
    historialMolido.map((h) => ({
      id: h.id.toString(),
      tipoMovimiento: h.tipoMovimiento,
      motivo: h.motivo,
      origenMolido: h.origenMolido,
      colorSolidoId: h.colorSolidoId?.toString(),
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