import { randomBytes, createHash } from "crypto";
import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// ---------- Utilidades internas ----------

function hashToken(token: string): string {
  // SHA-256 es suficiente aquí: el refresh token ya es aleatorio y de alta entropía,
  return createHash("sha256").update(token).digest("hex");
}

function generarTokenAleatorio(): string {
  return randomBytes(64).toString("hex");
}

// ---------- Verificación de credenciales ----------

export async function verificarCredenciales(usuarioLogin: string, password: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { usuario: usuarioLogin },
  });

  if (!usuario || !usuario.activo) {
    return null; // no revelamos si el usuario existe o no, mismo mensaje de error en ambos casos
  }

  const passwordValido = await argon2.verify(usuario.password, password);
  if (!passwordValido) {
    return null;
  }

  return usuario;
}

// ---------- Generación de tokens ----------

export function generarAccessToken(app: FastifyInstance, usuario: { id: bigint; role: string }) {
  return app.jwt.sign(
    {
      sub: usuario.id.toString(), // BigInt no es serializable directo en JWT, se convierte a string
      role: usuario.role,
    },
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

export async function generarRefreshToken(
  usuarioId: bigint,
  metadata: { userAgent: string | undefined; ip: string | undefined }
) {
  const token = generarTokenAleatorio();
  const tokenHash = hashToken(token);
  const expiraEn = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);

  await prisma.refreshToken.create({
    data: {
      usuarioId,
      tokenHash,
      expiraEn,
      ...(metadata.userAgent !== undefined && { userAgent: metadata.userAgent }),
      ...(metadata.ip !== undefined && { ip: metadata.ip }),
    },
  });

  return { token, expiraEn }; // el token EN TEXTO PLANO se manda como cookie; solo el hash vive en la BD
}

// ---------- Rotación de refresh token ----------

export async function rotarRefreshToken(
  tokenPlano: string,
  metadata: { userAgent: string | undefined; ip: string | undefined }
) {
  const tokenHash = hashToken(tokenPlano);

  const registro = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { usuario: true },
  });

  // Validaciones: existe, no revocado, no expirado
  if (!registro || registro.revocado || registro.expiraEn < new Date()) {
    return null;
  }

  if (!registro.usuario.activo) {
    return null;
  }

  // Revocamos el token usado (rotación: cada refresh invalida el anterior)
  await prisma.refreshToken.update({
    where: { id: registro.id },
    data: { revocado: true },
  });

  // Generamos uno nuevo
  const nuevo = await generarRefreshToken(registro.usuarioId, metadata);

  return { usuario: registro.usuario, refreshToken: nuevo };
}

// ---------- Logout ----------

export async function revocarRefreshToken(tokenPlano: string) {
  const tokenHash = hashToken(tokenPlano);

  const registro = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { usuario: true },
  });

  if (!registro || registro.revocado) {
    return null;
  }

  await prisma.refreshToken.update({
    where: { id: registro.id },
    data: { revocado: true },
  });

  return registro.usuario;
}