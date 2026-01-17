"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Separator } from "~/components/ui/separator";
import { api } from "~/trpc/react";
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  getTrimestreLabel,
  getTipoFacturacionLabel,
} from "~/lib/formatters";
import { useCuenta } from "~/lib/cuenta-context";
import { Calculator, Wallet, Building2, ExternalLink } from "lucide-react";

interface CobrosTrimesterProps {
  initialYear: number;
  initialQuarter: number;
}

export function CobrosTrimestre({
  initialYear,
  initialQuarter,
}: CobrosTrimesterProps) {
  const { moneda } = useCuenta();
  const [selectedPeriod, setSelectedPeriod] = useState(
    `${initialYear}-Q${initialQuarter}`
  );

  const { data: trimestres } =
    api.facturacion.getTrimestresDisponibles.useQuery({ moneda });

  const [year, quarter] = selectedPeriod.split("-Q").map(Number) as [
    number,
    number,
  ];

  const { data: cobros } = api.facturacion.getCobrosTrimestre.useQuery(
    { moneda, year, quarter },
    { enabled: !!year && !!quarter }
  );

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-muted-foreground">
          Periodo:
        </label>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar periodo" />
          </SelectTrigger>
          <SelectContent>
            {trimestres?.map((t) => (
              <SelectItem key={`${t.year}-Q${t.quarter}`} value={`${t.year}-Q${t.quarter}`}>
                {t.year} - {getTrimestreLabel(t.quarter)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {cobros && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cobrado por la Empresa
              </CardTitle>
              <div className="rounded-lg bg-blue-100 p-2">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {formatCurrency(cobros.totalGeneral, moneda)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {cobros.proyectos.length} proyecto
                {cobros.proyectos.length !== 1 ? "s" : ""} con cobros
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">
                Tu Comisión del Periodo
              </CardTitle>
              <div className="rounded-lg bg-emerald-100 p-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-emerald-700">
                {formatCurrency(cobros.comisionTotal, moneda)}
              </div>
              <p className="text-sm text-emerald-600 mt-1">
                Periodo: {year} - {getTrimestreLabel(quarter)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Projects Detail */}
      {cobros && cobros.proyectos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Detalle por Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {cobros.proyectos.map((item) => (
                <AccordionItem key={item.proyecto.id} value={item.proyecto.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 flex-col gap-2 pr-4 text-left sm:flex-row sm:items-center sm:justify-between">
                      {/* Info del proyecto */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-mono text-xs text-muted-foreground sm:text-sm">
                          {item.proyecto.identificador}
                        </span>
                        <span className="text-sm font-medium sm:text-base">{item.proyecto.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatPercentage(item.proyecto.comisionPct)} comisión
                        </Badge>
                      </div>
                      {/* Montos */}
                      <div className="flex items-center gap-4 text-right sm:gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground">Cobrado</p>
                          <p className="text-sm font-medium sm:text-base">
                            {formatCurrency(item.totalCobrado, moneda)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Tu comisión
                          </p>
                          <p className="text-sm font-bold text-emerald-600 sm:text-base">
                            {formatCurrency(item.comision, moneda)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      {/* Vista Mobile - Lista simplificada */}
                      <div className="space-y-2 md:hidden">
                        {item.facturaciones.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {getTipoFacturacionLabel(f.descripcion)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {f.fechaCobro ? formatDate(f.fechaCobro) : "—"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                {formatCurrency(f.monto, moneda)}
                              </p>
                              <p className="text-sm font-medium text-emerald-600">
                                +{formatCurrency(
                                  (f.monto * item.proyecto.comisionPct) / 100,
                                  moneda
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Vista Desktop - Tabla */}
                      <Table className="hidden md:table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">%</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead>Fecha Cobro</TableHead>
                            <TableHead className="text-right">
                              Comisión
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {item.facturaciones.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell>
                                {getTipoFacturacionLabel(f.descripcion)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPercentage(f.porcentaje)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(f.monto, moneda)}
                              </TableCell>
                              <TableCell>
                                {f.fechaCobro ? formatDate(f.fechaCobro) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-medium text-emerald-600">
                                {formatCurrency(
                                  (f.monto * item.proyecto.comisionPct) / 100,
                                  moneda
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="mt-4 flex justify-end">
                        <Link
                          href={`/proyectos/${item.proyecto.id}`}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver proyecto completo
                        </Link>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Totals */}
            <Separator className="my-4" />
            <div className="flex justify-end">
              <div className="w-full max-w-md space-y-2 rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total cobrado empresa:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(cobros.totalGeneral, moneda)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total a cobrar:</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatCurrency(cobros.comisionTotal, moneda)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-4">
                <Calculator className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">Sin cobros en el periodo</p>
              <p className="text-sm text-muted-foreground">
                No hay facturas cobradas en {year} - {getTrimestreLabel(quarter)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
