// Seed completo para poblar la base de datos con datos base de prueba.
// Pensado para correr UNA VEZ sobre una base recién reseteada (db push).
//
// Ejecutar con: npx tsx scripts/seed.ts

import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("Iniciando seed...\n");

  // ---------------------------------------------------------------------
  // 1. USUARIOS (uno por cada rol)
  // ---------------------------------------------------------------------
  console.log("Creando usuarios...");

  const passwordAdmin = await argon2.hash("admin123");
  const passwordGenerico = await argon2.hash("password123");

  const admin = await prisma.usuario.create({
    data: { nombre: "Juan Pérez", usuario: "admin01", password: passwordAdmin, role: "ADMIN" },
  });

  const supervisor = await prisma.usuario.create({
    data: { nombre: "Ana Ruiz", usuario: "supervisor01", password: passwordGenerico, role: "SUPERVISOR" },
  });

  const molino = await prisma.usuario.create({
    data: { nombre: "Carlos Molina", usuario: "molino01", password: passwordGenerico, role: "MOLINO" },
  });

  const pigmentos = await prisma.usuario.create({
    data: { nombre: "Laura Sánchez", usuario: "pigmentos01", password: passwordGenerico, role: "PIGMENTOS" },
  });

  console.log(`  admin01 / supervisor01 / molino01 / pigmentos01 (password: admin123 / password123)\n`);

  // ---------------------------------------------------------------------
  // 2. MATERIAS PRIMAS (con su inventario anidado)
  // ---------------------------------------------------------------------
  console.log("Creando materias primas...");

  const materiaPP = await prisma.materiaPrima.create({
    data: {
      nombre: "Polipropileno Virgen",
      codigoInterno: "PV1",
      tipo: "POLIPROPILENO", // AJUSTA si tu enum TipoMaterial usa otro literal
      proveedor: "Braskem",
      unidadMedida: "KILOGRAMO",
      costoUnitario: 30,
      inventarioVirgen: { create: { cantidadActual: 2000, stockMinimo: 500 } },
    },
  });
  const materiaPPT = await prisma.materiaPrima.create({
    data: {
      nombre: "Polipropileno Virgen-Taquero",
      codigoInterno: "PV1-T",
      tipo: "POLIPROPILENO", // AJUSTA si tu enum TipoMaterial usa otro literal
      proveedor: "Braskem",
      unidadMedida: "KILOGRAMO",
      costoUnitario: 30,
      inventarioVirgen: { create: { cantidadActual: 2000, stockMinimo: 500 } },
    },
  });
  const materiaPPC = await prisma.materiaPrima.create({
    data: {
      nombre: "Polipropileno Virgen-Clarificado",
      codigoInterno: "PVC1",
      tipo: "POLIPROPILENO", // AJUSTA si tu enum TipoMaterial usa otro literal
      proveedor: "Braskem",
      unidadMedida: "KILOGRAMO",
      costoUnitario: 30,
      inventarioVirgen: { create: { cantidadActual: 2000, stockMinimo: 500 } },
    },
  });

  const materiaPS = await prisma.materiaPrima.create({
    data: {
      nombre: "Poliestireno Virgen",
      codigoInterno: "PSV1",
      tipo: "POLIESTIRENO",
      proveedor: "INEOS",
      unidadMedida: "KILOGRAMO",
      costoUnitario: 30,
      inventarioVirgen: { create: { cantidadActual: 1000, stockMinimo: 300 } },
    },
  });

  const materiaPE = await prisma.materiaPrima.create({
    data: {
      nombre: "Polietileno",
      codigoInterno: "PE1",
      tipo: "POLIETILENO",
      proveedor: "INEOS",
      unidadMedida: "KILOGRAMO",
      costoUnitario: 30,
      inventarioVirgen: { create: { cantidadActual: 1000, stockMinimo: 300 } },
    },
  });

  console.log(`  ${materiaPP.nombre} (id ${materiaPP.id}), ${materiaPS.nombre} (id ${materiaPS.id})\n`);

  // ---------------------------------------------------------------------
  // 3. COLORES SÓLIDOS
  // ---------------------------------------------------------------------
  console.log("Creando colores sólidos...");

  const nombresColores = ["Rojo", "Azul", "Verde", "Amarillo", "Naranja", "Morado"];
  const colores: Record<string, { id: bigint }> = {};

  for (const nombre of nombresColores) {
    colores[nombre] = await prisma.colorSolido.create({ data: { nombre } });
  }

  console.log(`  ${nombresColores.join(", ")}\n`);

  // ---------------------------------------------------------------------
  // 4. PIGMENTOS (unos cuantos, con dosis reales de tu hoja de fórmulas)
  // ---------------------------------------------------------------------
  console.log("Creando pigmentos...");

  const pigmentoAmarilloPP = await prisma.pigmento.create({
    data: {
      color: "Amarillo",
      categoriaColor: "SOLIDO", // AJUSTA según tu enum CategoriaColorPigmento
      tipo: "MASTER",
      dosisGrPorKg: 21,
      tipoMaterial: "POLIPROPILENO",
      inventario: { create: { cantidadActual: 80, stockMinimo: 10 } },
    },
  });

  const pigmentoAzulPP = await prisma.pigmento.create({
    data: {
      color: "Azul",
      categoriaColor: "SOLIDO_PASTEL",
      tipo: "MASTER",
      dosisGrPorKg: 14,
      tipoMaterial: "POLIPROPILENO",
      inventario: { create: { cantidadActual: 80, stockMinimo: 10 } },
    },
  });

  const pigmentoRosalPP = await prisma.pigmento.create({
    data: {
      color: "Rosal",
      categoriaColor: "JARRA_NEON_PASTEL",
      tipo: "MASTER",
      dosisGrPorKg: 8,
      tipoMaterial: "POLIPROPILENO",
      inventario: { create: { cantidadActual: 80, stockMinimo: 10 } },
    },
  });

  const pigmentoVerdePP = await prisma.pigmento.create({
    data: {
      color: "Verde",
      categoriaColor: "NEON_TRASLUCIDO",
      tipo: "MASTER",
      dosisGrPorKg: 2,
      tipoMaterial: "POLIPROPILENO",
      inventario: { create: { cantidadActual: 80, stockMinimo: 10 } },
    },
  });

  const pigmentoNaturalPP = await prisma.pigmento.create({
    data: {
      color: "Natural",
      categoriaColor: "NATURAL", // AJUSTA si tu enum usa otro literal para "natural"
      tipo: "MASTER",
      dosisGrPorKg: 0,
      tipoMaterial: "POLIPROPILENO",
      inventario: { create: { cantidadActual: 0, stockMinimo: 0 } },
    },
  });

  const pigmentoNaranjaPS = await prisma.pigmento.create({
    data: {
      color: "Naranja",
      categoriaColor: "NEON_TRASLUCIDO", 
      tipo: "POLVO",
      dosisGrPorKg: 0,
      tipoMaterial: "POLIESTIRENO",
      inventario: { create: { cantidadActual: 80, stockMinimo: 10 } },
    },
  });

  const pigmentoMoradoPS = await prisma.pigmento.create({
    data: {
      color: "Morado",
      categoriaColor: "NEON_TRASLUCIDO", 
      tipo: "POLVO",
      dosisGrPorKg: 0,
      tipoMaterial: "POLIESTIRENO",
      inventario: { create: { cantidadActual: 80, stockMinimo: 10 } },
    },
  });

  const pigmentoNaturalPS = await prisma.pigmento.create({
    data: {
      color: "Natural",
      categoriaColor: "NATURAL", // AJUSTA si tu enum usa otro literal para "natural"
      tipo: "POLVO",
      dosisGrPorKg: 0,
      tipoMaterial: "POLIESTIRENO",
      inventario: { create: { cantidadActual: 0, stockMinimo: 0 } },
    },
  });

  const pigmentoNaturalPL = await prisma.pigmento.create({
    data: {
      color: "Natural",
      categoriaColor: "NATURAL", // AJUSTA si tu enum usa otro literal para "natural"
      tipo: "POLVO",
      dosisGrPorKg: 0,
      tipoMaterial: "POLIETILENO",
      inventario: { create: { cantidadActual: 0, stockMinimo: 0 } },
    },
  });

  console.log(`  Pigmentos de cada categoria y natural\n`);

  // ---------------------------------------------------------------------
  // 5. MÁQUINAS
  // ---------------------------------------------------------------------
  console.log("Creando máquinas...");

  const maquina1 = await prisma.maquina.create({
    data: {
      nombre: "TX 268T",
      codigo: "TX268T",
      numero: 1,
      tipoProceso: "INYECCION",
      capacidadTon: 268,
      estado: "ACTIVA",
    },
  });

  const maquina2 = await prisma.maquina.create({
    data: {
      nombre: "TX 368T",
      codigo: "TX368T",
      numero: 2,
      tipoProceso: "INYECCION",
      capacidadTon: 368,
      estado: "ACTIVA",
    },
  });

  const maquina3 = await prisma.maquina.create({
    data: {
      nombre: "TX 468T",
      codigo: "TX468T",
      numero: 3,
      tipoProceso: "INYECCION",
      capacidadTon: 468,
      estado: "ACTIVA",
    },
  });

  console.log(`  ${maquina1.nombre} (id ${maquina1.id})\n`);
  console.log(`  ${maquina2.nombre} (id ${maquina2.id})\n`);
  console.log(`  ${maquina3.nombre} (id ${maquina3.id})\n`);

  // ---------------------------------------------------------------------
  // 6. PRODUCTOS
  // ---------------------------------------------------------------------
  console.log("Creando productos...");

  const productoBatidor = await prisma.producto.create({
    data: {
      nombre: "Batidor",
      codigo: "07503025176529",
      tipo: "Batidor",
      tipoMaterial: "POLIPROPILENO",
      cavidades: 1,
      ciclo: 28,
      peso: 185,
      precio: 3,
      piezasPorEmpaque: 100,
      descripcion: "No. 2"
    },
  });

  const productoBote = await prisma.producto.create({
    data: {
      nombre: "Bote",
      codigo: "07503025176525",
      tipo: "Bote",
      tipoMaterial: "POLIESTIRENO",
      cavidades: 1,
      ciclo: 28,
      peso: 185,
      precio: 3,
      piezasPorEmpaque: 100,
      descripcion: "Lechero 5 litros"
    },
  });

  const productoCharola = await prisma.producto.create({
    data: {
      nombre: "Charola",
      codigo: "07503025176383",
      tipo: "Charola",
      tipoMaterial: "POLIETILENO",
      cavidades: 1,
      ciclo: 28,
      peso: 185,
      precio: 3,
      piezasPorEmpaque: 100,
      descripcion: "Estrella cristal"
    },
  });

  console.log(`  ${productoBatidor.nombre} (id ${productoBatidor.id})\n`);
  console.log(`  ${productoBote.nombre} (id ${productoBote.id})\n`);
  console.log(`  ${productoCharola.nombre} (id ${productoCharola.id})\n`);

  // ---------------------------------------------------------------------
  // 7. MOTIVOS DE PARO (con categoría y el caso "Otro")
  // ---------------------------------------------------------------------
  console.log("Creando motivos de paro...");

  // AJUSTA los literales de "categoria" según tu enum CategoriaMotivoParo real
  await prisma.motivoParo.createMany({
    data: [
      { nombre: "Cambio de color", categoria: "MATERIAL" },
      { nombre: "Maquina no prendio", categoria: "INICIO" },
      { nombre: "Falla de máquina", categoria: "MAQUINA" },
      { nombre: "Cambio de molde", categoria: "MOLDE" },
      { nombre: "Falta de personal", categoria: "OTROS" },
    ],
  });

  console.log(`  5 motivos creados\n`);

  // ---------------------------------------------------------------------
  // 8. DEFECTOS DE PRODUCTO
  // ---------------------------------------------------------------------
  console.log("Creando defectos de producto...");

  await prisma.defectoProducto.createMany({
    data: [
      { nombre: "Pieza mal rebabeada" },
      { nombre: "Pieza aplastada" },
      { nombre: "Pieza con burbuja" },
      { nombre: "Pieza con tono diferente" },
    ],
  });

  console.log(`  4 defectos creados\n`);

  // ---------------------------------------------------------------------
  // 9. OPERADORES
  // ---------------------------------------------------------------------
  console.log("Creando operadores...");

  await prisma.operador.createMany({
    data: [
        { nombre: "Pedro Gómez" }, 
        { nombre: "María López" },
        { nombre: "Esmeralda Díaz" },
    ],
  });

  console.log(`  3 operadores creados\n`);

  // ---------------------------------------------------------------------
  // 10. TIPOS DE MOLIDO (catálogo casi estático)
  // ---------------------------------------------------------------------
  console.log("Creando tipos de molido...");

  await prisma.tipoMolido.createMany({
    data: [
      { tipoMaterial: "POLIPROPILENO", origen: "COMPRADO", codigoInterno: "PMC1" },
      { tipoMaterial: "POLIPROPILENO", origen: "INTERNO", codigoInterno: "PMCF2" },
      { tipoMaterial: "POLIESTIRENO", origen: "INTERNO", codigoInterno: "PSMF2" },
    ],
  });

  console.log(`  3 tipos de molido creados\n`);

  // ---------------------------------------------------------------------
  // 11. PEDIDO + PEDIDO DETALLE (uno de cliente real, uno de STOCK)
  // ---------------------------------------------------------------------
  console.log("Creando pedidos...");

  const pedidoCliente = await prisma.pedido.create({
    data: {
      numeroPedido: "PED-2026-001",
      cliente: "Comercializadora del Valle",
      descripcion: "Pedido de prueba para Batidor",
      estado: "PENDIENTE",
    },
  });

  const detalleAmarillo = await prisma.pedidoDetalle.create({
    data: {
      pedidoId: pedidoCliente.id,
      productoId: productoBatidor.id,
      pigmentoId: pigmentoAmarilloPP.id,
      cantidadSolicitada: 500,
    },
  });

  const pedidoStock = await prisma.pedido.create({
    data: {
      numeroPedido: "PED-2026-STOCK",
      cliente: "STOCK",
      descripcion: "Producción genérica sin cliente específico",
      estado: "PENDIENTE",
    },
  });

  const detalleStockAzul = await prisma.pedidoDetalle.create({
    data: {
      pedidoId: pedidoStock.id,
      productoId: productoBatidor.id,
      pigmentoId: pigmentoAzulPP.id,
      cantidadSolicitada: 1000,
    },
  });

  console.log(`  PED-2026-001 (Comercializadora del Valle) y PED-2026-STOCK creados\n`);

  // ---------------------------------------------------------------------
  // RESUMEN FINAL — ids útiles para armar tus pruebas .http
  // ---------------------------------------------------------------------
  console.log("========================================");
  console.log("SEED COMPLETO — ids de referencia rápida:");
  console.log("========================================");
  console.log(`Usuarios:        admin01 / supervisor01 / molino01 / pigmentos01`);
  console.log(`MateriaPrima:    PP=${materiaPP.id}  PS=${materiaPS.id}`);
  console.log(`Pigmentos:       Amarillo PP=${pigmentoAmarilloPP.id}  Rojo PP=${pigmentoAzulPP.id}  Natural PP=${pigmentoNaturalPP.id}`);
  console.log(`Máquina:         TX268T=${maquina1.id}`);
  console.log(`Producto:        Batidor=${productoBatidor.id}`);
  console.log(`Colores:         ${Object.entries(colores).map(([n, c]) => `${n}=${c.id}`).join("  ")}`);
  console.log(`Pedido cliente:  id=${pedidoCliente.id}  detalle(amarillo)=${detalleAmarillo.id}`);
  console.log(`Pedido STOCK:    id=${pedidoStock.id}  detalle(azul)=${detalleStockAzul.id}`);
  console.log("========================================\n");

  console.log("Con esto ya puedes:");
  console.log("  - Crear órdenes usando pedidoDetalleId de arriba");
  console.log("  - Registrar avances de turno sobre esas órdenes");
  console.log("  - Probar entrada de proveedor / ajuste manual con los materiaPrimaId y pigmentoId de arriba");
  console.log("  - Probar salida de producto contra el pedido de STOCK o el de cliente");
}

main()
  .then(async () => {
    console.log("\nSeed finalizado correctamente.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error al correr el seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });