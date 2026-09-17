import { Type, type Static } from "@sinclair/typebox";

export const reportesQuerySchema = Type.Object({
  fechaDesde: Type.String({ format: "date" }),
  fechaHasta: Type.String({ format: "date" }),
});

export type ReportesQuery = Static<typeof reportesQuerySchema>;