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
  registrarSalidaProductoDePrueba,
  registrarSalidaProductoCruda,
  type CatalogosBase,
} from "./helpers/fixtures.js";

describe("Salida de producto — venta directa y entrega de pedido", () => {
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

  // ---------- Helper local: genera stock real de producto terminado ----------
  async function generarStockDeProducto(piezas: number) {
    const pedido = await crearPedidoDePrueba(adminAgent);
    const pedidoConLinea = await agregarLineaDePrueba(adminAgent, pedido.id, {
      productoId: catalogos.productoId,
      cantidadSolicitada: piezas,
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
      totalPiezas: piezas,
    });
    await activarOrdenDePrueba(adminAgent, orden.id);

    const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);
    await cerrarAvanceDePrueba(supervisorAgent, avance.id, catalogos.operadorId, {
      piezasBuenas: piezas,
      piezasDefectuosas: 0,
    });

    return { pedido, linea };
  }

  // ---------- Venta directa ----------

  describe("Venta directa", () => {
    it("registra una salida por venta directa, descontando el inventario", async () => {
      await generarStockDeProducto(30);

      const inventarioAntes = await adminAgent.get("/inventario/productos");
      const itemAntes = inventarioAntes.body.find(
        (i: any) => i.productoId === catalogos.productoId && i.pigmentoId === catalogos.pigmentoId
      );
      const cantidadAntes = itemAntes.cantidadActual;

      await registrarSalidaProductoDePrueba(adminAgent, {
        motivo: "VENTA",
        items: [{ productoId: catalogos.productoId, pigmentoId: catalogos.pigmentoId, cantidad: 10 }],
      });

      const inventarioDespues = await adminAgent.get("/inventario/productos");
      const itemDespues = inventarioDespues.body.find(
        (i: any) => i.productoId === catalogos.productoId && i.pigmentoId === catalogos.pigmentoId
      );

      expect(itemDespues.cantidadActual).toBe(cantidadAntes - 10);
    });

    it("NO permite registrar una venta directa sin stock suficiente", async () => {
      const response = await registrarSalidaProductoCruda(adminAgent, {
        motivo: "VENTA",
        items: [{ productoId: catalogos.productoId, pigmentoId: catalogos.pigmentoId, cantidad: 999999 }],
      });

      expect(response.status).toBe(409);
    });
  });

  // ---------- Entrega de pedido ----------

  describe("Entrega de pedido", () => {
    it("registra una entrega de pedido correctamente, descontando inventario e incrementando cantidadEntregada", async () => {
      const { pedido, linea } = await generarStockDeProducto(30);

      await registrarSalidaProductoDePrueba(adminAgent, {
        motivo: "ENTREGA_PEDIDO",
        pedidoId: pedido.id,
        items: [{ productoId: catalogos.productoId, pigmentoId: catalogos.pigmentoId, cantidad: 20 }],
      });

      const pedidoActualizado = await adminAgent.get(`/pedidos/${pedido.id}`);
      const lineaActualizada = pedidoActualizado.body.detalle.find((d: any) => d.id === linea.id);

      expect(lineaActualizada.cantidadEntregada).toBe(20);
    });

    it("NO permite entregar un producto que no pertenece al pedido", async () => {
    const { pedido } = await generarStockDeProducto(30);

    const productos = await adminAgent.get("/productos");
    const otroProducto = productos.body.find(
        (p: any) => p.activo && p.id !== catalogos.productoId
    );

    if (!otroProducto) {
        console.warn("Se omite: no hay un segundo producto en el seed");
        return;
    }

    const response = await registrarSalidaProductoCruda(adminAgent, {
        motivo: "ENTREGA_PEDIDO",
        pedidoId: pedido.id,
        items: [{ productoId: otroProducto.id, pigmentoId: catalogos.pigmentoId, cantidad: 5 }],
    });

    expect(response.status).toBe(409);
    });

    it("NO permite entregar más cantidad de la solicitada en la línea del pedido", async () => {
      const { pedido } = await generarStockDeProducto(30);

      const response = await registrarSalidaProductoCruda(adminAgent, {
        motivo: "ENTREGA_PEDIDO",
        pedidoId: pedido.id,
        items: [{ productoId: catalogos.productoId, pigmentoId: catalogos.pigmentoId, cantidad: 999 }],
      });

      expect(response.status).toBe(409);
    });
  });
});