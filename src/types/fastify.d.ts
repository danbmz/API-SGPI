import "fastify";

export interface AuthUser {
  id: bigint;
  role: "ADMIN" | "SUPERVISOR" | "MOLINO" | "PIGMENTOS";
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