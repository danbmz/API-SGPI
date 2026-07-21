import Fastify from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import corsPlugin from "./plugins/cors.js";
import cookiePlugin from "./plugins/cookie.js";
import jwtPlugin from "./plugins/jwt.js";
import authRoutes from "./modules/auth/auth.routes.js";
import authenticatePlugin from "./plugins/authenticate.js";
import usuarioRoutes from "./modules/usuarios/usuario.routes.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import materiaPrimaRoutes from "./modules/materias-primas/materiaPrima.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

  app.register(corsPlugin);
  app.register(cookiePlugin);
  app.register(jwtPlugin);
  app.register(errorHandlerPlugin);

  app.register(authenticatePlugin);
  app.register(authRoutes);
  app.register(usuarioRoutes);
  app.register(materiaPrimaRoutes)

  return app;
}