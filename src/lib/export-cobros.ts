import type { RouterOutputs } from "~/trpc/react";
import { getTipoFacturacionLabel, getTrimestreLabel } from "~/lib/formatters";

type CobrosTrimestre = RouterOutputs["facturacion"]["getCobrosTrimestre"];

// Excel no tiene zona horaria: se escribe la fecha local como medianoche UTC
// para que no se corra un día al abrir la planilla.
function toExcelDate(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
}

// Genera y descarga un .xlsx con el detalle de cobros del trimestre y un
// resumen por proyecto. exceljs se carga recién al exportar.
export async function exportCobrosTrimestre(
  cobros: CobrosTrimestre,
  moneda: "UYU" | "USD"
) {
  const { default: ExcelJS } = await import("exceljs");

  const currencyFmt = `"${moneda === "UYU" ? "$U" : "US$"}" #,##0.00`;
  // Porcentajes como fracción (30% => 0.3) para que sean usables en fórmulas
  const pctFmt = "0.00%";
  const periodo = `${cobros.year} - ${getTrimestreLabel(cobros.quarter)}`;

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  // Hoja 1: una fila por factura cobrada
  const detalle = workbook.addWorksheet("Detalle");
  detalle.columns = [
    { header: "Identificador", key: "identificador", width: 14 },
    { header: "Proyecto", key: "proyecto", width: 36 },
    { header: "Tipo", key: "tipo", width: 18 },
    { header: "% Presupuesto", key: "porcentaje", width: 14, style: { numFmt: pctFmt } },
    { header: "Monto", key: "monto", width: 16, style: { numFmt: currencyFmt } },
    { header: "Fecha Cobro", key: "fechaCobro", width: 14, style: { numFmt: "dd/mm/yyyy" } },
    { header: "% Comisión", key: "comisionPct", width: 12, style: { numFmt: pctFmt } },
    { header: "Comisión", key: "comision", width: 16, style: { numFmt: currencyFmt } },
  ];

  for (const item of cobros.proyectos) {
    for (const f of item.facturaciones) {
      detalle.addRow({
        identificador: item.proyecto.identificador,
        proyecto: item.proyecto.nombre,
        tipo: getTipoFacturacionLabel(f.descripcion),
        porcentaje: f.porcentaje / 100,
        monto: f.monto,
        fechaCobro: f.fechaCobro ? toExcelDate(f.fechaCobro) : null,
        comisionPct: item.proyecto.comisionPct / 100,
        comision: (f.monto * item.proyecto.comisionPct) / 100,
      });
    }
  }

  const totalDetalle = detalle.addRow({
    proyecto: "Total",
    monto: cobros.totalGeneral,
    comision: cobros.comisionTotal,
  });
  totalDetalle.font = { bold: true };

  // Hoja 2: totales por proyecto
  const resumen = workbook.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Identificador", key: "identificador", width: 14 },
    { header: "Proyecto", key: "proyecto", width: 36 },
    { header: "% Comisión", key: "comisionPct", width: 12, style: { numFmt: pctFmt } },
    { header: "Total Cobrado", key: "totalCobrado", width: 16, style: { numFmt: currencyFmt } },
    { header: "Comisión", key: "comision", width: 16, style: { numFmt: currencyFmt } },
  ];

  for (const item of cobros.proyectos) {
    resumen.addRow({
      identificador: item.proyecto.identificador,
      proyecto: item.proyecto.nombre,
      comisionPct: item.proyecto.comisionPct / 100,
      totalCobrado: item.totalCobrado,
      comision: item.comision,
    });
  }

  const totalResumen = resumen.addRow({
    proyecto: "Total",
    totalCobrado: cobros.totalGeneral,
    comision: cobros.comisionTotal,
  });
  totalResumen.font = { bold: true };

  resumen.insertRow(1, [`Cobros ${periodo} (${moneda})`]);
  resumen.getRow(1).font = { bold: true, size: 14 };
  resumen.insertRow(2, []);

  for (const [sheet, headerRow] of [
    [detalle, 1],
    [resumen, 3],
  ] as const) {
    sheet.getRow(headerRow).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: headerRow }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cobros-${cobros.year}-Q${cobros.quarter}-${moneda}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
