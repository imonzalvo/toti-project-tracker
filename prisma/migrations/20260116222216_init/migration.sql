-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "comisionPct" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facturacion" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fechaFacturacion" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'EMITIDA',
    "fechaCobro" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facturacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proyecto_identificador_key" ON "Proyecto"("identificador");

-- CreateIndex
CREATE INDEX "Proyecto_identificador_idx" ON "Proyecto"("identificador");

-- CreateIndex
CREATE INDEX "Proyecto_estado_idx" ON "Proyecto"("estado");

-- CreateIndex
CREATE INDEX "Proyecto_moneda_idx" ON "Proyecto"("moneda");

-- CreateIndex
CREATE INDEX "Facturacion_proyectoId_idx" ON "Facturacion"("proyectoId");

-- CreateIndex
CREATE INDEX "Facturacion_estado_idx" ON "Facturacion"("estado");

-- CreateIndex
CREATE INDEX "Facturacion_fechaCobro_idx" ON "Facturacion"("fechaCobro");

-- AddForeignKey
ALTER TABLE "Facturacion" ADD CONSTRAINT "Facturacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
