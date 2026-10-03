import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/app.js";
import {
  obtenerCatalogosBase,
  crearPedidoDePrueba,
  agregarLineaDePrueba,
  crearOrdenDePrueba,
  crearOrdenCruda,
  activarOrdenDePrueba,
  pausarOrdenDePrueba,
  reanudarOrdenDePrueba,
  crearAvanceDePrueba,
  type CatalogosBase,
} from "./helpers/fixtures.js";

describe("Órdenes — ciclo de vida", () => {
  let app: ReturnType<typeof buildApp>;
  let adminAgent: ReturnType<typeof supertest.agent>;
  let supervisorAgent: ReturnType<typeof supertest.agent>;
  let catalogos: CatalogosBase;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    adminAgent = supertest.agent(app.server);
    supervisorAgent = supertest.agent(app.server);

    await adminAgent.post("/auth/login").send({ usuario: "admin01", password: "Test1234!" });
    await supervisorAgent.post("/auth/login").send({ usuario: "supervisor01", password: "Test1234!" });

    catalogos = await obtenerCatalogosBase(adminAgent);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------- Helper local: prepara pedido + línea, regresa el pedidoDetalleId ----------
  async function prepararLineaDePedido() {
    const pedido = await crearPedidoDePrueba(adminAgent);
    const pedidoConLinea = await agregarLineaDePrueba(adminAgent, pedido.id, {
      productoId: catalogos.productoId,
      cantidadSolicitada: 100,
    });
    const linea = pedidoConLinea.detalle.at(-1);
    return { pedido, linea };
  }

  function datosOrdenBase(pedidoDetalleId: string, overrides: Record<string, unknown> = {}) {
    return {
      tipoMaterial: "VIRGEN",
      folio: `OP-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pedidoDetalleId,
      productoId: catalogos.productoId,
      materiaPrimaId: catalogos.materiaPrimaId,
      pigmentoId: catalogos.pigmentoId,
      maquinaId: catalogos.maquinaId,
      totalPiezas: 100,
      ...overrides,
    };
  }

  it("crea una orden VIRGEN en estado BORRADOR", async () => {
    const { linea } = await prepararLineaDePedido();
    const orden = await crearOrdenDePrueba(adminAgent, datosOrdenBase(linea.id));

    expect(orden.estado).toBe("BORRADOR");
    expect(orden.tipoMaterial).toBe("VIRGEN");
  });

  it("NO permite crear una orden con materia prima de tipo distinto al producto", async () => {
    const { linea } = await prepararLineaDePedido();

    // Buscamos una materia prima de tipo DISTINTO a la del producto, si existe en el seed
    const materiasPrimas = await adminAgent.get("/materias-primas");
    const otraMateriaPrima = materiasPrimas.body.find(
      (m: any) => m.activo && m.tipo !== catalogos.tipoMaterial
    );

    if (!otraMateriaPrima) {
      // Si el seed solo tiene un tipo de material, no podemos probar este caso — lo marcamos explícito
      console.warn("Se omite: no hay una segunda materia prima de tipo distinto en el seed");
      return;
    }

    const response = await crearOrdenCruda(
      adminAgent,
      datosOrdenBase(linea.id, { materiaPrimaId: otraMateriaPrima.id })
    );

    expect(response.status).toBe(409);
  });

  it("NO permite crear una orden sobre una máquina en MANTENIMIENTO", async () => {
    const { linea } = await prepararLineaDePedido();

    const maquinas = await adminAgent.get("/maquinas");
    const maquinaInactiva = maquinas.body.find((m: any) => m.estado !== "ACTIVA");

    if (!maquinaInactiva) {
      console.warn("Se omite: no hay máquina inactiva/en mantenimiento en el seed");
      return;
    }

    const response = await crearOrdenCruda(
      adminAgent,
      datosOrdenBase(linea.id, { maquinaId: maquinaInactiva.id })
    );

    expect(response.status).toBe(409);
  });

  it("activa una orden en BORRADOR", async () => {
    const { linea } = await prepararLineaDePedido();
    const orden = await crearOrdenDePrueba(adminAgent, datosOrdenBase(linea.id));

    const activada = await activarOrdenDePrueba(adminAgent, orden.id);
    expect(activada.estado).toBe("ACTIVA");
  });

  it("pausa una orden ACTIVA", async () => {
    const { linea } = await prepararLineaDePedido();
    const orden = await crearOrdenDePrueba(adminAgent, datosOrdenBase(linea.id));
    await activarOrdenDePrueba(adminAgent, orden.id);

    const pausada = await pausarOrdenDePrueba(adminAgent, orden.id);
    expect(pausada.estado).toBe("PAUSADA");
  });

  it("reanuda una orden PAUSADA sin avances previos, regresa a ACTIVA", async () => {
    const { linea } = await prepararLineaDePedido();
    const orden = await crearOrdenDePrueba(adminAgent, datosOrdenBase(linea.id));
    await activarOrdenDePrueba(adminAgent, orden.id);
    await pausarOrdenDePrueba(adminAgent, orden.id);

    const reanudada = await reanudarOrdenDePrueba(adminAgent, orden.id);
    expect(reanudada.estado).toBe("ACTIVA");
  });

  it("reanuda una orden PAUSADA que ya tuvo un avance, regresa a EN_PROGRESO", async () => {
    const { linea } = await prepararLineaDePedido();
    const orden = await crearOrdenDePrueba(adminAgent, datosOrdenBase(linea.id));
    await activarOrdenDePrueba(adminAgent, orden.id);

    // Un avance abierto lleva la orden a EN_PROGRESO
    await crearAvanceDePrueba(supervisorAgent, orden.id);

    await pausarOrdenDePrueba(adminAgent, orden.id);
    const reanudada = await reanudarOrdenDePrueba(adminAgent, orden.id);

    expect(reanudada.estado).toBe("EN_PROGRESO");
  });

  it("cancela una orden en BORRADOR sin problema", async () => {
    const { linea } = await prepararLineaDePedido();
    const orden = await crearOrdenDePrueba(adminAgent, datosOrdenBase(linea.id));

    const response = await adminAgent
      .patch(`/ordenes/${orden.id}/cancelar`)
      .send({ motivo: "Prueba de cancelación" });

    expect(response.status).toBe(200);
  });

  it("NO permite cancelar una orden EN_PROGRESO", async () => {
    const { linea } = await prepararLineaDePedido();
    const orden = await crearOrdenDePrueba(adminAgent, datosOrdenBase(linea.id));
    await activarOrdenDePrueba(adminAgent, orden.id);
    await crearAvanceDePrueba(supervisorAgent, orden.id);

    const response = await adminAgent
      .patch(`/ordenes/${orden.id}/cancelar`)
      .send({ motivo: "Prueba de bloqueo" });

    expect(response.status).toBe(409);
  });
});