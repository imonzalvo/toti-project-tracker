import { TRPCError } from "@trpc/server";
import type { Prisma } from "~/server/db";

/**
 * Mapea un P2025 (registro no encontrado / no coincide el where) de Prisma a un
 * NOT_FOUND de tRPC. Usado en updates/deletes scopeados por { id, ownerId }: si
 * la fila pertenece a otro tenant, Prisma la trata igual que si no existiera.
 */
export function rethrowAsNotFound(e: unknown, message: string): never {
  if (typeof e === "object" && e !== null && "code" in e && e.code === "P2025") {
    throw new TRPCError({ code: "NOT_FOUND", message });
  }
  throw e;
}

/**
 * Filtro de User que matchea a TODOS los miembros de un tenant, incluida la
 * raíz. La raíz tiene ownerId = NULL, así que `{ ownerId: tenantId }` a secas
 * la deja afuera — este helper es el fix para ese caso.
 */
export const tenantUserFilter = (tenantId: string): Prisma.UserWhereInput => ({
  OR: [{ id: tenantId }, { ownerId: tenantId }],
});
