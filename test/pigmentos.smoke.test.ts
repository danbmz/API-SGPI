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
  confirmarMaterialDePrueba,
  obtenerOrdenDePrueba,
  crearSolicitudMaterialDePrueba,
  confirmarSolicitudMaterialDePrueba,
  crearIncidenciaDePrueba,
  resolverIncidenciaDePrueba,
  confirmarSobranteDePrueba,
  registrarEntradaProveedorDePrueba,
  registrarAjusteManualDePrueba,
  type CatalogosBase,
} from "./helpers/fixtures.js";

describe("Pigmentos — flujo completo de trabajo", () => {
  let app: ReturnType<typeof buildApp>;
  let adminAgent: ReturnType<typeof supertest.agent>;
  let supervisorAgent: ReturnType<typeof supertest.agent>;
  let pigmentosAgent: ReturnType<typeof supertest.agent>;
  let catalogos: CatalogosBase;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    adminAgent = supertest.agent(app.server);
    supervisorAgent = supertest.agent(app.server);
    pigmentosAgent = supertest.agent(app.server);

    await adminAgent.post("/auth/login").send({ usuario: "admin01", password: "Test1234!" });
    await supervisorAgent.post("/auth/login").send({ usuario: "supervisor01", password: "Test1234!" });
    await pigmentosAgent.post("/auth/login").send({ usuario: "pigmentos01", password: "Test1234!" });

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

    return { pedido, orden };
  }

  // ---------- Sustituir material pigmentado ----------

  describe("Sustituir material pigmentado", () => {
    it("genera un sobrante pigmentado real y lo usa para sustituir en una orden distinta", async () => {
        // 1. Generamos el sobrante: una orden que reporta kgSobrante de tipo VIRGEN
        const { orden: ordenOrigen } = await prepararOrdenActiva(50);
        const avanceOrigen = await crearAvanceDePrueba(supervisorAgent, ordenOrigen.id);
        await cerrarAvanceDePrueba(supervisorAgent, avanceOrigen.id, catalogos.operadorId, {
        piezasBuenas: 50,
        piezasDefectuosas: 0,
        kgSobrante: 10,
        tipoMaterialSobrante: "VIRGEN",
        });

        // 2. Pigmentos confirma el sobrante — esto es lo que genera la entrada real a
        //    CombinacionMaterialPigmentado / InventarioMaterialPigmentado
        await confirmarSobranteDePrueba(pigmentosAgent, avanceOrigen.id, true);

        // 3. Buscamos la combinación de material pigmentado recién generada
        const inventarioMaterialPigmentado = await adminAgent.get("/inventario/material-pigmentado");
        const combinacion = inventarioMaterialPigmentado.body.find(
        (c: any) =>
            c.materiaPrimaId === catalogos.materiaPrimaId &&
            c.pigmentoId === catalogos.pigmentoId &&
            c.cantidadActual > 0
        );
        expect(combinacion).toBeDefined();

        // 4. Creamos una SEGUNDA orden (distinta), activa, para sustituir su material
        const { orden: ordenDestino } = await prepararOrdenActiva(50);

        // 5. Pigmentos sustituye el material virgen de la orden destino por el pigmentado disponible
        const response = await pigmentosAgent
        .patch(`/ordenes/${ordenDestino.id}/sustituir-material-pigmentado`)
        .send({
            combinacionMaterialPigmentadoId: combinacion.combinacionId,
            kgSustituidos: 1,
        });

        console.log("RESPUESTA SUSTITUIR:", JSON.stringify(response.body));
        expect(response.status).toBe(200);

        const ordenActualizada = await obtenerOrdenDePrueba(adminAgent, ordenDestino.id);
        expect(ordenActualizada.materialPigmentadoUsadoKg).toBe(1);
    }, 20000);

    it("NO permite sustituir material pigmentado en una orden que ya confirmó su material", async () => {
        const { orden } = await prepararOrdenActiva();
        await confirmarMaterialDePrueba(pigmentosAgent, orden.id);

        const response = await pigmentosAgent
        .patch(`/ordenes/${orden.id}/sustituir-material-pigmentado`)
        .send({
            combinacionMaterialPigmentadoId: "1", // cualquier ID, el bloqueo debe ocurrir antes de validar esto
            kgSustituidos: 5,
        });

        expect(response.status).toBe(409);
    });
  });

  // ---------- Confirmar material ----------

  describe("Confirmar material de orden", () => {
    it("el encargado de pigmentos confirma el material de una orden ACTIVA", async () => {
      const { orden } = await prepararOrdenActiva();

      const response = await pigmentosAgent.patch(`/ordenes/${orden.id}/confirmar-material`).send({});
      expect(response.status).toBe(200);

      const ordenActualizada = await obtenerOrdenDePrueba(adminAgent, orden.id);
      expect(ordenActualizada.materialSiguienteConfirmado).toBe(true);
    });

    it("NO permite confirmar material dos veces sobre la misma orden", async () => {
      const { orden } = await prepararOrdenActiva();
      await confirmarMaterialDePrueba(pigmentosAgent, orden.id);

      const response = await pigmentosAgent.patch(`/ordenes/${orden.id}/confirmar-material`).send({});
      expect(response.status).toBe(409);
    });

    it("ADMIN no puede confirmar material", async () => {
      const { orden } = await prepararOrdenActiva();

      const response = await adminAgent.patch(`/ordenes/${orden.id}/confirmar-material`).send({});
      expect(response.status).toBe(403);
    });
  });

  // ---------- Confirmar sobrante ----------

  describe("Confirmar sobrante de avance de turno", () => {
    async function prepararAvanceConSobrante(kgSobrante: number, tipoMaterialSobrante: "VIRGEN" | "MOLIDO" = "VIRGEN") {
      const { orden } = await prepararOrdenActiva(50);
      const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);
      const avanceCerrado = await cerrarAvanceDePrueba(supervisorAgent, avance.id, catalogos.operadorId, {
        piezasBuenas: 50,
        piezasDefectuosas: 0,
        kgSobrante,
        tipoMaterialSobrante,
      });
      return avanceCerrado;
    }

    it("confirma correctamente el sobrante reportado por el supervisor (sin diferencia)", async () => {
      const avance = await prepararAvanceConSobrante(5);

      const response = await pigmentosAgent
        .patch(`/avances-turno/${avance.id}/confirmar-sobrante`)
        .send({ confirmado: true });

      expect(response.status).toBe(200);
    });

    it("permite reportar una diferencia en el sobrante recibido", async () => {
      const avance = await prepararAvanceConSobrante(5);

      const response = await pigmentosAgent
        .patch(`/avances-turno/${avance.id}/confirmar-sobrante`)
        .send({ confirmado: false });

      expect(response.status).toBe(200);
    }, 20000);
  });

  // ---------- Solicitudes de material ----------

  describe("Atender solicitudes de material", () => {
    it("confirma una solicitud de material extra solicitada por el supervisor", async () => {
      const { orden } = await prepararOrdenActiva();
      const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);

      const solicitud = await crearSolicitudMaterialDePrueba(supervisorAgent, avance.id, {
        tipoMaterial: "VIRGEN",
        kgSolicitados: 10,
        motivo: "Merma mayor a la esperada",
      });
      expect(solicitud.confirmado).toBe(false);

      const confirmada = await confirmarSolicitudMaterialDePrueba(pigmentosAgent, solicitud.id);
      expect(confirmada.confirmado).toBe(true);
    }, 20000);
  });

  // ---------- Incidencias de material mal pigmentado ----------

  describe("Resolver incidencias de material mal pigmentado", () => {
    it("resuelve una incidencia con destino STOCK, agregando material virgen", async () => {
      const { orden } = await prepararOrdenActiva();
      const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);

      const incidencia = await crearIncidenciaDePrueba(supervisorAgent, avance.id, {
        piezasAfectadas: 20,
        destino: "STOCK",
      });
      expect(incidencia.resuelto).toBe(false);

      const resuelta = await resolverIncidenciaDePrueba(pigmentosAgent, incidencia.id, {
        tipoMaterialAgregado: "VIRGEN",
        kgMaterialAgregado: 2,
        gramosPigmentoAgregado: 30,
      });
      expect(resuelta.resuelto).toBe(true);
    }, 20000);
  });

  // ---------- Entrada de proveedor y ajuste manual ----------

  describe("Entrada de proveedor y ajustes manuales de inventario", () => {
    it("registra una entrada de proveedor de materia prima, aumentando el stock", async () => {
      const inventarioAntes = await adminAgent.get("/inventario/materias-primas");
      const itemAntes = inventarioAntes.body.find((i: any) => i.materiaPrimaId === catalogos.materiaPrimaId);
      const cantidadAntes = itemAntes.cantidadActual;

      await registrarEntradaProveedorDePrueba(pigmentosAgent, {
        tipoInventario: "MATERIA_PRIMA",
        materiaPrimaId: catalogos.materiaPrimaId,
        cantidad: 100,
      });

      const inventarioDespues = await adminAgent.get("/inventario/materias-primas");
      const itemDespues = inventarioDespues.body.find((i: any) => i.materiaPrimaId === catalogos.materiaPrimaId);

      expect(itemDespues.cantidadActual).toBe(cantidadAntes + 100);
    });

    it("registra un ajuste manual de pigmento, modificando el stock según la diferencia", async () => {
      const inventarioAntes = await adminAgent.get("/inventario/pigmentos");
      const itemAntes = inventarioAntes.body.find((i: any) => i.pigmentoId === catalogos.pigmentoId);
      const cantidadAntes = itemAntes.cantidadActual;

      await registrarAjusteManualDePrueba(pigmentosAgent, {
        tipoInventario: "PIGMENTO",
        pigmentoId: catalogos.pigmentoId,
        diferencia: -5,
        descripcion: "Conteo físico — faltante detectado",
      });

      const inventarioDespues = await adminAgent.get("/inventario/pigmentos");
      const itemDespues = inventarioDespues.body.find((i: any) => i.pigmentoId === catalogos.pigmentoId);

      expect(itemDespues.cantidadActual).toBe(cantidadAntes - 5);
    });
  });
});