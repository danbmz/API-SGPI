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
  MOTIVO_PARO_YA_EXISTE: {code: 404, message: "Este motivo ya existe"},
  MOTIVO_PARO_YA_INACTIVO: {code: 404, message: "El motivo ya está desactivado"},
  MOTIVO_PARO_YA_ACTIVO: {code: 404, message: "El motivo ya está activo"},
};

export function manejarErrorConocido(err: unknown, reply: FastifyReply): boolean {
  if (err instanceof Error && err.message in ERROR_HTTP_MAP) {
    const { code, message } = ERROR_HTTP_MAP[err.message]!;
    reply.code(code).send({ error: message });
    return true;
  }
  return false;
}