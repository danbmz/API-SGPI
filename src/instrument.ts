import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  dataCollection: {
    userInfo: false,             // no adjuntar IP, id ni usuario
    cookies: false,              // tus tokens viajan en cookies httpOnly
    httpBodies: [],              // no enviar cuerpos de peticiones ni respuestas
    databaseQueryData: false,    // no enviar parámetros ni resultados de consultas
    stackFrameVariables: false,  // no enviar valores de variables locales
  },
});