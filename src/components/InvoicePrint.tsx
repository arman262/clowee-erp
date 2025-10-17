import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useFranchiseAgreements } from "@/hooks/useFranchiseAgreements";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { formatDate } from "@/lib/dateUtils";
import { Download, Image, Printer, X } from "lucide-react";

interface InvoicePrintProps {
  sale: any;
  onClose: () => void;
}

export function InvoicePrint({ sale, onClose }: InvoicePrintProps) {
  const { data: payments } = useMachinePayments();
  const { data: agreements } = useFranchiseAgreements(sale.franchise_id);

  // Get agreement values or fallback to franchise values
  const getAgreementValue = (field: string) => {
    let value;
    if (!agreements || agreements.length === 0) {
      value = sale.franchises?.[field];
    } else {
      const latestAgreement = agreements
        .filter(a => new Date(a.effective_date) <= new Date(sale.sales_date))
        .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
      
      if (latestAgreement) {
        value = latestAgreement[field];
      } else {
        value = sale.franchises?.[field];
      }
    }
    return Number(value) || 0;
  };



  const handlePrint = () => {
    // print the whole preview area (includes header/info/summary) so layout matches preview
    const printContent = document.getElementById('invoice-print-area') || document.getElementById('invoice-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${window.location.origin}">
          <title>${sale.machines?.machine_name || ''}- Invoice: ${sale.invoice_number}</title>
          <style>
            /* hide interactive controls in printed output */
            .no-print { display: none !important; }
            @media print {
              @page { margin: 0.3in 0.4in; size: A4; }
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              color: #000;
              background: white;
              font-size: 9px;
            }
            * { box-sizing: border-box; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .text-xs { font-size: 0.65rem; }
            .text-sm { font-size: 0.7rem; }
            .text-base { font-size: 0.75rem; }
            .text-lg { font-size: 0.85rem; }
            .text-xl { font-size: 0.95rem; }
            .text-2xl { font-size: 1.1rem; }
            .text-3xl { font-size: 1.4rem; }
            .text-5xl { font-size: 4rem; }
            .mb-1 { margin-bottom: 0.1rem; }
            .mb-2 { margin-bottom: 0.15rem; }
            .mb-3 { margin-bottom: 0.2rem; }
            .mb-4 { margin-bottom: 0.25rem; }
            .mb-6 { margin-bottom: 0.35rem; }
            .max-w-4xl { max-width: 56rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mb-8 { margin-bottom: 0.8rem; }
            .mt-0 { margin-top: 0; }
            .mt-1 { margin-top: 0.15rem; }
            .mt-2 { margin-top: 0.25rem; }
            .mt-3 { margin-top: 0.4rem; }
            .mt-6 { margin-top: 0.35rem; }
            .mt-8 { margin-top: 0.8rem; }
            .p-2 { padding: 0.25rem; }
            .p-3 { padding: 0.25rem; }
            .p-4 { padding: 0.3rem; }
            .p-6 { padding: 0.4rem; }
            .p-8 { padding: 0.8rem; }
            .px-3 { padding-left: 0.35rem; padding-right: 0.35rem; }
            .px-4 { padding-left: 0.45rem; padding-right: 0.45rem; }
            .py-1 { padding-top: 0.15rem; padding-bottom: 0.15rem; }
            .py-2 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-3 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-4 { padding-top: 0.3rem; padding-bottom: 0.3rem; }
            .pt-2 { padding-top: 0.25rem; }
            .pt-4 { padding-top: 0.45rem; }
            .pt-6 { padding-top: 0.6rem; }
            .border { border: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t-2 { border-top: 2px solid; }
            .border-b-2 { border-bottom: 2px solid; }
            .border-2 { border: 2px solid; }
            .border-black { border-color: #000; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-blue-600 { border-color: #2563eb; }
            .border-green-600 { border-color: #16a34a; }
            .border-red-600 { border-color: #dc2626; }
            .border-yellow-200 { border-color: #fde047; }
            .rounded { border-radius: 0.25rem; }
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-full { border-radius: 9999px; }
            .bg-white { background-color: #fff; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-gray-200 { background-color: #e5e7eb; }
            .bg-gray-300 { background-color: #d1d5db; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-blue-600 { background-color: #2563eb; }
            .bg-green-100 { background-color: #dcfce7; }
            .bg-green-800 { background-color: #166534; }
            .bg-yellow-50 { background-color: #fefce8; }
            .bg-yellow-100 { background-color: #fef3c7; }
            .bg-yellow-200 { background-color: #fde047; }
            .bg-red-100 { background-color: #fee2e2; }
            .bg-purple-50 { background-color: #faf5ff; }
            .text-black { color: #000; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-800 { color: #1f2937; }
            .text-gray-900 { color: #111827; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-700 { color: #1d4ed8; }
            .text-red-600 { color: #dc2626; }
            .text-red-700 { color: #b91c1c; }
            .text-red-800 { color: #991b1b; }
            .text-green-600 { color: #16a34a; }
            .text-green-700 { color: #15803d; }
            .text-green-800 { color: #166534; }
            .text-yellow-700 { color: #a16207; }
            .text-yellow-800 { color: #92400e; }
            .text-blue-800 { color: #1e40af; }
            .text-blue-700 { color: #1d4ed8; }
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-2 { gap: 0.25rem; }
            .gap-3 { gap: 0.35rem; }
            .gap-4 { gap: 0.45rem; }
            .gap-6 { gap: 0.7rem; }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .sm\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .grid.grid-cols-1.sm\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .space-y-1 > * + * { margin-top: 0.15rem; }
            .space-y-2 > * + * { margin-top: 0.25rem; }
            .space-y-4 > * + * { margin-top: 0.45rem; }
            .space-x-4 > * + * { margin-left: 0.45rem; }
            .h-8 { height: 1.2rem; }
            .h-12 { height: 1.8rem; }
            .h-16 { height: 1.8rem; }
            .w-auto { width: auto; }
            .object-contain { object-fit: contain; }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin-top: 0.4rem;
              margin-bottom: 1rem;
            }
            th, td { 
              border: none; 
              padding: 1rem 1rem; 
              text-align: left;
              vertical-align: top;
              font-size: 0.7rem;
            }
            th { 
              background-color: #f9fafb;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-top: 1rem;
              margin-bottom: 1rem;
            }
            .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
            .divide-y > * + * { border-top: 1px solid #e5e7eb; }
            .divide-gray-200 > * + * { border-color: #e5e7eb; }
            .hover\:bg-gray-50:hover { background-color: #f9fafb; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .font-light { font-weight: 300; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, monospace; }
            .opacity-60 { opacity: 0.6; }
            .overflow-hidden { overflow: hidden; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    try {
      // Dynamic import of html2canvas and jspdf
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const element = document.getElementById('invoice-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        foreignObjectRendering: false,
        ignoreElements: (element) => element.tagName === 'IFRAME',
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('*').forEach(el => {
          });
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const invoiceNumber = sale.invoice_number || `clw-${new Date(sale.sales_date).getFullYear()}-001`;
      pdf.save(`invoice-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to print dialog
      window.print();
    }
  };

  const handleDownloadJPG = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas');
      
      const element = document.getElementById('invoice-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        foreignObjectRendering: false,
        ignoreElements: (element) => element.tagName === 'IFRAME',
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('*').forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.textRendering = 'geometricPrecision';
            // Fix alignment for bordered amounts
            if (htmlEl.style.border && htmlEl.style.border.includes('2px solid')) {
              htmlEl.style.display = 'flex';
              htmlEl.style.alignItems = 'center';
              htmlEl.style.justifyContent = 'center';
              htmlEl.style.textAlign = 'center';
              htmlEl.style.minHeight = '40px';
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const link = document.createElement('a');
      const invoiceNumber = sale.invoice_number || `clw-${new Date(sale.sales_date).getFullYear()}-001`;
      
      link.download = `invoice-${invoiceNumber}.jpg`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error('Error generating JPG:', error);
    }
  };

  // Calculate amounts based on agreement rates
  const coinPrice = getAgreementValue('coin_price') || 0;
  const dollPrice = getAgreementValue('doll_price') || 0;
  const vatPercentage = getAgreementValue('vat_percentage') || 0;
  const franchiseShare = getAgreementValue('franchise_share') || 60;
  const cloweeShare = getAgreementValue('clowee_share') || 40;
  
  const calculatedSalesAmount = (sale.coin_sales || 0) * coinPrice;
  const calculatedPrizeCost = (sale.prize_out_quantity || 0) * dollPrice;
  const calculatedVatAmount = calculatedSalesAmount * vatPercentage / 100;
  const calculatedNetSales = calculatedSalesAmount - calculatedVatAmount;
  
  // Calculate net profit (Sales - VAT - Prize Cost)
  const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
  
  // Calculate maintenance from net profit
  const maintenancePercentage = getAgreementValue('maintenance_percentage') || 0;
  const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
  
  // Calculate franchise and clowee profits AFTER deducting maintenance
  const profitAfterMaintenance = netProfit - maintenanceAmount;
  const calculatedFranchiseProfit = (profitAfterMaintenance * franchiseShare) / 100;
  const calculatedCloweeProfit = (profitAfterMaintenance * cloweeShare) / 100;

  // Calculate Pay To Clowee amount
  const amountAdjustment = Number(sale.amount_adjustment) || 0;
  const calculatedPayToClowee = calculatedCloweeProfit + calculatedPrizeCost + maintenanceAmount - (getAgreementValue('electricity_cost') || 0) - amountAdjustment;

  // Calculate dynamic payment status (modified for invoice)
  const getPaymentStatus = (sale: any) => {
    const salePayments = payments?.filter(p => p.invoice_id === sale.id) || [];
    const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    if (totalPaid === 0) return { status: 'Due', totalPaid, balance: calculatedPayToClowee };
    if (totalPaid >= calculatedPayToClowee) return { status: 'Paid', totalPaid, balance: 0 };
    return { status: 'Partial', totalPaid, balance: calculatedPayToClowee - totalPaid };
  };

  const paymentInfo = getPaymentStatus(sale);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Invoice Print Preview</DialogTitle>
        <style>{`
          @media print {
            body > *:not([role="dialog"]) { display: none !important; }
            [role="dialog"] { position: static !important; max-width: none !important; }
            #invoice-print-area > *:not(#invoice-content) { display: none !important; }
            #invoice-content { 
              position: static !important;
              transform: scale(0.75) !important;
              transform-origin: top left !important;
              width: 133.33% !important;
              padding: 0.5cm !important;
              background: white !important;
              max-width: none !important;
              margin: 0 !important;
            }
            @page { 
              margin: 0.3cm; 
              size: A4 portrait; 
            }
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: white !important;
            }
          }
        `}</style>
        {/* top-level area that will be printed to match preview */}
        <div id="invoice-print-area" className="p-3 sm:p-6">
          {/* Print Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6 no-print">
            <h2 className="text-xl sm:text-2xl font-bold">Invoice Preview</h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button onClick={handlePrint} className="border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none">
                <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Print Invoice</span>
                <span className="sm:hidden">Print</span>
              </Button>
              <Button onClick={handleDownloadPDF} className="border-2 border-green-600 text-green-600 bg-green-50 hover:bg-green-100 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button onClick={handleDownloadJPG} className="border-2 border-purple-600 text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none">
                <Image className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Download JPG</span>
                <span className="sm:hidden">JPG</span>
              </Button>
              <Button onClick={onClose} variant="outline" className="text-xs sm:text-sm px-2 sm:px-4">
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Close</span>
                <span className="sm:hidden">X</span>
              </Button>
            </div>
          </div>

          {/* Invoice Content */}
          <div id="invoice-content" className="bg-white p-3 sm:p-6 max-w-4xl mx-auto">

          {/* Modern Header */}
          <div className="border-b-2 border-blue-600 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <img 
                  src="/clowee logo.png" 
                  alt="Clowee Logo" 
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">CLOWEE</h1>
                  <p className="text-sm text-gray-600 mt-0">I3 Technologies</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-blue-600 mb-1">INVOICE</h2>
              </div>
            </div>
          </div>

          {/* Invoice Info Card */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4 sm:mb-6">
            <table style={{ width: '100%', border: 'none' }}>
              <tr>
                <td style={{ width: '33.33%', verticalAlign: 'top', border: 'none', padding: '0.5rem' }}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">BILL TO</h3>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">Franchises: {sale.franchises?.name || 'Franchise Partner'}</p>
                    <p>Branch: {sale.machines?.machine_name || 'Machine Location'}</p>
                  </div>
                </td>
                <td style={{ width: '33.33%', verticalAlign: 'top', border: 'none', padding: '0.5rem' }}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">BILLING PERIOD</h3>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">{sale.franchises?.payment_duration || 'Monthly'}</p>
                    <p className="text-xs">
                      {(() => {
                        const saleDate = new Date(sale.sales_date);
                        const paymentDuration = sale.franchises?.payment_duration || 'Monthly';
                        
                        if (paymentDuration === 'Half Monthly') {
                          const day = saleDate.getDate();
                          const year = saleDate.getFullYear();
                          const month = saleDate.getMonth();
                          
                          if (day <= 15) {
                            const startDate = new Date(year, month, 1);
                            const endDate = new Date(year, month, 15);
                            return `${startDate.getDate()}${startDate.getDate() === 1 ? 'st' : 'th'} ${startDate.toLocaleString('default', { month: 'short' })} ${year} to 15th ${endDate.toLocaleString('default', { month: 'short' })} ${year}`;
                          } else {
                            const startDate = new Date(year, month, 16);
                            const endDate = new Date(year, month + 1, 0);
                            return `16th ${startDate.toLocaleString('default', { month: 'short' })} ${year} to ${endDate.getDate()}${endDate.getDate() === 31 ? 'st' : endDate.getDate() === 30 ? 'th' : endDate.getDate() === 29 ? 'th' : endDate.getDate() === 28 ? 'th' : 'th'} ${endDate.toLocaleString('default', { month: 'short' })} ${year}`;
                          }
                        } else {
                          const year = saleDate.getFullYear();
                          const month = saleDate.getMonth();
                          const startDate = new Date(year, month, 1);
                          const endDate = new Date(year, month + 1, 0);
                          return `1st ${startDate.toLocaleString('default', { month: 'short' })} ${year} to ${endDate.getDate()}${endDate.getDate() === 31 ? 'st' : endDate.getDate() === 30 ? 'th' : endDate.getDate() === 29 ? 'th' : endDate.getDate() === 28 ? 'th' : 'th'} ${endDate.toLocaleString('default', { month: 'short' })} ${year}`;
                        }
                      })()} 
                    </p>
                  </div>
                </td>
                <td style={{ width: '33.33%', verticalAlign: 'top', border: 'none', padding: '0.5rem' }}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">INVOICE Details</h3>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">No: {sale.invoice_number || `CLW-${new Date(sale.sales_date).getFullYear()}-001`}</p>
                    <p className="font-medium">Date: {formatDate(sale.sales_date)}</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          {/* Modern Invoice Table */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Sales(Profit Sharing) Summary</h3>
              </div>
              
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider">Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Coin Sales
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">৳{Number(getAgreementValue('coin_price') || 0).toFixed(2)}/coin</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{sale.coin_sales?.toLocaleString() || '0'} coins</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">৳{calculatedSalesAmount.toFixed(2)}</td>
                  </tr>
                  {calculatedVatAmount > 0 && (
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">VAT - {getAgreementValue('vat_percentage') || 0}% (Sales - {getAgreementValue('vat_percentage') || 0}% Vat)</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">-</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">-</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">-৳{calculatedVatAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  {calculatedVatAmount > 0 && (
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900" colSpan={3}>Net Sales (After VAT)</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">৳{calculatedNetSales.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Prize Out Cost (Deducted)
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">৳{Number(getAgreementValue('doll_price') || 0).toFixed(2)}/doll</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{sale.prize_out_quantity?.toLocaleString() || '0'} pcs</td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">-৳{calculatedPrizeCost.toFixed(2)}</td>
                  </tr>
                  {(getAgreementValue('electricity_cost') || 0) > 0 && (
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">Electricity Cost (Deducted)</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">-</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">-</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">-৳{Number(getAgreementValue('electricity_cost') || 0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {/* Summary Section */}
              <div className="bg-gray-50 px-4 py-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-blue-800">Net Profit (Sales{calculatedVatAmount > 0 ? ' - VAT' : ''} - Prize Cost{(getAgreementValue('electricity_cost') || 0) > 0 ? ' - Electricity Cost' : ''})</span>
                    <span className="text-lg font-semibold text-blue-700">৳{(calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost - (getAgreementValue('electricity_cost') || 0)).toFixed(2)}</span>
                  </div>
                  {(() => {
                    const maintenancePercentage = getAgreementValue('maintenance_percentage') || 0;
                    const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
                    const profitAfterMaintenance = netProfit - maintenanceAmount;
                    
                    return (
                      <>
                        {maintenanceAmount > 0 && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-sm text-gray-600">Maintenance ({maintenancePercentage}%)</span>
                            <span className="text-sm font-medium text-gray-900">৳{maintenanceAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600">{sale.franchises?.name || 'Franchise'} Profit ({franchiseShare}%)</span>
                          <span className="text-sm font-medium text-green-600">৳{calculatedFranchiseProfit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600">Clowee Profit ({cloweeShare}%)</span>
                          <span className="text-sm font-medium text-green-600">৳{calculatedCloweeProfit.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                  <div className="flex justify-between items-center py-3 border-t-2 border-blue-600 mt-3">
                    <span className="text-base font-semibold text-gray-900">Pay To Clowee (Clowee Profit + Prize Cost{(getAgreementValue('electricity_cost') || 0) > 0 ? ` - Electricity Cost` : ''}{(() => {
                      const maintenancePercentage = getAgreementValue('maintenance_percentage') || 0;
                      return maintenancePercentage > 0 ? ` + Maintenance` : '';
                    })()}{amountAdjustment > 0 ? ` - Amount Adjustment` : ''})</span>
                    <span 
                      className="text-3xl font-bold text-blue-600"
                      style={{
                        border: '2px solid #2563eb',
                        backgroundColor: '#eff6ff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: '1.2'
                      }}
                    >
                      ৳{(() => {
                        const payToClowee = calculatedCloweeProfit + calculatedPrizeCost + maintenanceAmount - 
                        (getAgreementValue('electricity_cost') || 0) - amountAdjustment;
                        return payToClowee.toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Bank Information */}
          <div className="mb-4 sm:mb-6">
            <table style={{ width: '100%', border: 'none', borderSpacing: '0.5rem' }}>
              <tr>
                <td style={{ width: '50%', verticalAlign: 'top', border: 'none' }}>
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        paymentInfo.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : paymentInfo.status === 'Partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {paymentInfo.status === 'Paid' ? 'FULLY PAID' : 
                         paymentInfo.status === 'Partial' ? 'PARTIALLY PAID' : 'PAYMENT DUE'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium text-gray-900">৳{calculatedPayToClowee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount Paid:</span>
                        <span className="font-medium text-green-600">৳{paymentInfo.totalPaid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="font-medium text-gray-900">Balance Due:</span>
                        <span 
                          className="text-3xl font-medium"
                          style={{
                            border: paymentInfo.balance <= 0 ? '2px solid #16a34a' : '2px solid #dc2626',
                            backgroundColor: paymentInfo.balance <= 0 ? '#dcfce7' : '#fee2e2',
                            color: paymentInfo.balance <= 0 ? '#16a34a' : '#dc2626',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            lineHeight: '1.2'
                          }}
                        >
                          ৳{paymentInfo.balance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                {sale.franchises?.banks && (
                  <td style={{ width: '50%', verticalAlign: 'top', border: 'none' }}>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method Details</h3>
                      <div className="space-y-2 text-sm">
                        {sale.franchises.banks.bank_name && (
                          <div>
                            <span className="text-gray-600">Bank:</span>
                            <span className="ml-2 font-medium text-gray-900">{sale.franchises.banks.bank_name}</span>
                          </div>
                        )}
                        {sale.franchises.banks.account_holder_name && (
                          <div>
                            <span className="text-gray-600">Account Holder:</span>
                            <span className="ml-2 font-medium text-gray-900">{sale.franchises.banks.account_holder_name}</span>
                          </div>
                        )}
                        {sale.franchises.banks.account_number && (
                          <div>
                            <span className="text-gray-600">Account Number:</span>
                            <span className="ml-2 font-mono text-gray-900">{sale.franchises.banks.account_number}</span>
                          </div>
                        )}
                        {sale.franchises.banks.branch_name && (
                          <div>
                            <span className="text-gray-600">Branch:</span>
                            <span className="ml-2 font-medium text-gray-900">{sale.franchises.banks.branch_name}</span>
                          </div>
                        )}
                        {sale.franchises.banks.routing_number && (
                          <div>
                            <span className="text-gray-600">Routing:</span>
                            <span className="ml-2 font-mono text-gray-900">{sale.franchises.banks.routing_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            </table>
          </div>
          
          {sale.adjustment_notes && (
            <div className="mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-1">Additional Notes</h4>
                <p className="text-sm text-yellow-700">{sale.adjustment_notes}</p>
              </div>
            </div>
          )}

          {/* Modern Footer */}
          <div className="border-t border-gray-200 pt-4 mt-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <img 
                  src="/i3 technologies logo.png" 
                  alt="i3 Technologies" 
                  className="h-8 w-auto object-contain opacity-60"
                />
                <div className="text-xs text-gray-500">
                  <p>Powered by Clowee ERP System</p>
                  <p>Clowee, I3 Technologies, Mobile: 01325-886868</p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>This is a computer generated invoice</p>
                <p>No signature required</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}