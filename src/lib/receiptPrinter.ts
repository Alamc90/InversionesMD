import { BusinessConfig } from "@/models/BusinessConfig";
import { Customer } from "@/models/Customer";
import { Vehicle } from "@/models/Vehicle";
import { formatCurrency } from "./utils";
import { calculateOverdueInfo } from "./paymentUtils";
import {
  buildESCPOSReceipt,
  printDirect,
  isPrinterConnected,
  ReceiptData,
} from "./thermalPrinter";

interface PrintReceiptProps {
  payment: any;
  customer: Customer;
  vehicle: Vehicle;
  plan: any;
  businessConfig: BusinessConfig | null;
  logoUrl?: string | null;
}

// ─── Build receipt data (shared between HTML and ESC/POS) ────────────────

function buildReceiptData(props: PrintReceiptProps): ReceiptData {
  const { payment, customer, vehicle, plan, businessConfig } = props;

  const date = new Date(payment.payment_date).toLocaleDateString("es-CO");
  const time = new Date(payment.payment_date).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const installmentValue = Number(plan?.installment_value) || 0;
  const amountPaid = Number(payment.amount) || 0;
  const installmentsInPayment =
    installmentValue > 0 ? amountPaid / installmentValue : 0;
  const installmentsDisplay =
    installmentsInPayment % 1 === 0
      ? Math.floor(installmentsInPayment).toString()
      : installmentsInPayment.toFixed(1);

  const overdueInfo = calculateOverdueInfo(plan);
  const overdueInstallments = Math.floor(overdueInfo.overdueInstallments);
  const statusText =
    overdueInstallments > 0
      ? `${overdueInstallments} Cuota(s) Vencida(s)`
      : "Al dia";

  return {
    businessName: businessConfig?.business_name || "MI NEGOCIO",
    nit: businessConfig?.nit || "0000000000",
    address: businessConfig?.address || "",
    phone: businessConfig?.phone || "",
    date,
    time,
    receiptNumber: payment.id,
    customerName: `${customer.first_name} ${customer.last_name}`,
    cedula: customer.cedula || "",
    plate: vehicle.plate || "",
    installmentsCount: installmentsDisplay,
    installmentValue: formatCurrency(installmentValue),
    totalPayment: formatCurrency(amountPaid),
    statusText,
  };
}

// ─── Direct ESC/POS Printing ─────────────────────────────────────────────

export async function printReceiptDirect(
  props: PrintReceiptProps
): Promise<boolean> {
  if (!isPrinterConnected()) {
    return false;
  }

  const data = buildReceiptData(props);
  const escposBytes = buildESCPOSReceipt(data);
  await printDirect(escposBytes);
  return true;
}

// ─── HTML Fallback for browser printing ──────────────────────────────────
// Optimized for 58mm (≈48mm printable area) thermal receipt printers.
// Uses table-cell layout and monospace font to prevent overflow.

export const printReceipt = (props: PrintReceiptProps) => {
  const { logoUrl } = props;
  const d = buildReceiptData(props);

  const styles = `
    @page {
      size: 48mm auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 48mm;
      max-width: 48mm;
      margin: 0 auto;
      padding: 1mm 0.5mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .subtitle {
      text-align: center;
      font-size: 9px;
      line-height: 1.2;
    }
    .logo {
      max-width: 36mm;
      max-height: 12mm;
      display: block;
      margin: 0 auto 2px auto;
      object-fit: contain;
    }
    .sep {
      border: none;
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    .row {
      display: table;
      width: 100%;
      table-layout: fixed;
      font-size: 10px;
    }
    .row .lbl {
      display: table-cell;
      font-weight: bold;
      white-space: nowrap;
      width: 45%;
      padding-right: 2px;
      vertical-align: top;
    }
    .row .val {
      display: table-cell;
      text-align: right;
      width: 55%;
      word-break: break-all;
      vertical-align: top;
    }
    .row .val-left {
      display: table-cell;
      text-align: left;
      width: 55%;
      word-break: break-word;
      vertical-align: top;
    }
    .field-block {
      font-size: 10px;
      word-break: break-word;
      padding-left: 1px;
      margin-bottom: 1px;
    }
    .total-box {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      padding: 3px 0;
      margin: 2px 0;
    }
    .footer {
      text-align: center;
      font-size: 9px;
      margin-top: 5px;
      line-height: 1.3;
    }
    @media print {
      body { width: 48mm; max-width: 48mm; }
    }
  `;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Recibo #${d.receiptNumber}</title>
<style>${styles}</style>
</head>
<body>

<div class="center">
  ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : ""}
  <div class="title">${d.businessName}</div>
  <div class="subtitle">NIT: ${d.nit}</div>
  <div class="subtitle">${d.address}</div>
  ${d.phone ? `<div class="subtitle">${d.phone}</div>` : ""}
</div>

<hr class="sep">

<div class="row">
  <span class="lbl">Fecha:</span>
  <span class="val">${d.date}</span>
</div>
<div class="row">
  <span class="lbl">Hora:</span>
  <span class="val">${d.time}</span>
</div>
<div class="row">
  <span class="lbl">Recibo #:</span>
  <span class="val">${d.receiptNumber}</span>
</div>

<hr class="sep">

<div class="bold" style="font-size:10px;">Cliente:</div>
<div class="field-block">${d.customerName}</div>

<div class="row">
  <span class="lbl">CC:</span>
  <span class="val">${d.cedula}</span>
</div>
<div class="row">
  <span class="lbl">Placa:</span>
  <span class="val">${d.plate}</span>
</div>

<hr class="sep">

<div class="row">
  <span class="lbl">Cant. Cuotas:</span>
  <span class="val">${d.installmentsCount}</span>
</div>
<div class="row">
  <span class="lbl">Valor Cuota:</span>
  <span class="val">$${d.installmentValue}</span>
</div>

<hr class="sep">

<div class="total-box">
  Total: $${d.totalPayment}
</div>

<hr class="sep">

<div class="bold" style="font-size:10px;">Estado:</div>
<div class="field-block">${d.statusText}</div>

<div class="footer">
  Gracias por su preferencia<br>
  ${d.businessName}
</div>

<script>
window.onload = function() {
  setTimeout(function() { window.print(); }, 300);
};
</script>
</body>
</html>`;

  const printWindow = window.open(
    "",
    "_blank",
    "width=300,height=600,menubar=0,toolbar=0,location=0,status=0"
  );
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert("Permita las ventanas emergentes para imprimir el recibo.");
  }
};
