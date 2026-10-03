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
  type CatalogosBase,
} from "./helpers/fixtures.js";

describe("Pedidos — ciclo de vida", () => {
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

  // ---------- Helper local para no repetir la creación de pedido+línea+orden en cada test ----------
  async function crearPedidoConOrden() {
    const pedido = await crearPedidoDePrueba(adminAgent);
    const pedidoConLinea = await agregarLineaDePrueba(adminAgent, pedido.id, {
      productoId: catalogos.productoId,
      cantidadSolicitada: 50,
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
      totalPiezas: 50,
    });

    return { pedido, orden };
  }

  it("crea un pedido en estado PENDIENTE", async () => {
    const pedido = await crearPedidoDePrueba(adminAgent);
    expect(pedido.estado).toBe("PENDIENTE");
    expect(pedido.numeroPedido).toBeDefined();
  });

  it("permite editar el cliente de un pedido", async () => {
    const pedido = await crearPedidoDePrueba(adminAgent);

    const response = await adminAgent
      .patch(`/pedidos/${pedido.id}`)
      .send({ cliente: "Cliente editado" });

    expect(response.status).toBe(200);
    expect(response.body.cliente).toBe("Cliente editado");
  });

  it("cancela un pedido sin órdenes, sin problema", async () => {
    const pedido = await crearPedidoDePrueba(adminAgent);

    const response = await adminAgent
      .patch(`/pedidos/${pedido.id}/cancelar`)
      .send({ motivo: "Prueba de cancelación simple" });

    expect(response.status).toBe(200);
  });

  it("NO permite crear una orden nueva sobre un pedido ya cancelado", async () => {
    const pedido = await crearPedidoDePrueba(adminAgent);
    const pedidoConLinea = await agregarLineaDePrueba(adminAgent, pedido.id, {
      productoId: catalogos.productoId,
      cantidadSolicitada: 50,
    });
    const linea = pedidoConLinea.detalle.at(-1);

    await adminAgent.patch(`/pedidos/${pedido.id}/cancelar`).send({ motivo: "Prueba" });

    const response = await adminAgent.post("/ordenes").send({
      tipoMaterial: "VIRGEN",
      folio: `OP-TEST-${Date.now()}`,
      pedidoDetalleId: linea.id,
      productoId: catalogos.productoId,
      materiaPrimaId: catalogos.materiaPrimaId,
      pigmentoId: catalogos.pigmentoId,
      maquinaId: catalogos.maquinaId,
      totalPiezas: 50,
    });

    expect(response.status).toBe(409); // PEDIDO_NO_DISPONIBLE_PARA_ORDENES
  });

  it("cancela exitosamente un pedido cuyas órdenes están en BORRADOR/ACTIVA (cascada)", async () => {
    const { pedido, orden } = await crearPedidoConOrden();
    await activarOrdenDePrueba(adminAgent, orden.id); // la deja en ACTIVA, no en progreso

    const response = await adminAgent
      .patch(`/pedidos/${pedido.id}/cancelar`)
      .send({ motivo: "Prueba de cascada exitosa" });

    expect(response.status).toBe(200);

    // Confirmamos que la orden también quedó cancelada por la cascada
    const ordenActualizada = await adminAgent.get(`/ordenes/${orden.id}`);
    expect(ordenActualizada.body.estado).toBe("CANCELADA");
  });

  it("NO permite cancelar un pedido que tiene una orden EN_PROGRESO", async () => {
    const { pedido, orden } = await crearPedidoConOrden();
    await activarOrdenDePrueba(adminAgent, orden.id);

    // Un avance abierto lleva la orden de ACTIVA a EN_PROGRESO
    await crearAvanceDePrueba(supervisorAgent, orden.id);

    const response = await adminAgent
      .patch(`/pedidos/${pedido.id}/cancelar`)
      .send({ motivo: "Prueba de bloqueo" });

    expect(response.status).toBe(409); // PEDIDO_CON_ORDENES_EN_PROGRESO
  });
});