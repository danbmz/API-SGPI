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
import pigmentoRoutes from "./modules/pigmentos/pigmento.routes.js";
import productoRoutes from "./modules/productos/producto.routes.js";
import maquinaRoutes from "./modules/maquinas/maquina.routes.js";
import motivoParoRoutes from "./modules/motivos-paro/motivoParo.routes.js";
import colorSolidoRoutes from "./modules/colores-solidos/colorSolido.routes.js";
import inventarioRoutes from "./modules/inventario/inventario.routes.js";
import ordenRoutes from "./modules/ordenes/orden.routes.js";
import avanceTurnoRoutes from "./modules/avances-turno/avanceTurno.routes.js";
import pedidoRoutes from "./modules/pedidos/pedido.routes.js";
import operdaorRoutes from "./modules/operadores/operador.routes.js";
import defectoProductoRoutes from "./modules/defectos/defecto.routes.js";
import moliendaRoutes from "./modules/moliendas/molienda.routes.js";

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
  app.register(pigmentoRoutes)
  app.register(productoRoutes)
  app.register(maquinaRoutes)
  app.register(motivoParoRoutes)
  app.register(colorSolidoRoutes)
  app.register(inventarioRoutes)
  app.register(ordenRoutes)
  app.register(avanceTurnoRoutes)
  app.register(pedidoRoutes)
  app.register(operdaorRoutes)
  app.register(defectoProductoRoutes)
  app.register(moliendaRoutes)

  return app;
}