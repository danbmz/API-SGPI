import { Type, type Static } from "@sinclair/typebox";

const rolUsuarioSchema = Type.Union([
  Type.Literal("ADMIN"),
  Type.Literal("SUPERVISOR"),
  Type.Literal("MOLINO"),
  Type.Literal("PIGMENTOS"),
]);

// export type RolUsuario = Static<typeof rolUsuarioSchema>; // ← nueva línea

// ---------- Crear usuario ----------

export const crearUsuarioBodySchema = Type.Object({
  nombre: Type.String({ minLength: 1, maxLength: 150 }),
  usuario: Type.String({ minLength: 3, maxLength: 50 }),
  password: Type.String({ minLength: 8, maxLength: 200 }),
  role: rolUsuarioSchema,
});

export type CrearUsuarioBody = Static<typeof crearUsuarioBodySchema>;

// ---------- Editar usuario ----------

export const editarUsuarioBodySchema = Type.Object({
  nombre: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
  role: Type.Optional(rolUsuarioSchema),
});

export type EditarUsuarioBody = Static<typeof editarUsuarioBodySchema>;

// ---------- Cambiar contraseña (reseteo por admin) ----------

export const cambiarPasswordBodySchema = Type.Object({
  password: Type.String({ minLength: 8, maxLength: 200 }),
});

export type CambiarPasswordBody = Static<typeof cambiarPasswordBodySchema>;

// ---------- Parámetros de ruta ----------

export const usuarioParamsSchema = Type.Object({
  id: Type.String(), // BigInt viaja como string en la URL, se convierte dentro del handler
});

export type UsuarioParams = Static<typeof usuarioParamsSchema>;

// ---------- Respuestas ----------

export const usuarioResponseSchema = Type.Object({
  id: Type.String(),
  nombre: Type.String(),
  usuario: Type.String(),
  role: rolUsuarioSchema,
  activo: Type.Boolean(),
  createdAt: Type.String(),
});

export const listaUsuariosResponseSchema = Type.Array(usuarioResponseSchema);

export const okResponseSchema = Type.Object({
  ok: Type.Boolean(),
});

export const errorResponseSchema = Type.Object({
  error: Type.String(),
});