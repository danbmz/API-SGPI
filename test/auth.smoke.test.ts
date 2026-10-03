import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/app.js";

describe("Auth — login y control de acceso por rol", () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready(); // espera a que todos los plugins terminen de registrarse
  });

  afterAll(async () => {
    await app.close();
  });

  it("rechaza login con credenciales inválidas", async () => {
    const response = await supertest(app.server)
      .post("/auth/login")
      .send({ usuario: "usuario_inexistente", password: "incorrecta" });

    expect(response.status).toBe(401);
  });

  it("permite login con credenciales válidas y regresa el usuario", async () => {
    const response = await supertest(app.server)
      .post("/auth/login")
      .send({ usuario: "admin01", password: "Test1234!" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("usuario");
  });

  it("rechaza acceso a una ruta protegida sin sesión", async () => {
    const response = await supertest(app.server).get("/pedidos");

    expect(response.status).toBe(401);
  });
});