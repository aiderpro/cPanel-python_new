import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sslStatus: text("ssl_status").notNull().default("no_ssl"), // "valid", "expired", "expiring_soon", "no_ssl"
  sslExpiryDate: text("ssl_expiry_date"), // ISO date string or null
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDomainSchema = createInsertSchema(domains).pick({
  name: true,
  sslStatus: true,
  sslExpiryDate: true,
}).extend({
  name: z.string().min(1, "Domain name is required").regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/,
    "Invalid domain format"
  ),
  installSsl: z.boolean().optional(),
});

export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domains.$inferSelect;
