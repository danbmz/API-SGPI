// Seed completo para poblar la base de datos con datos base de prueba.
// Pensado para correr UNA VEZ sobre una base recién reseteada (db push).
//
// Ejecutar con: npx prisma db seed

import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("Sembrando datos base...");

  // ---------- Usuarios ----------
  const passwordHash = await argon2.hash("Test1234!");

  const usuariosData = [
    { nombre: "Admin Prueba", usuario: "admin01", role: "ADMIN" as const },
    { nombre: "Supervisor Prueba", usuario: "supervisor01", role: "SUPERVISOR" as const },
    { nombre: "Molino Prueba", usuario: "molino01", role: "MOLINO" as const },
    { nombre: "Pigmentos Prueba", usuario: "pigmentos01", role: "PIGMENTOS" as const },
    { nombre: "Programador Prueba", usuario: "programador01", role: "PROGRAMADOR" as const },
  ];
  for (const u of usuariosData) {
    await prisma.usuario.upsert({
      where: { usuario: u.usuario },
      update: {},
      create: { ...u, password: passwordHash },
    });
  }
  console.log(`✔ ${usuariosData.length} usuarios listos`);

  // ---------- Colores sólidos ----------
  const nombresColores = ["Natural", "Rojo", "Azul"];
  const coloresSolidos = [];
  for (const nombre of nombresColores) {
    const color = await prisma.colorSolido.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    coloresSolidos.push(color);
  }
  console.log(`✔ ${coloresSolidos.length} colores sólidos listos`);

  // ---------- Materias primas (una por cada tipo de material) ----------
  const materiasPrimasData = [
    { codigoInterno: "MP-001", nombre: "Polipropileno Virgen", tipo: "POLIPROPILENO" as const },
    { codigoInterno: "MP-002", nombre: "Poliestireno Virgen", tipo: "POLIESTIRENO" as const },
    { codigoInterno: "MP-003", nombre: "Polietileno Virgen", tipo: "POLIETILENO" as const },
  ];
  const materiasPrimas = [];
  for (const mp of materiasPrimasData) {
    const materiaPrima = await prisma.materiaPrima.upsert({
      where: { codigoInterno: mp.codigoInterno },
      update: {},
      create: {
        nombre: mp.nombre,
        codigoInterno: mp.codigoInterno,
        tipo: mp.tipo,
        proveedor: "Proveedor de Prueba",
        unidadMedida: "KILOGRAMO",
        costoUnitario: 30,
      },
    });
    await prisma.inventarioMateriaPrima.upsert({
      where: { materiaPrimaId: materiaPrima.id },
      update: {},
      create: { materiaPrimaId: materiaPrima.id, cantidadActual: 5000, stockMinimo: 200 },
    });
    materiasPrimas.push(materiaPrima);
  }
  console.log(`✔ ${materiasPrimas.length} materias primas e inventarios listos`);

  // ---------- Pigmentos (uno por cada tipo de material, con su color sólido) ----------
  const pigmentosData = [
    { tipoMaterial: "POLIPROPILENO" as const, color: "Rojo", colorSolido: coloresSolidos[1] },
    { tipoMaterial: "POLIESTIRENO" as const, color: "Azul", colorSolido: coloresSolidos[2] },
    { tipoMaterial: "POLIETILENO" as const, color: "Natural", colorSolido: coloresSolidos[0] },
  ];
  const pigmentos = [];
  for (const p of pigmentosData) {
    const pigmento = await prisma.pigmento.upsert({
      where: {
        tipoMaterial_color_categoriaColor_tipo: {
          tipoMaterial: p.tipoMaterial,
          color: p.color,
          categoriaColor: "SOLIDO",
          tipo: "MASTER",
        },
      },
      update: {},
      create: {
        color: p.color,
        categoriaColor: "SOLIDO",
        tipo: "MASTER",
        dosisGrPorKg: 15,
        costoUnitario: 80,
        tipoMaterial: p.tipoMaterial,
        colorSolidoId: p.colorSolido === undefined ? null : p.colorSolido.id,
      },
    });
    await prisma.inventarioPigmento.upsert({
      where: { pigmentoId: pigmento.id },
      update: {},
      create: { pigmentoId: pigmento.id, cantidadActual: 100, stockMinimo: 10 },
    });
    pigmentos.push(pigmento);
  }
  console.log(`✔ ${pigmentos.length} pigmentos e inventarios listos`);

  // ---------- Productos (uno por cada tipo de material) ----------
  const productosData = [
    { codigo: "0750000000001", nombre: "Jarra 2L", tipoMaterial: "POLIPROPILENO" as const },
    { codigo: "0750000000002", nombre: "Vaso Desechable", tipoMaterial: "POLIESTIRENO" as const },
    { codigo: "0750000000003", nombre: "Bolsa Industrial", tipoMaterial: "POLIETILENO" as const },
  ];
  const productos = [];
  for (const p of productosData) {
    const producto = await prisma.producto.upsert({
      where: { codigo: p.codigo },
      update: {},
      create: {
        nombre: p.nombre,
        codigo: p.codigo,
        tipo: "Prueba",
        tipoMaterial: p.tipoMaterial,
        piezasPorEmpaque: 20,
        descripcion: "Producto de prueba para tests",
        cavidades: 4,
        ciclo: 25,
        peso: 45.5,
        precio: 12.5,
      },
    });
    productos.push(producto);
  }
  console.log(`✔ ${productos.length} productos listos`);

  // ---------- Máquinas (2 activas, 1 en mantenimiento) ----------
  const maquinasData = [
    { codigo: "MAQ-001", numero: 1, estado: "ACTIVA" as const },
    { codigo: "MAQ-002", numero: 2, estado: "ACTIVA" as const },
    { codigo: "MAQ-003", numero: 3, estado: "MANTENIMIENTO" as const },
  ];
  for (const m of maquinasData) {
    await prisma.maquina.upsert({
      where: { codigo: m.codigo },
      update: {},
      create: {
        nombre: `Inyectora ${m.numero}`,
        codigo: m.codigo,
        numero: m.numero,
        tipoProceso: "INYECCION",
        capacidadTon: 150,
        estado: m.estado,
      },
    });
  }
  console.log(`✔ ${maquinasData.length} máquinas listas`);

  // ---------- Operadores (sin campo único, usamos findFirst para idempotencia) ----------
  const nombresOperadores = ["Operador Uno", "Operador Dos", "Operador Tres"];
  for (const nombre of nombresOperadores) {
    const existente = await prisma.operador.findFirst({ where: { nombre } });
    if (!existente) {
      await prisma.operador.create({ data: { nombre } });
    }
  }
  console.log(`✔ ${nombresOperadores.length} operadores listos`);

  // ---------- Motivos de paro ----------
  const motivosParoData = [
    { nombre: "Falta de material", categoria: "MATERIAL" as const },
    { nombre: "Cambio de molde", categoria: "MOLDE" as const },
    { nombre: "Falla de máquina", categoria: "MAQUINA" as const },
  ];
  for (const m of motivosParoData) {
    await prisma.motivoParo.upsert({
      where: { nombre: m.nombre },
      update: {},
      create: m,
    });
  }
  console.log(`✔ ${motivosParoData.length} motivos de paro listos`);

  // ---------- Defectos de producto ----------
  const nombresDefectos = ["Rebaba", "Pieza incompleta", "Rechupe"];
  for (const nombre of nombresDefectos) {
    await prisma.defectoProducto.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log(`✔ ${nombresDefectos.length} defectos de producto listos`);

  // ---------- Inventario de molido (uno por materia prima, origen interno) ----------
  for (let i = 0; i < materiasPrimas.length; i++) {
    await prisma.inventarioMolido.upsert({
      where: {
        tipoMaterial_origen_colorSolidoId: {
          tipoMaterial: materiasPrimas[i]!.tipo,
          origen: "INTERNO",
          colorSolidoId: coloresSolidos[i]!.id,
        },
      },
      update: {},
      create: {
        tipoMaterial: materiasPrimas[i]!.tipo,
        origen: "INTERNO",
        colorSolidoId: coloresSolidos[i]!.id,
        cantidadActual: 300,
      },
    });
  }
  console.log(`✔ ${materiasPrimas.length} registros de inventario de molido listos`);

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });