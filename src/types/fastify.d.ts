import "fastify";
import type { RolUsuario } from "../../prisma/generated/prisma/client/enums.ts";

export interface AuthUser {
  id: bigint;
  usuario: string;
  nombre: string;
  role: RolUsuario
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: AuthUser["role"][]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}