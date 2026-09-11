import type { FastifyReply } from "fastify";

export const ERROR_HTTP_MAP: Record<string, { code: number; message: string }> = {
  USUARIO_NO_ENCONTRADO: { code: 404, message: "Usuario no encontrado" },
  USUARIO_YA_INACTIVO: { code: 409, message: "El usuario ya está desactivado" },
  USUARIO_YA_ACTIVO: { code: 409, message: "El usuario ya está activo" },
  USUARIO_YA_EXISTE: { code: 409, message: "Ese nombre de usuario ya está en uso" },
  NO_PUEDES_DESACTIVARTE_A_TI_MISMO: { code: 409, message: "No puedes desactivar tu propia cuenta" },
  NO_PUEDE_QUEDAR_SIN_ADMIN_ACTIVO: { code: 409, message: "Debe existir al menos un administrador activo" },
  //   ERRORES MATERIA PRIMA
  MATERIA_PRIMA_NO_ENCONTRADA: { code: 404, message: "Materia prima no encontrada"},
  MATERIA_PRIMA_YA_EXISTE : { code: 409, message: "Materia prima ya registrada"},
  MATERIA_PRIMA_YA_INACTIVA: { code: 409, message: "La materia prima ya está desactivada" },
  MATERIA_PRIMA_YA_ACTIVA: { code: 409, message: "La materia prima ya está activa"},
  // ERRORES PIGMENTOS
  PIGMENTO_NO_ENCONTRADO: { code: 404, message: "Pigmento no encontrado"},
  PIGMENTO_YA_EXISTE: { code: 409, message: "El pigmento ya existe"},
  PIGMENTO_YA_INACTIVO: { code: 409, message: "El pigmento ya está desactivado"},
  PIGMENTO_YA_ACTIVO:{code: 409, message: "El pigmento ya está activo"},
  PIGMENTO_SIN_COLOR_SOLIDO_ASIGNADO: {code: 409, message: "Pigmento sin color sólido asignado"},

  // ERRORES PRODUCTOS
  PRODUCTO_NO_ENCONTRADO: {code: 404, message: "Producto no encontrado"}, 
  PRODUCTO_YA_EXISTE: { code: 409, message: "Producto ya registrado"},
  PRODUCTO_YA_INACTIVO: {code: 409, message: "El producto ya está desactivado"}, 
  PRODUCTO_YA_ACTIVO: {code: 409, message: "El producto ya está activo"},
  // ERRORES MAQUINAS
  MAQUINA_NO_ENCONTRADA: {code: 404, message: "Maquina no encontrada"},
  MAQUINA_YA_EXISTE: {code: 409, message: "Maquina ya registrada"},
  MAQUINA_NUMERO_YA_EXISTE: {code: 409, message: "Ya existe una maquina con el mismo número"}, 
  MAQUINA_YA_EN_ESE_ESTADO: {code: 409, message: "La maquina ya está en ese estado"},
  // ERRORES MOTIVOS PARO
  MOTIVO_PARO_NO_ENCONTRADO: {code: 404, message: "Motivo no encontrado"},
  MOTIVO_PARO_YA_EXISTE: {code: 409, message: "Este motivo ya existe"},
  MOTIVO_PARO_INACTIVO: {code: 409, message: "Este motivo se encuentra desactivado"},
  MOTIVO_PARO_YA_INACTIVO: {code: 409, message: "El motivo ya está desactivado"},
  MOTIVO_PARO_YA_ACTIVO: {code: 409, message: "El motivo ya está activo"},
  // ERRORES COLORES SOLIDOS
  COLOR_SOLIDO_NO_ENCONTRADO: {code: 404, message: "Color no encontrado"},
  COLOR_SOLIDO_YA_EXISTE: {code: 409, message: "Este color ya existe"},
  COLOR_SOLIDO_YA_INACTIVO: {code: 409, message: "El color ya está desactivado"},
  COLOR_SOLIDO_YA_ACTIVO: {code: 409, message: "El color ya está activo"},
  // ERRORES ORDENES
  ORDEN_NO_ENCONTRADA: {code: 404, message: "Orden no encontrada"},
  ORDEN_FOLIO_YA_EXISTE: {code: 409, message: "El folio ya existe"},
  STOCK_INSUFICIENTE_MATERIA_PRIMA: {code: 409, message: "No hay suficiente material para completar esta orden"},
  STOCK_INSUFICIENTE_PIGMENTO: {code: 409, message: "No hay suficiente pigmento para completar esta orden"},
  STOCK_INSUFICIENTE_MOLIDO: {code: 409, message: "No hay suficiente molido para completar esta orden"},
  MATERIAL_YA_CONFIRMADO: {code: 409, message: "El material ya ha sido confirmado"},
  ORDEN_NO_SE_PUEDE_ACTIVAR: {code: 409, message: "La orden ya está activa"},
  ORDEN_NO_SE_PUEDE_PAUSAR: {code: 409, message: "La orden no se puede pausar"},
  ORDEN_NO_SE_PUEDE_REANUDAR: {code: 409, message: "La orden no se puede reanudar"},
  ORDEN_NO_SE_PUEDE_CANCELAR: {code: 409, message: "La orden no se puede cancelar"},
  CANCELACION_EN_PROGRESO_NO_DISPONIBLE: {code: 409, message: "No puedes cancelar una orden ya iniciada"},
  MATERIAL_INCOMPATIBLE_CON_PRODUCTO: {code: 409, message: "Materia prima incompatible con el producto"},
  PIGMENTO_INCOMPATIBLE_CON_MATERIAL: {code: 409, message: "Pigmento incompatible con materia prima"},
  MOLIDO_INCOMPATIBLE_CON_MATERIAL: { code: 409, message: "El molido debe ser del mismo tipo que la materia prima"},
  MOLIDO_INCOMPATIBLE_CON_COLOR_PIGMENTO: {code: 409, message: "El molido no es compatible con el color que indica el pedido"},
  PRODUCTO_NO_COINCIDE_CON_DETALLE: { code: 409, message: "El producto elegido no coincide con el definido en el detalle del pedido"},
  PIGMENTO_NO_COINCIDE_CON_DETALLE: { code: 409, message: "El pigmento seleccionado no coincide con el definido en el detalle del pedido"},
  ORDEN_NO_ACTIVA_PARA_SUSTITUCION: {code: 409, message: "Orden no activa"},
  ORDEN_YA_TIENE_SUSTITUCION: {code: 409, message: "Ya sustituiste material en esta orden"},
  COMBINACION_MATERIAL_PIGMENTADO_NO_ENCONTRADA: {code: 409, message: "No hay material pigmentado para sustituir en esta orden"},
  COMBINACION_INCOMPATIBLE_CON_ORDEN: {code: 409, message: "El material pigmentado debe ser el mismo que va usar la orden"},
  SUSTITUCION_EXCEDE_VIRGEN_REQUERIDO: {code: 409, message: "No puedes agregar mas kilos de los requeridos"},
  STOCK_INSUFICIENTE_MATERIAL_PIGMENTADO: {code: 409, message: "No hay suficiente material pigmentado para realizar esta acción"},
  // ERRORES EN AVANCES DE TURNO
  AVANCE_TURNO_NO_ENCONTRADO: {code: 404, message: "Avance no encontrado"},
  ORDEN_NO_DISPONIBLE_PARA_AVANCE: {code: 409, message: "No puedes abrir avance de esta orden"},
  AVANCE_TURNO_NO_PROPIO: {code: 409, message: "No puedes modificar avances que no creaste"},
  AVANCE_TURNO_YA_CERRADO: {code: 409, message: "No puedes modificar una avance cerrado"},
  AVANCE_TURNO_NO_CERRADO: {code: 409, message: "El avance aún no está cerrado"},
  AVANCE_TURNO_YA_CONFIRMADO_MOLINO: {code: 409, message: "Este avance ya ha sido confirmado"},
  AVANCE_TURNO_SIN_SOBRANTE: {code: 409, message: "No hay material sobrante de este avance"},
  SOBRANTE_YA_CONFIRMADO: {code: 409, message: "El sobrante de este avance ya ha sido confirmado"},
  ORDEN_YA_TIENE_AVANCE_ABIERTO: {code: 409, message: "Esta orden ya se esta trabajando"},
  TIPO_MATERIAL_SOBRANTE_REQUERIDO: {code: 409, message: "Indica el tipo de material que sobró"},
  // ERRORES DE ENCARGADO PIGMENTO
  SOLICITUD_MATERIAL_NO_ENCONTRADA: {code: 404, message: "Solicitud no encontrada"},
  SOLICITUD_MATERIAL_YA_CONFIRMADA: {code: 409, message: "Esta solicitud ya ha sido confirmada"},
  ORDEN_SIN_MOLIDO_ASIGNADO: {code: 409, message: "Se solicita molido, pero la orden no indica qué tipo de molido usar"},
  INCIDENCIA_NO_ENCONTRADA: {code: 404, message: "Incidencia no encontrada"},
  INCIDENCIA_NO_ES_PARA_MOLINO: {code: 409, message: "Los productos no se mandaron a molino"},
  INCIDENCIA_YA_CONFIRMADA_MOLINO: {code: 409, message: "Productos mal pigmentados ya confirmados"},
  INCIDENCIA_YA_RESUELTA: {code: 409, message: "Ya se repimento el material"},
  MATERIAL_Y_KG_DEBEN_VENIR_JUNTOS: {code: 409, message: "Si seleccionas un material, indica los kilogramos (y viceversa)"},
  INCIDENCIA_SIN_DATOS_DE_RESOLUCION: {code: 409, message: "Indica al menos el material usado o el pigmento agregado"},
  // ERRORES DE ENCARGADO MOLINO
  MOLIENDA_SIN_ITEMS: {code: 409, message: "No hay nada que moler"},
  AVANCE_NO_DISPONIBLE_PARA_MOLIENDA: { code: 409, message: "Avance no confirmado o ya fue incluida en una molienda anterior"},
  INCIDENCIA_NO_DISPONIBLE_PARA_MOLIENDA: {code: 409, message: "Incidencia no confirmada o ya fue incluida en una molienda anterior"},
  AVANCE_MATERIAL_NO_COINCIDE: {code: 409, message: "El tipo de material de este avance no coincide con el especificado"},
  INCIDENCIA_MATERIAL_NO_COINCIDE: {code: 409, message: "El tipo de material de esta incidencia no coincide con el especificado"},
  // ERRORES DE PEDIDOS
  PEDIDO_NO_ENCONTRADO: { code: 404, message: "Pedido no encontrado"},
  PEDIDO_NUMERO_YA_EXISTE: { code: 409, message: "Ya existe un pedido con el mismo número"},
  PEDIDO_CANCELADO: { code: 409, message: "Pedido cancelado, no puedes editarlo"},
  PEDIDO_NO_SE_PUEDE_CANCELAR: { code: 409, message: "El pedido no se puede cancelar"},
  PEDIDO_TIENE_ORDENES_EN_PROGRESO: { code: 409, message: "El pedido tiene ordenes en progreso"},
  PEDIDO_NO_SE_PUEDE_MODIFICAR: { code: 409, message: "El pedido ya no se puede modificar"},
  PEDIDO_REQUERIDO_PARA_ENTREGA: {code: 409, message: "Indica el pedido al que pertenece esta salida"},
  PRODUCTO_NO_PERTENECE_AL_PEDIDO: {code: 409, message: "Este producto no forma parte del pedido"},
  CANTIDAD_EXCEDE_LO_SOLICITADO: {code: 409, message: "No puedes entregar más producto del solicitado"},
  // ERRORES DE LINEA (PEDIDODETALLE)
  PEDIDO_DETALLE_NO_ENCONTRADO: {code: 404, message: "Detalle de pedido no encontrado"},
  STOCK_INSUFICIENTE_PRODUCTO: {code: 409, message: "Stock de producto insuficiente"},
  // ERRORES DE OPERADOR
  OPERADOR_NO_ENCONTRADO: {code: 404, message: "El operador no se encontro"},
  OPERADOR_YA_EXISTE: {code: 409, message: "Ya existe un operador con el mismo nombre"},
  OPERADOR_YA_INACTIVO: {code: 409, message: "El operador ya está desactivado"},
  OPERADOR_YA_ACTIVO: {code: 409, message: "El operador ya está activado"},
  OPERADOR_INACTIVO: {code: 409, message: "El operador ya está desativado"},
  // ERRORES DE CATALOGO DEFECTOS
  DEFECTO_NO_ENCONTRADO: {code: 404, message: "Defecto no encontrado"},
  DEFECTO_YA_EXISTE: {code: 409, message: "Este defecto ya existe"},
  DEFECTO_INACTIVO: {code: 409, message: "El defecto ya está desactivado"},
  DEFECTO_YA_ACTIVO: {code: 409, message: "El defecto ya está activo"},
  // ERRORES POR CATALOGO DESACTIVADO
  PRODUCTO_INACTIVO: { code: 409, message: "Producto inactivo"},
  MATERIA_PRIMA_INACTIVA: { code: 409, message: "Materia prima inactiva"},
  PIGMENTO_INACTIVO: { code: 409, message: "Pigmento inactivo"},
  MAQUINA_NO_DISPONIBLE: { code: 409, message: "Maquina inactiva"},
  COLOR_SOLIDO_INACTIVO: {code: 409, message: "Color sólido inactivo"}
};

export function manejarErrorConocido(err: unknown, reply: FastifyReply): boolean {
  if (err instanceof Error && err.message in ERROR_HTTP_MAP) {
    const { code, message } = ERROR_HTTP_MAP[err.message]!;
    reply.code(code).send({ error: message });
    return true;
  }
  return false;
}