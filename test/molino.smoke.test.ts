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
  crearIncidenciaDePrueba,
  confirmarAvanceMolinoDePrueba,
  confirmarIncidenciaMolinoDePrueba,
  crearMoliendaDePrueba,
  type CatalogosBase,
} from "./helpers/fixtures.js";

describe("Molino — confirmación de recepción y registro de moliendas", () => {
  let app: ReturnType<typeof buildApp>;
  let adminAgent: ReturnType<typeof supertest.agent>;
  let supervisorAgent: ReturnType<typeof supertest.agent>;
  let molinoAgent: ReturnType<typeof supertest.agent>;
  let catalogos: CatalogosBase;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    adminAgent = supertest.agent(app.server);
    supervisorAgent = supertest.agent(app.server);
    molinoAgent = supertest.agent(app.server);

    await adminAgent.post("/auth/login").send({ usuario: "admin01", password: "Test1234!" });
    await supervisorAgent.post("/auth/login").send({ usuario: "supervisor01", password: "Test1234!" });
    await molinoAgent.post("/auth/login").send({ usuario: "molino01", password: "Test1234!" });

    catalogos = await obtenerCatalogosBase(adminAgent);
  });

  afterAll(async () => {
    await app.close();
  });

  async function prepararOrdenActiva(totalPiezas = 50) {
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

    return orden;
  }

  // ---------- Confirmar recepción de avance ----------

  describe("Confirmar recepción de avance de turno", () => {
    it("confirma sin diferencia cuando lo recibido coincide con lo reportado", async () => {
      const orden = await prepararOrdenActiva();
      const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);
      const avanceCerrado = await cerrarAvanceDePrueba(supervisorAgent, avance.id, catalogos.operadorId, {
        piezasBuenas: 50,
        piezasDefectuosas: 0,
        kgMerma: 3,
        kgPlasta: 2,
        piezasCambioColor: 0,
      });

      const confirmado = await confirmarAvanceMolinoDePrueba(molinoAgent, avanceCerrado.id, {
        kgMermaRecibida: 3,
        kgPlastaRecibida: 2,
        piezasMalasRecibidas: 0,
        piezasCambioColorRecibidas: 0,
      });

      expect(confirmado.confirmacionMolinoConfirmado).toBe(true);
      expect(confirmado.confirmacionMolinoHayDiferencia).toBe(false);
    });

    it("reporta diferencia cuando lo recibido NO coincide con lo reportado", async () => {
      const orden = await prepararOrdenActiva();
      const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);
      const avanceCerrado = await cerrarAvanceDePrueba(supervisorAgent, avance.id, catalogos.operadorId, {
        piezasBuenas: 50,
        piezasDefectuosas: 0,
        kgMerma: 3,
        kgPlasta: 2,
        piezasCambioColor: 0,
      });

      const confirmado = await confirmarAvanceMolinoDePrueba(molinoAgent, avanceCerrado.id, {
        kgMermaRecibida: 5, // distinto a lo reportado (3)
        kgPlastaRecibida: 2,
        piezasMalasRecibidas: 0,
        piezasCambioColorRecibidas: 0,
      });

      expect(confirmado.confirmacionMolinoConfirmado).toBe(true);
      expect(confirmado.confirmacionMolinoHayDiferencia).toBe(true);
    });
  });

  // ---------- Confirmar recepción de incidencia ----------

  describe("Confirmar recepción de incidencia de material mal pigmentado", () => {
    it("confirma sin diferencia cuando las piezas recibidas coinciden", async () => {
      const orden = await prepararOrdenActiva();
      const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);
      const incidencia = await crearIncidenciaDePrueba(supervisorAgent, avance.id, {
        piezasAfectadas: 15,
        destino: "MOLINO",
      });

      const confirmada = await confirmarIncidenciaMolinoDePrueba(molinoAgent, incidencia.id, 15);

      expect(confirmada.confirmadoMolino).toBe(true);
      expect(confirmada.hayDiferenciaMolino).toBe(false);
    });

    it("reporta diferencia cuando las piezas recibidas NO coinciden", async () => {
      const orden = await prepararOrdenActiva();
      const avance = await crearAvanceDePrueba(supervisorAgent, orden.id);
      const incidencia = await crearIncidenciaDePrueba(supervisorAgent, avance.id, {
        piezasAfectadas: 15,
        destino: "MOLINO",
      });

      const confirmada = await confirmarIncidenciaMolinoDePrueba(molinoAgent, incidencia.id, 12);

      expect(confirmada.confirmadoMolino).toBe(true);
      expect(confirmada.hayDiferenciaMolino).toBe(true);
    });
  });

  // ---------- Registrar molienda ----------

  describe("Registrar molienda", () => {
    it("crea una molienda combinando un avance y una incidencia del mismo tipo de material", async () => {
      const orden1 = await prepararOrdenActiva();
      const avance1 = await crearAvanceDePrueba(supervisorAgent, orden1.id);
      const avanceCerrado1 = await cerrarAvanceDePrueba(supervisorAgent, avance1.id, catalogos.operadorId, {
        piezasBuenas: 50,
        piezasDefectuosas: 0,
        kgMerma: 3,
        kgPlasta: 0,
      });
      await confirmarAvanceMolinoDePrueba(molinoAgent, avanceCerrado1.id, {
        kgMermaRecibida: 3,
        kgPlastaRecibida: 0,
        piezasMalasRecibidas: 0,
        piezasCambioColorRecibidas: 0,
      });

      const orden2 = await prepararOrdenActiva();
      const avance2 = await crearAvanceDePrueba(supervisorAgent, orden2.id);
      const incidencia = await crearIncidenciaDePrueba(supervisorAgent, avance2.id, {
        piezasAfectadas: 10,
        destino: "MOLINO",
      });
      await confirmarIncidenciaMolinoDePrueba(molinoAgent, incidencia.id, 10);

      const molienda = await crearMoliendaDePrueba(molinoAgent, {
        tipoMaterial: catalogos.tipoMaterial,
        colorSolidoId: catalogos.colorSolidoId, 
        kgIngresados: 5,
        fecha: new Date().toISOString().substring(0, 10),
        avanceTurnoIds: [avanceCerrado1.id],
        incidenciaIds: [incidencia.id],
      });

      expect(molienda.id).toBeDefined();
      expect(molienda.tipoMaterial).toBe(catalogos.tipoMaterial);
    }, 30000);

  it("NO permite crear una molienda mezclando tipos de material distintos", async () => {
    // Buscamos un segundo tipo de material completo (materia prima + pigmento + producto compatibles)
    const materiasPrimas = await adminAgent.get("/materias-primas");
    const otraMateriaPrima = materiasPrimas.body.find(
      (m: any) => m.activo && m.tipo !== catalogos.tipoMaterial
    );

    if (!otraMateriaPrima) {
      console.warn("Se omite: no hay un segundo tipo de material en el seed para probar la mezcla inválida");
      return;
    }

    const pigmentos = await adminAgent.get("/pigmentos");
    const otroPigmento = pigmentos.body.find(
      (p: any) => p.activo && p.tipoMaterial === otraMateriaPrima.tipo && p.colorSolidoId !== null
    );

    const productos = await adminAgent.get("/productos");
    const otroProducto = productos.body.find(
      (p: any) => p.activo && p.tipoMaterial === otraMateriaPrima.tipo
    );

    if (!otroPigmento || !otroProducto) {
      console.warn("Se omite: el segundo tipo de material no tiene pigmento/producto compatibles completos");
      return;
    }

    // Preparamos una orden completa con el SEGUNDO tipo de material
    const pedido2 = await crearPedidoDePrueba(adminAgent);
    const pedidoConLinea2 = await agregarLineaDePrueba(adminAgent, pedido2.id, {
      productoId: otroProducto.id,
      cantidadSolicitada: 50,
    });
    const linea2 = pedidoConLinea2.detalle.at(-1);

    const orden2 = await crearOrdenDePrueba(adminAgent, {
      tipoMaterial: "VIRGEN",
      folio: `OP-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pedidoDetalleId: linea2.id,
      productoId: otroProducto.id,
      materiaPrimaId: otraMateriaPrima.id,
      pigmentoId: otroPigmento.id,
      maquinaId: catalogos.maquinaId,
      totalPiezas: 50,
    });
    await activarOrdenDePrueba(adminAgent, orden2.id);

    const avance2 = await crearAvanceDePrueba(supervisorAgent, orden2.id);
    const avanceCerrado2 = await cerrarAvanceDePrueba(supervisorAgent, avance2.id, catalogos.operadorId, {
      piezasBuenas: 50,
      piezasDefectuosas: 0,
      kgMerma: 3,
      kgPlasta: 0,
    });
    await confirmarAvanceMolinoDePrueba(molinoAgent, avanceCerrado2.id, {
      kgMermaRecibida: 3,
      kgPlastaRecibida: 0,
      piezasMalasRecibidas: 0,
      piezasCambioColorRecibidas: 0,
    });

    // Preparamos también un avance del PRIMER tipo de material (el que ya usa "catalogos")
    const orden1 = await prepararOrdenActiva();
    const avance1 = await crearAvanceDePrueba(supervisorAgent, orden1.id);
    const avanceCerrado1 = await cerrarAvanceDePrueba(supervisorAgent, avance1.id, catalogos.operadorId, {
      piezasBuenas: 50,
      piezasDefectuosas: 0,
      kgMerma: 3,
      kgPlasta: 0,
    });
    await confirmarAvanceMolinoDePrueba(molinoAgent, avanceCerrado1.id, {
      kgMermaRecibida: 3,
      kgPlastaRecibida: 0,
      piezasMalasRecibidas: 0,
      piezasCambioColorRecibidas: 0,
    });

    // Intentamos crear una molienda mezclando AMBOS tipos de material — debe fallar
    const response = await molinoAgent.post("/moliendas").send({
      tipoMaterial: catalogos.tipoMaterial,
      colorSolidoId: catalogos.colorSolidoId,
      kgIngresados: 6,
      fecha: new Date().toISOString().substring(0, 10),
      avanceTurnoIds: [avanceCerrado1.id, avanceCerrado2.id], // mezcla de dos tipos distintos
      incidenciaIds: [],
    });

    expect(response.status).toBe(409);
  }, 30000); // timeout extendido, ya que este test encadena dos flujos completos de orden+avance
  });
});