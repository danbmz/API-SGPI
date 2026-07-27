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
  // ERRORES PRODUCTOS
  PRODUCTO_NO_ENCONTRADO: {code: 404, message: "Producto no encontrada"}, 
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
  ORDEN_NO_SE_PUEDE_REANUDAR: {code: 409, message: "La orden no se puede reanudar"}
};

export function manejarErrorConocido(err: unknown, reply: FastifyReply): boolean {
  if (err instanceof Error && err.message in ERROR_HTTP_MAP) {
    const { code, message } = ERROR_HTTP_MAP[err.message]!;
    reply.code(code).send({ error: message });
    return true;
  }
  return false;
}