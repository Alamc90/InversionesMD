import { BusinessConfig } from "@/models/BusinessConfig";
import { Customer } from "@/models/Customer";
import { Vehicle } from "@/models/Vehicle";
import { formatCurrency } from "./utils";
import { calculateOverdueInfo } from "./paymentUtils";

interface PrintReceiptProps {
  payment: any; // Payment history record
  customer: Customer;
  vehicle: Vehicle;
  plan: any; // Installment plan
  businessConfig: BusinessConfig | null;
}

export const printReceipt = ({
  payment,
  customer,
  vehicle,
  plan,
  businessConfig,
}: PrintReceiptProps) => {
  const width = "58mm";
  // Optimize styles for narrow 58mm paper. 
  // Font size reduced slightly, margins minimal.
  const styles = `
    @page {
      size: 58mm auto;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 2mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: ${width};
      color: #000;
      background-color: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 5px;
    }
    .header h2 {
      margin: 0;
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .header p {
      margin: 1px 0;
      font-size: 11px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
      width: 100%;
    }
    .content-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
      width: 100%;
    }
    .label {
      font-weight: bold;
    }
    .total-section {
      margin-top: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: bold;
      text-align: right;
    }
    .footer {
      text-align: center;
      margin-top: 10px;
      font-size: 10px;
    }
    /* Utility for centering text blocks manually if flex fails in some contexts, but flex is generally fine */
    .center-text {
        text-align: center;
    }
  `;

  const date = new Date(payment.payment_date).toLocaleDateString("es-CO");
  const time = new Date(payment.payment_date).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  // Calculate installments paid with this amount approximately, or just show current status
  // The receipt shows "# Pagos: 6 | Valor Cuota: 35,000"
  // We can calculate how many installments this payment covers
  const installmentValue = Number(plan?.installment_value) || 0;
  const amountPaid = Number(payment.amount) || 0;
  const installmentsInThisPayment = installmentValue > 0 
    ? (amountPaid / installmentValue).toFixed(1) 
    : '0';

  // Format currency without decimals for cleaner receipt if needed, using standard formatter
  const format = (val: number) => formatCurrency(val);

  // Calculate overdue status
  const overdueInfo = calculateOverdueInfo(plan);
  const overdueInstallments = Math.floor(overdueInfo.overdueInstallments);
  
  const statusText = overdueInstallments > 0 
    ? `${overdueInstallments} Cuota(s) Vencida(s)` 
    : "Al día";

  const htmlContent = `
    <html>
      <head>
        <title>Recibo #${payment.id}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="header">
          <h2>${businessConfig?.business_name || "MI NEGOCIO"}</h2>
          <p>NIT: ${businessConfig?.nit || "0000000000"}</p>
          <p>${businessConfig?.address || "Dirección Principal"}</p>
          <p>${businessConfig?.phone || ""}</p>
        </div>

        <div class="divider"></div>

        <div class="content-row">
          <span>Fecha: ${date} ${time}</span>
        </div>
        <div class="content-row">
          <span>Recibo #: ${payment.id}</span>
        </div>

        <div class="divider"></div>

        <div style="margin-bottom: 5px;">
          <div class="label">Cliente:</div>
          <div>${customer.first_name} ${customer.last_name}</div>
        </div>
        
        <div class="content-row">
          <span class="label">CC:</span>
          <span>${customer.cedula}</span>
        </div>

        <div class="content-row">
          <span class="label">Placa:</span>
          <span>${vehicle.plate}</span>
        </div>

        <div class="divider"></div>

        <div class="content-row">
            <span>Cant. Cuotas:</span>
            <span>${Number(installmentsInThisPayment) % 1 === 0 ? Math.floor(Number(installmentsInThisPayment)) : installmentsInThisPayment}</span>
        </div>
        <div class="content-row">
            <span>Valor Cuota:</span>
            <span>${format(installmentValue)}</span>
        </div>

        <div class="total-section">
          Total Pago: ${format(amountPaid)}
        </div>
        
        <div class="content-row" style="align-items: flex-start;">
             <span style="font-weight:bold; white-space: nowrap; margin-right: 5px;">Estado:</span>
             <span style="text-align: right;">${statusText}</span>
        </div>

        <div class="footer">
          <p>Gracias por su preferencia</p>
          <p>${businessConfig?.business_name || "Equipo Vehículos"}</p>
        </div>
        
        <script>
            window.onload = function() {
                window.print();
                // Optional: close window after print? 
                // window.close();
            }
        </script>
      </body>
    </html>
  `;

  // Use a smaller window size for preview to match physics
  const printWindow = window.open("", "_blank", "width=350,height=600,menubar=0,toolbar=0,location=0,status=0");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert("Permita las ventanas emergentes para imprimir el recibo");
  }
};
