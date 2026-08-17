-- ============================================================
-- Multitenancy: tenants anclados al usuario dueño.
-- User con ownerId = NULL es raíz de tenant. Los miembros apuntan a su raíz.
-- Tenant efectivo de cualquier usuario = COALESCE(ownerId, id).
-- Los datos existentes pertenecen al tenant de Antonella Piana.
-- ============================================================

-- ─── Fase 1: agregar columnas NULLABLE ──────────────────────
ALTER TABLE "User"        ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Proyecto"    ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Facturacion" ADD COLUMN "ownerId" TEXT;

-- ─── Fase 2: backfill ───────────────────────────────────────
-- El prefijo EXISTS(SELECT 1 FROM "User") es OBLIGATORIO: sin él esta migración
-- explota contra la shadow database de Prisma (que está vacía) y contra cualquier
-- base de dev/CI nueva.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User")
     AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = 'cmkhkvwr30000t5qx3e9ugnqh') THEN
    RAISE EXCEPTION 'No existe el usuario raíz cmkhkvwr30000t5qx3e9ugnqh; abortando';
  END IF;
END $$;

-- Antonella queda como raíz (ownerId NULL); el resto pasa a ser miembro.
UPDATE "User" SET "ownerId" = 'cmkhkvwr30000t5qx3e9ugnqh'
 WHERE "id" <> 'cmkhkvwr30000t5qx3e9ugnqh';

UPDATE "Proyecto"    SET "ownerId" = 'cmkhkvwr30000t5qx3e9ugnqh';   -- 51 filas
UPDATE "Facturacion" SET "ownerId" = 'cmkhkvwr30000t5qx3e9ugnqh';   -- 74 filas

-- Guardas: nada sin asignar, y la columna desnormalizada coincide con el padre.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Proyecto" WHERE "ownerId" IS NULL)
     OR EXISTS (SELECT 1 FROM "Facturacion" WHERE "ownerId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto: quedaron ownerId NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "Facturacion" f JOIN "Proyecto" p ON p."id" = f."proyectoId"
              WHERE f."ownerId" <> p."ownerId") THEN
    RAISE EXCEPTION 'Backfill inconsistente: Facturacion.ownerId <> Proyecto.ownerId';
  END IF;
END $$;

-- ─── Fase 3: constrainear ───────────────────────────────────
ALTER TABLE "Proyecto"    ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Facturacion" ALTER COLUMN "ownerId" SET NOT NULL;

-- Sacar los ÚNICOS GLOBALES. Ojo: se crearon con DDL distinto (verificado en
-- pg_constraint/pg_indexes), así que se borran distinto:
--   Proyecto_identificador_key  → CREATE UNIQUE INDEX  (migración init)      ⇒ DROP INDEX
--   Proyecto_identifier_num_key → ADD CONSTRAINT UNIQUE (migración 20260320) ⇒ DROP CONSTRAINT
-- (un DROP INDEX sobre el segundo falla con "cannot drop index ... constraint requires it")
-- Afecta 0 filas: borra reglas de unicidad, no datos.
DROP INDEX "Proyecto_identificador_key";
ALTER TABLE "Proyecto" DROP CONSTRAINT "Proyecto_identifier_num_key";

CREATE UNIQUE INDEX "Proyecto_ownerId_identificador_key"  ON "Proyecto"("ownerId", "identificador");
CREATE UNIQUE INDEX "Proyecto_ownerId_identifier_num_key" ON "Proyecto"("ownerId", "identifier_num");
CREATE UNIQUE INDEX "Proyecto_id_ownerId_key"             ON "Proyecto"("id", "ownerId");

CREATE INDEX "User_ownerId_idx"                ON "User"("ownerId");
CREATE INDEX "Proyecto_ownerId_idx"            ON "Proyecto"("ownerId");
CREATE INDEX "Proyecto_ownerId_moneda_idx"     ON "Proyecto"("ownerId", "moneda");
CREATE INDEX "Facturacion_ownerId_idx"         ON "Facturacion"("ownerId");
CREATE INDEX "Facturacion_ownerId_estado_idx"  ON "Facturacion"("ownerId", "estado");

ALTER TABLE "User" ADD CONSTRAINT "User_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reemplazar el FK simple de Facturacion por el compuesto tenant-safe.
ALTER TABLE "Facturacion" DROP CONSTRAINT "Facturacion_proyectoId_fkey";
ALTER TABLE "Facturacion" ADD CONSTRAINT "Facturacion_proyectoId_ownerId_fkey"
  FOREIGN KEY ("proyectoId", "ownerId") REFERENCES "Proyecto"("id", "ownerId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Una raíz no puede ser miembro de sí misma.
ALTER TABLE "User" ADD CONSTRAINT "User_ownerId_not_self"
  CHECK ("ownerId" IS NULL OR "ownerId" <> "id");
