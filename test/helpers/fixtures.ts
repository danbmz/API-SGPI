import type TestAgent from "supertest/lib/agent.js";

// ---------- Catálogos base ----------

export interface CatalogosBase {
  materiaPrimaId: string;
  tipoMaterial: string;
  pigmentoId: string;
  colorSolidoId: string;
  productoId: string;
  maquinaId: string;
  operadorId: string;
}

export async function obtenerCatalogosBase(agent: TestAgent): Promise<CatalogosBase> {
  const materiasPrimas = await agent.get("/materias-primas");
  const materiaPrima = materiasPrimas.body.find((m: any) => m.activo);
  if (!materiaPrima) throw new Error("No hay materia prima activa disponible para pruebas");

  const pigmentos = await agent.get("/pigmentos");
  const pigmento = pigmentos.body.find(
    (p: any) => p.activo && p.tipoMaterial === materiaPrima.tipo && p.colorSolidoId !== null
  );
  if (!pigmento) throw new Error("No hay pigmento activo compatible con colorSolido disponible para pruebas");

  const productos = await agent.get("/productos");
  const producto = productos.body.find(
    (p: any) => p.activo && p.tipoMaterial === materiaPrima.tipo
  );
  if (!producto) throw new Error("No hay producto activo compatible disponible para pruebas");

  const maquinas = await agent.get("/maquinas");
  const maquina = maquinas.body.find((m: any) => m.estado === "ACTIVA");
  if (!maquina) throw new Error("No hay máquina activa disponible para pruebas");

  const operadores = await agent.get("/operadores");
  const operador = operadores.body.find((o: any) => o.activo);
  if (!operador) throw new Error("No hay operador activo disponible para pruebas");

  return {
    materiaPrimaId: materiaPrima.id,
    tipoMaterial: materiaPrima.tipo,
    pigmentoId: pigmento.id,
    colorSolidoId: pigmento.colorSolidoId, 
    productoId: producto.id,
    maquinaId: maquina.id,
    operadorId: operador.id,
  };
}

// ---------- Pedidos ----------

export async function crearPedidoDePrueba(agent: TestAgent, overrides: Record<string, unknown> = {}) {
  const response = await agent.post("/pedidos").send({
    numeroPedido: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    cliente: "Cliente de prueba",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`No se pudo crear pedido de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function agregarLineaDePrueba(
  agent: TestAgent,
  pedidoId: string,
  datos: { productoId: string; pigmentoId?: string; cantidadSolicitada: number }
) {
  const response = await agent.post(`/pedidos/${pedidoId}/detalle`).send(datos);
  if (response.status !== 201) {
    throw new Error(`No se pudo agregar línea de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body; // pedido completo, con la nueva línea incluida
}

// ---------- Órdenes ----------

export async function crearOrdenDePrueba(agent: TestAgent, datos: Record<string, unknown>) {
  const response = await agent.post("/ordenes").send(datos);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear orden de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function activarOrdenDePrueba(agent: TestAgent, ordenId: string) {
  const response = await agent.patch(`/ordenes/${ordenId}/activar`).send({});
  if (response.status !== 200) {
    throw new Error(`No se pudo activar orden de prueba: ${JSON.stringify(response.body)}`);
  }
  const ordenActualizada = await agent.get(`/ordenes/${ordenId}`);
  return ordenActualizada.body;
}

export async function pausarOrdenDePrueba(agent: TestAgent, ordenId: string) {
  const response = await agent.patch(`/ordenes/${ordenId}/pausar`).send({});
  if (response.status !== 200) {
    throw new Error(`No se pudo pausar orden de prueba: ${JSON.stringify(response.body)}`);
  }
  const ordenActualizada = await agent.get(`/ordenes/${ordenId}`);
  return ordenActualizada.body;
}

export async function reanudarOrdenDePrueba(agent: TestAgent, ordenId: string) {
  const response = await agent.patch(`/ordenes/${ordenId}/reanudar`).send({});
  if (response.status !== 200) {
    throw new Error(`No se pudo reanudar orden de prueba: ${JSON.stringify(response.body)}`);
  }
  const ordenActualizada = await agent.get(`/ordenes/${ordenId}`);
  return ordenActualizada.body;
}

// Versión "cruda" para casos donde SÍ esperamos que falle (sin lanzar error)
export async function crearOrdenCruda(agent: TestAgent, datos: Record<string, unknown>) {
  return agent.post("/ordenes").send(datos);
}

// ---------- Avances de turno ----------

export async function crearAvanceDePrueba(agent: TestAgent, ordenId: string) {
  const response = await agent.post("/avances-turno").send({
    ordenId,
    turno: "MANANA",
    fecha: new Date().toISOString().substring(0, 10),
    horaInicio: new Date().toISOString(),
  });
  if (response.status !== 201) {
    throw new Error(`No se pudo crear avance de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function cerrarAvanceDePrueba(
  agent: TestAgent,
  avanceId: string,
  operadorId: string,
  overrides: Record<string, unknown> = {}
) {
  const response = await agent.patch(`/avances-turno/${avanceId}/cerrar`).send({
    horaFin: new Date().toISOString(),
    piezasBuenas: 90,
    piezasDefectuosas: 10,
    kgMerma: 2,
    kgPlasta: 1,
    operadorId,
    cicloReal: 30,
    materialKG: 50,
    ...overrides,
  });
  if (response.status !== 200) {
    throw new Error(`No se pudo cerrar avance de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function obtenerOrdenDePrueba(agent: TestAgent, ordenId: string) {
  const response = await agent.get(`/ordenes/${ordenId}`);
  if (response.status !== 200) {
    throw new Error(`No se pudo obtener orden de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function obtenerPedidoDePrueba(agent: TestAgent, pedidoId: string) {
  const response = await agent.get(`/pedidos/${pedidoId}`);
  if (response.status !== 200) {
    throw new Error(`No se pudo obtener pedido de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

// ---------- Solicitudes de material ----------

export async function crearSolicitudMaterialDePrueba(
  agent: TestAgent,
  avanceTurnoId: string,
  datos: { tipoMaterial: "VIRGEN" | "MOLIDO"; kgSolicitados: number; motivo?: string }
) {
  const response = await agent.post(`/avances-turno/${avanceTurnoId}/solicitudes-material`).send(datos);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear solicitud de material: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function confirmarSolicitudMaterialDePrueba(agent: TestAgent, solicitudId: string) {
  const response = await agent.patch(`/solicitudes-material/${solicitudId}/confirmar`).send({});
  if (response.status !== 200) {
    throw new Error(`No se pudo confirmar solicitud de material: ${JSON.stringify(response.body)}`);
  }

  const todasLasSolicitudes = await agent.get("/solicitudes-material");
  const solicitudConfirmada = todasLasSolicitudes.body.find((s: any) => s.id === solicitudId);

  if (!solicitudConfirmada) {
    throw new Error(`No se encontró la solicitud ${solicitudId} en el listado después de confirmarla`);
  }

  return solicitudConfirmada;
}

export async function confirmarMaterialDePrueba(agent: TestAgent, ordenId: string) {
  const response = await agent.patch(`/ordenes/${ordenId}/confirmar-material`).send({});
  if (response.status !== 200) {
    throw new Error(`No se pudo confirmar material de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

// ---------- Incidencias de material mal pigmentado ----------

export async function crearIncidenciaDePrueba(
  agent: TestAgent,
  avanceTurnoId: string,
  datos: { piezasAfectadas: number; destino: "STOCK" | "MOLINO" }
) {
  const response = await agent.post(`/avances-turno/${avanceTurnoId}/incidencia-mal-pigmentado`).send(datos);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear incidencia: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function resolverIncidenciaDePrueba(
  agent: TestAgent,
  incidenciaId: string,
  datos: Record<string, unknown> = {}
) {
  const response = await agent.patch(`/incidencias-mal-pigmentado/${incidenciaId}/resolver`).send(datos);
  if (response.status !== 200) {
    throw new Error(`No se pudo resolver incidencia: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

// ---------- Confirmar sobrante ----------

export async function confirmarSobranteDePrueba(
  agent: TestAgent,
  avanceTurnoId: string,
  confirmado: boolean
) {
  const response = await agent.patch(`/avances-turno/${avanceTurnoId}/confirmar-sobrante`).send({ confirmado });
  if (response.status !== 200) {
    throw new Error(`No se pudo confirmar sobrante: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

// ---------- Entrada de proveedor y ajuste manual ----------

export async function registrarEntradaProveedorDePrueba(agent: TestAgent, datos: Record<string, unknown>) {
  const response = await agent.post("/inventario/entrada-proveedor").send(datos);
  if (response.status !== 200) {
    throw new Error(`No se pudo registrar entrada de proveedor: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function registrarAjusteManualDePrueba(agent: TestAgent, datos: Record<string, unknown>) {
  const response = await agent.post("/inventario/ajuste-manual").send(datos);
  if (response.status !== 200) {
    throw new Error(`No se pudo registrar ajuste manual: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

// ---------- Molino ----------

export async function confirmarAvanceMolinoDePrueba(
  agent: TestAgent,
  avanceTurnoId: string,
  datos: {
    kgMermaRecibida: number;
    kgPlastaRecibida: number;
    piezasMalasRecibidas: number;
    piezasCambioColorRecibidas: number;
  }
) {
  const response = await agent.patch(`/avances-turno/${avanceTurnoId}/confirmar-molino`).send(datos);
  if (response.status !== 200) {
    throw new Error(`No se pudo confirmar avance en molino: ${JSON.stringify(response.body)}`);
  }

  const todosLosAvances = await agent.get("/avances-turno");
  const avanceConfirmado = todosLosAvances.body.find((a: any) => a.id === avanceTurnoId);
  if (!avanceConfirmado) {
    throw new Error(`No se encontró el avance ${avanceTurnoId} tras confirmarlo en molino`);
  }
  return avanceConfirmado;
}

export async function confirmarIncidenciaMolinoDePrueba(
  agent: TestAgent,
  incidenciaId: string,
  piezasRecibidas: number
) {
  const response = await agent
    .patch(`/incidencias-mal-pigmentado/${incidenciaId}/confirmar-molino`)
    .send({ piezasRecibidas });
  if (response.status !== 200) {
    throw new Error(`No se pudo confirmar incidencia en molino: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function crearMoliendaDePrueba(agent: TestAgent, datos: Record<string, unknown>) {
  const response = await agent.post("/moliendas").send(datos);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear molienda de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

// ---------- Salida de producto ----------

export async function registrarSalidaProductoDePrueba(agent: TestAgent, datos: Record<string, unknown>) {
  const response = await agent.post("/inventario/salida-producto").send(datos);
  if (response.status !== 200) {
    throw new Error(`No se pudo registrar salida de producto: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

// Versión "cruda", para casos donde esperamos que falle
export async function registrarSalidaProductoCruda(agent: TestAgent, datos: Record<string, unknown>) {
  return agent.post("/inventario/salida-producto").send(datos);
}