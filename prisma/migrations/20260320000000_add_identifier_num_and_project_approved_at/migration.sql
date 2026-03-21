-- Add identifier_num as nullable first, then populate and constrain
ALTER TABLE "Proyecto" ADD COLUMN "identifier_num" INTEGER;

-- Populate identifier_num by casting the existing string identificador to integer
UPDATE "Proyecto" SET "identifier_num" = CAST("identificador" AS INTEGER);

-- Make identifier_num NOT NULL and add unique constraint
ALTER TABLE "Proyecto" ALTER COLUMN "identifier_num" SET NOT NULL;
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_identifier_num_key" UNIQUE ("identifier_num");

-- Add index on identifier_num
CREATE INDEX "Proyecto_identifier_num_idx" ON "Proyecto"("identifier_num");

-- Add project_approved_at as nullable first, then populate and constrain
ALTER TABLE "Proyecto" ADD COLUMN "project_approved_at" TIMESTAMP(3);

-- For projects where identificador starts with '26': use createdAt
UPDATE "Proyecto"
SET "project_approved_at" = "createdAt"
WHERE LEFT("identificador", 2) = '26';

-- For all other projects: use the first day of the year derived from the first 2 digits (20XX-01-01)
UPDATE "Proyecto"
SET "project_approved_at" = (('20' || LEFT("identificador", 2) || '-01-01')::DATE)::TIMESTAMP
WHERE LEFT("identificador", 2) != '26';

-- Make project_approved_at NOT NULL
ALTER TABLE "Proyecto" ALTER COLUMN "project_approved_at" SET NOT NULL;

-- Add index on project_approved_at
CREATE INDEX "Proyecto_project_approved_at_idx" ON "Proyecto"("project_approved_at");
