import { z } from "zod";
import { REPORT_CATEGORY_IDS } from "@/lib/reports";

export const reportPlayerSchema = z.object({
  username: z.string().trim().min(1).max(40),
  category: z.enum(REPORT_CATEGORY_IDS, { error: "Elige un motivo" }),
  reason: z.string().trim().min(10, "Cuenta qué pasó (mínimo 10 letras)").max(500, "Máximo 500 letras"),
});
export type ReportPlayerInput = z.input<typeof reportPlayerSchema>;

export const resolveReportSchema = z.object({
  reportId: z.string().min(1).max(40),
  outcome: z.enum(["RESOLVED", "DISMISSED"]),
  /** Además, suspender la cuenta reportada. */
  suspend: z.boolean().default(false),
});
