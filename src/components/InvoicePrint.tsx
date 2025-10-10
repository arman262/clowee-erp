import { formatDate } from "@/lib/dateUtils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Download } from "lucide-react";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { useFranchiseAgreements } from "@/hooks/useFranchiseAgreements";
import Franchises from "@/pages/Franchises";

interface InvoicePrintProps {
  sale: any;
  onClose: () => void;
}

export function InvoicePrint({ sale, onClose }: InvoicePrintProps) {
  const { data: payments } = useMachinePayments();
  const { data: agreements } = useFranchiseAgreements(sale.franchise_id);

  // Get agreement values or fallback to franchise values
  const getAgreementValue = (field: string) => {
    if (!agreements || agreements.length === 0) {
      return sale.franchises?.[field];
    }
    
    const latestAgreement = agreements
      .filter(a => new Date(a.effective_date) <= new Date(sale.sales_date))
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
    
    if (latestAgreement) {
      return latestAgreement[field];
    }
    return sale.franchises?.[field];
  };

  // Calculate dynamic payment status (modified for invoice)
  const getPaymentStatus = (sale: any) => {
    const salePayments = payments?.filter(p => p.invoice_id === sale.id) || [];
    const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const payToClowee = Number(sale.pay_to_clowee || 0);
    
    if (totalPaid === 0) return { status: 'Due', totalPaid, balance: payToClowee };
    if (totalPaid >= payToClowee) return { status: 'Paid', totalPaid, balance: 0 };
    return { status: 'Partial', totalPaid, balance: payToClowee - totalPaid };
  };

  const paymentInfo = getPaymentStatus(sale);

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice Print</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .bg-gray-100 { background-color: #f5f5f5; }
            .bg-gray-200 { background-color: #e5e5e5; }
            .text-red-600 { color: #dc2626; }
            .text-green-600 { color: #16a34a; }
            .text-green-700 { color: #15803d; }
            .text-yellow-700 { color: #a16207; }
            .text-red-700 { color: #b91c1c; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
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
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const invoiceNumber = sale.invoice_number || `clw/${new Date(sale.sales_date).getFullYear()}/${sale.id.slice(-3).padStart(3, '0')}`;
      pdf.save(`invoice-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to print dialog
      window.print();
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
  const netRevenue = calculatedSalesAmount - calculatedPrizeCost;
  
  // Calculate franchise and clowee profits based on agreement rates
  const calculatedFranchiseProfit = (netRevenue * franchiseShare) / 100;
  const calculatedCloweeProfit = (netRevenue * cloweeShare) / 100;

  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Invoice Print Preview</DialogTitle>
        <div className="p-6">
          {/* Print Controls */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Invoice Preview</h2>
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                <Printer className="h-4 w-4 mr-2" />
                Print Invoice
              </Button>
              <Button onClick={handleDownloadPDF} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={onClose} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>

          {/* Invoice Content */}
          <div id="invoice-content" className="bg-white border border-gray-300 p-8">

          {/* Header with Logos */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <img 
                src="/clowee logo.png" 
                alt="Clowee Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black">SALES INVOICE</h1>
              <p className="text-gray-800 mt-2">Clowee</p>
            </div>
            <div className="flex items-center">
              <img 
                src="/i3 technologies logo.png" 
                alt="i3 Technologies Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Invoice Details</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-black text-sm">Invoice Number:</span>
                  <span className="font-medium text-black text-sm">{sale.invoice_number || `clw/${new Date(sale.sales_date).getFullYear()}/${sale.id.slice(-3).padStart(3, '0')}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black text-sm">Sales Period:</span>
                  <span className="font-medium text-black text-sm">
                    {(() => {
                      const saleDate = new Date(sale.sales_date);
                      const paymentDuration = sale.payment_duration || 'Monthly';
                      
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
                          const endDate = new Date(year, month + 1, 0); // Last day of month
                          return `16th ${startDate.toLocaleString('default', { month: 'short' })} ${year} to ${endDate.getDate()}${endDate.getDate() === 31 ? 'st' : 'th'} ${endDate.toLocaleString('default', { month: 'short' })} ${year}`;
                        }
                      } else {
                        // Monthly - show full month
                        const year = saleDate.getFullYear();
                        const month = saleDate.getMonth();
                        const startDate = new Date(year, month, 1);
                        const endDate = new Date(year, month + 1, 0);
                        return `1st ${startDate.toLocaleString('default', { month: 'short' })} ${year} to ${endDate.getDate()}${endDate.getDate() === 31 ? 'st' : 'th'} ${endDate.toLocaleString('default', { month: 'short' })} ${year}`;
                      }
                    })()} 
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black text-sm">Invoice Date:</span>
                  <span className="font-medium text-black text-sm">{formatDate(new Date().toISOString())}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Machine & Franchise Details</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-black text-sm">Franchise:</span>
                  <span className="font-medium text-black text-sm">{sale.franchises?.name || 'No Franchise'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black text-sm">Machine Location:</span>
                  <span className="font-medium text-black text-sm">{sale.machines?.machine_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black text-sm">Payment Duration:</span>
                  <span className="font-medium text-black text-sm">{sale.payment_duration || 'Monthly'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Summary Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-black">Sales Summary</h3>
            
            {/* Time Duration */}
            <div className="mb-3 p-2 bg-gray-100 border border-black rounded">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-black">Billing Period:</span>
                <span className="text-sm text-black">
                  {(() => {
                    const saleDate = new Date(sale.sales_date);
                    const paymentDuration = sale.payment_duration || 'Monthly';
                    
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
                        return `16th ${startDate.toLocaleString('default', { month: 'short' })} ${year} to ${endDate.getDate()}${endDate.getDate() === 31 ? 'st' : 'th'} ${endDate.toLocaleString('default', { month: 'short' })} ${year}`;
                      }
                    } else {
                      const year = saleDate.getFullYear();
                      const month = saleDate.getMonth();
                      const startDate = new Date(year, month, 1);
                      const endDate = new Date(year, month + 1, 0);
                      return `1st ${startDate.toLocaleString('default', { month: 'short' })} ${year} to ${endDate.getDate()}${endDate.getDate() === 31 ? 'st' : 'th'} ${endDate.toLocaleString('default', { month: 'short' })} ${year}`;
                    }
                  })()} 
                </span>
              </div>
            </div>

            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black px-3 py-2 text-left text-black font-semibold text-sm">Description</th>
                  <th className="border border-black px-3 py-2 text-center text-black font-semibold text-sm">Rate</th>
                  <th className="border border-black px-3 py-2 text-right text-black font-semibold text-sm">Quantity</th>
                  <th className="border border-black px-3 py-2 text-right text-black font-semibold text-sm">Amount (৳)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-3 py-2 text-black text-sm">Coin Sales</td>
                  <td className="border border-black px-3 py-2 text-center text-black text-sm">৳{getAgreementValue('coin_price') || 0}/coin</td>
                  <td className="border border-black px-3 py-2 text-right text-black text-sm">{sale.coin_sales?.toLocaleString() || '0'} coins</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-black text-sm">৳{calculatedSalesAmount.toLocaleString()}</td>
                </tr>
                {/* Calculation Flow */}
                {sale.vat_amount > 0 && (
                  <tr>
                    <td className="border border-black px-3 py-2 text-black text-sm">VAT ({getAgreementValue('vat_percentage') || 0}%)</td>
                    <td className="border border-black px-3 py-2 text-center text-black text-sm">-</td>
                    <td className="border border-black px-3 py-2 text-right text-black text-sm">-</td>
                    <td className="border border-black px-3 py-2 text-right font-medium text-red-600 text-sm">-৳{calculatedVatAmount.toLocaleString()}</td>
                  </tr>
                )}
                {sale.vat_amount > 0 && (
                  <tr className="bg-gray-50">
                    <td className="border border-black px-3 py-2 text-black font-medium text-sm" colSpan={3}>Net Sales (After VAT)</td>
                    <td className="border border-black px-3 py-2 text-right font-medium text-black text-sm">৳{calculatedNetSales.toLocaleString()}</td>
                  </tr>
                )}
                <tr>
                  <td className="border border-black px-3 py-2 text-black text-sm">Prize Out Cost (Deducted)</td>
                  <td className="border border-black px-3 py-2 text-center text-black text-sm">৳{getAgreementValue('doll_price') || ' '}/prize</td>
                  <td className="border border-black px-3 py-2 text-right text-black text-sm">{sale.prize_out_quantity?.toLocaleString() || '0'} pcs</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-red-600 text-sm">-৳{calculatedPrizeCost.toLocaleString()}</td>
                </tr>
                {getAgreementValue('electricity_cost') > 0 && (
                  <tr>
                    <td className="border border-black px-3 py-2 text-black text-sm">Electricity Cost (Deducted)</td>
                    <td className="border border-black px-3 py-2 text-center text-black text-sm">-</td>
                    <td className="border border-black px-3 py-2 text-right text-black text-sm">-</td>
                    <td className="border border-black px-3 py-2 text-right font-medium text-red-600 text-sm">-৳{getAgreementValue('electricity_cost')?.toLocaleString() || '0'}</td>
                  </tr>
                )}
                  <tr className="bg-gray-100">
                  <td className="border border-black px-3 py-2 text-black font-medium text-sm" colSpan={3}>{sale.franchises?.name || 'Franchise'} Profit ({franchiseShare}%)</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-green-600 text-sm">৳{calculatedFranchiseProfit.toLocaleString()}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-black px-3 py-2 text-black font-medium text-sm" colSpan={3}>Clowee Profit ({cloweeShare}%)</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-green-600 text-sm">৳{calculatedCloweeProfit.toLocaleString()}</td>
                </tr>

                <tr className="bg-green-100 font-bold">
                  <td className="border border-black px-3 py-2 text-black text-sm" colSpan={3}>
                    Pay To Clowee (Clowee Profit + Prize Cost{getAgreementValue('electricity_cost') > 0 ? ` - Electricity Cost ৳${getAgreementValue('electricity_cost')?.toLocaleString() || '0'}` : ''})
                  </td>
                  <td className="border border-black px-3 py-2 text-right font-bold text-green-700 text-sm">৳{sale.pay_to_clowee?.toLocaleString() || '0'}</td>
                </tr>
              </tbody>
            </table>
            
            {/* Additional Costs */}
            {(sale.vat_amount > 0 || sale.electricity_cost > 0) && (
              <div className="mt-3 p-2 bg-yellow-50 border border-black rounded">
                {sale.vat_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-black">VAT ({sale.vat_percentage || 0}%):</span>
                    <span className="font-medium text-black">৳{sale.vat_amount.toLocaleString()}</span>
                  </div>
                )}
                {sale.electricity_cost > 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-black">Electricity Cost (Monthly):</span>
                    <span className="font-medium text-black">৳{sale.electricity_cost.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-black">Payment Status</h3>
            <div className="bg-gray-100 border border-black p-4 rounded">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-black font-medium">Total Amount Due:</span>
                    <span className="text-black font-bold">৳{Number(sale.pay_to_clowee || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-black font-medium">Amount Paid:</span>
                    <span className="text-green-600 font-bold">৳{paymentInfo.totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-black font-medium">Balance Due:</span>
                    <span className={`font-bold ${paymentInfo.balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ৳{paymentInfo.balance.toLocaleString()}
                    </span>
                  </div>

                </div>
                <div className="flex items-center justify-center">
                  <div className={`px-4 py-2 rounded-lg text-center ${
                    paymentInfo.status === 'Paid' 
                      ? 'bg-green-100 border border-green-500' 
                      : paymentInfo.status === 'Partial'
                      ? 'bg-yellow-100 border border-yellow-500'
                      : 'bg-red-100 border border-red-500'
                  }`}>
                    <span className={`font-bold text-lg ${
                      paymentInfo.status === 'Paid' 
                        ? 'text-green-700' 
                        : paymentInfo.status === 'Partial'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}>
                      {paymentInfo.status === 'Paid' ? 'FULLY PAID' : 
                       paymentInfo.status === 'Partial' ? 'PARTIALLY PAID' : 'PAYMENT DUE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Adjustment Notes */}
          {sale.adjustment_notes && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-black">Notes</h3>
              <div className="bg-gray-100 border border-black p-4 rounded">
                <p className="text-black">{sale.adjustment_notes}</p>
              </div>
            </div>
          )}

          {/* Bank Details */}
          {sale.franchises?.banks && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-1 text-black">Payment Method Bank Details</h2>
              <div className="bg-gray-100 border border-black p-3 rounded">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-black">Bank Name: {sale.franchises.banks.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black">Branch: {sale.franchises.banks.branch_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black">Account Holder: {sale.franchises.banks.account_holder_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black">Account Number: {sale.franchises.banks.account_number}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-black pt-6 mt-8">
            <div className="flex justify-between items-center">
              <div className="text-sm text-black">
                <p>This is Clowee ERP Generated invoice.</p>
                <p>Generated on {formatDate(new Date().toISOString())}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-black">Powered by</p>
                <p className="font-semibold text-black">Clowee ERP System</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}