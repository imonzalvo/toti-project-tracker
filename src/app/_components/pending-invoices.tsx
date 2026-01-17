"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import {
  formatCurrency,
  formatShortDate,
  getTipoFacturacionLabel,
} from "~/lib/formatters";
import { useCuenta } from "~/lib/cuenta-context";
import { ArrowRight, FileWarning } from "lucide-react";

export function PendingInvoices() {
  const { moneda } = useCuenta();
  const { data: pendientes } = api.facturacion.getPendientes.useQuery({ moneda });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-amber-500 sm:h-5 sm:w-5" />
          <CardTitle className="text-base sm:text-lg">Facturas Pendientes</CardTitle>
        </div>
        <Link href="/facturaciones?estado=EMITIDA">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
            Ver todas <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {!pendientes || pendientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center sm:py-8">
            <div className="rounded-full bg-muted p-3">
              <FileWarning className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
            </div>
            <p className="mt-3 text-sm font-medium">Sin facturas pendientes</p>
            <p className="text-xs text-muted-foreground">
              Todas las facturas están cobradas
            </p>
          </div>
        ) : (
          <>
            {/* Vista Mobile - Lista simplificada */}
            <div className="space-y-2 sm:hidden">
              {pendientes.slice(0, 5).map((factura) => (
                <Link
                  key={factura.id}
                  href={`/proyectos/${factura.proyectoId}`}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-medium">
                      {factura.proyecto.identificador}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getTipoFacturacionLabel(factura.descripcion)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(factura.monto, moneda)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(factura.fechaFacturacion)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Vista Desktop - Tabla */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendientes.slice(0, 5).map((factura) => (
                  <TableRow key={factura.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/proyectos/${factura.proyectoId}`}
                        className="hover:underline"
                      >
                        {factura.proyecto.identificador}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getTipoFacturacionLabel(factura.descripcion)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(factura.monto, moneda)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatShortDate(factura.fechaFacturacion)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
