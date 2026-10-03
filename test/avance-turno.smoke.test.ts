import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/app.js";
import {
  obtenerCatalogosBase,
  crearPedidoDePrueba,
  agregarLineaDePrueba,
  crearOrdenDePrueba,
  activarOrdenDePrueba,
  crearAvanceDePrueba,
  cerrarAvanceDePrueba,
  obtenerOrdenDePrueba,
  obtenerPedidoDePrueba,
  type CatalogosBase,
} from "./helpers/fixtures.js";

describe("Avances de turno — ciclo de vida y efectos en cascada", () => {
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

  async function prepararOrdenActiva(totalPiezas = 100) {
    const pedido = await crearPedidoDePrueba(adminAgent);
    const pedidoConLinea = await agregarLineaDePrueba(adminAgent, pedido.id, {
      productoId: catalogos.productoId,
      cantidadSolicitada: totalPiezas,
    });
    const linea = pedidoConLinea.detalle.at(-1);

    const orden = await crearOrdenDePrueba(adminAgent, {
      tipoMaterial: "VIRGEN",
      folio: `OP-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pedidoDetalleId: linea.id,
      productoId: catalogos.productoId,
      materiaPrimaId: catalogos.materiaPrimaId,
      pigmentoId: catalogos.pigmentoId,
      maquinaId: catalogos.maquinaId,
      totalPiezas,
    });
    await activarOrdenDePrueba(adminAgent, orden.id);

    return { pedido, linea, orden };
  }

  it("el supervisor abre un avance sobre una orden ACTIVA, y la orden pasa a EN_PROGRESO", async () => {
    const { orden } = await prepararOrdenActiva();

    const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);
    expect(avance.estado).toBe("ABIERTO");

    const ordenActualizada = await obtenerOrdenDePrueba(adminAgent, orden.id);
    expect(ordenActualizada.estado).toBe("EN_PROGRESO");
  });

  it("NO permite abrir un segundo avance sobre la misma orden mientras el primero sigue abierto", async () => {
    const { orden } = await prepararOrdenActiva();
    await crearAvanceDePrueba(supervisorAgent, orden.id);

    const response = await supervisorAgent.post("/avances-turno").send({
      ordenId: orden.id,
      turno: "TARDE",
      fecha: new Date().toISOString().substring(0, 10),
      horaInicio: new Date().toISOString(),
    });

    expect(response.status).toBe(409);
  });

  it("cierra un avance con producción parcial — la orden sigue EN_PROGRESO, no se completa", async () => {
    const { orden } = await prepararOrdenActiva(100);
    const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);

    await cerrarAvanceDePrueba(supervisorAgent, avance.id, catalogos.operadorId, {
      piezasBuenas: 50,
      piezasDefectuosas: 5,
    });

    const ordenActualizada = await obtenerOrdenDePrueba(adminAgent, orden.id);
    expect(ordenActualizada.estado).toBe("EN_PROGRESO");
  });

  it("al completar el total de piezas, la orden pasa a COMPLETADA y el pedido refleja la producción", async () => {
    const { pedido, linea, orden } = await prepararOrdenActiva(50);
    const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);

    await cerrarAvanceDePrueba(supervisorAgent, avance.id, catalogos.operadorId, {
      piezasBuenas: 50,
      piezasDefectuosas: 0,
    });

    const ordenActualizada = await obtenerOrdenDePrueba(adminAgent, orden.id);
    expect(ordenActualizada.estado).toBe("COMPLETADA");

    const pedidoActualizado = await obtenerPedidoDePrueba(adminAgent, pedido.id);
    const lineaActualizada = pedidoActualizado.detalle.find((d: any) => d.id === linea.id);
    expect(lineaActualizada.cantidadProducida).toBe(50);
  });

  it("el inventario de producto terminado aumenta tras cerrar el avance", async () => {
    const { orden } = await prepararOrdenActiva(30);
    const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);

    const inventarioAntes = await adminAgent.get("/inventario/productos");
    const itemAntes = inventarioAntes.body.find(
      (i: any) => i.productoId === catalogos.productoId && i.pigmentoId === catalogos.pigmentoId
    );
    const cantidadAntes = itemAntes ? itemAntes.cantidadActual : 0;

    await cerrarAvanceDePrueba(supervisorAgent, avance.id, catalogos.operadorId, {
      piezasBuenas: 30,
      piezasDefectuosas: 0,
    });

    const inventarioDespues = await adminAgent.get("/inventario/productos");
    const itemDespues = inventarioDespues.body.find(
      (i: any) => i.productoId === catalogos.productoId && i.pigmentoId === catalogos.pigmentoId
    );

    expect(itemDespues.cantidadActual).toBe(cantidadAntes + 30);
  });
});