import { formatDate } from "@/lib/dateUtils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface InvoicePrintProps {
  sale: any;
  onClose: () => void;
}

export function InvoicePrint({ sale, onClose }: InvoicePrintProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${sale.invoice_number || 'CLW-' + new Date(sale.sales_date).getDate().toString().padStart(2, '0') + '-' + (new Date(sale.sales_date).getMonth() + 1).toString().padStart(2, '0') + '-M'}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .bg-gray-100 { background-color: #f5f5f5; }
              .text-red-600 { color: #dc2626; }
              .text-green-600 { color: #16a34a; }
            </style>
          </head>
          <body>
            ${document.querySelector('#invoice-content')?.innerHTML || ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const netRevenue = sale.sales_amount - sale.prize_out_cost;

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
                  <span className="text-black text-sm">Invoice ID:</span>
                  <span className="font-medium text-black text-sm">INV-{sale.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black text-sm">Sales Date:</span>
                  <span className="font-medium text-black text-sm">{formatDate(sale.sales_date)}</span>
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
                  <span className="font-medium text-black text-sm">{sale.franchises?.payment_duration || 'Monthly'}</span>
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
                    const paymentDuration = sale.franchises?.payment_duration || 'Monthly';
                    const month = saleDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                    
                    if (paymentDuration === 'Half Monthly') {
                      const day = saleDate.getDate();
                      const half = day <= 15 ? '1st Half (1-15)' : '2nd Half (16-30/31)';
                      return `${month} - ${half}`;
                    } else if (paymentDuration === 'Weekly') {
                      const weekStart = new Date(saleDate);
                      weekStart.setDate(saleDate.getDate() - saleDate.getDay());
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      return `Week: ${weekStart.getDate()}-${weekEnd.getDate()} ${month}`;
                    } else {
                      return `${month} (Full Month)`;
                    }
                  })()} - {sale.franchises?.payment_duration || 'Monthly'}
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
                  <td className="border border-black px-3 py-2 text-center text-black text-sm">৳{sale.franchises?.coin_price || 5}/coin</td>
                  <td className="border border-black px-3 py-2 text-right text-black text-sm">{sale.coin_sales?.toLocaleString() || '0'} coins</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-black text-sm">৳{sale.sales_amount?.toLocaleString() || '0'}</td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-2 text-black text-sm">Prize Out Cost</td>
                  <td className="border border-black px-3 py-2 text-center text-black text-sm">৳{sale.franchises?.doll_price || 25}/prize</td>
                  <td className="border border-black px-3 py-2 text-right text-black text-sm">{sale.prize_out_quantity?.toLocaleString() || '0'} pcs</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-red-600 text-sm">-৳{sale.prize_out_cost?.toLocaleString() || '0'}</td>
                </tr>
                {/* Calculation Flow */}
                <tr className="bg-gray-100">
                  <td className="border border-black px-3 py-2 text-black font-medium text-sm" colSpan={3}>Sales Amount (Gross)</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-black text-sm">৳{sale.sales_amount?.toLocaleString() || '0'}</td>
                </tr>
                {sale.vat_amount > 0 && (
                  <tr>
                    <td className="border border-black px-3 py-2 text-black text-sm">VAT ({sale.franchises?.vat_percentage || 0}%)</td>
                    <td className="border border-black px-3 py-2 text-center text-black text-sm">-</td>
                    <td className="border border-black px-3 py-2 text-right text-black text-sm">-</td>
                    <td className="border border-black px-3 py-2 text-right font-medium text-red-600 text-sm">-৳{sale.vat_amount?.toLocaleString() || '0'}</td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="border border-black px-3 py-2 text-black font-medium text-sm" colSpan={3}>Net Sales (After VAT)</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-black text-sm">৳{sale.net_sales_amount?.toLocaleString() || (sale.sales_amount - (sale.vat_amount || 0)).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-2 text-black text-sm">Prize Cost (Deducted)</td>
                  <td className="border border-black px-3 py-2 text-center text-black text-sm">-</td>
                  <td className="border border-black px-3 py-2 text-right text-black text-sm">-</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-red-600 text-sm">-৳{sale.prize_out_cost?.toLocaleString() || '0'}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-black px-3 py-2 text-black font-medium text-sm" colSpan={3}>Clowee Profit ({sale.franchises?.clowee_share || 40}%)</td>
                  <td className="border border-black px-3 py-2 text-right font-medium text-green-600 text-sm">৳{sale.clowee_profit?.toLocaleString() || '0'}</td>
                </tr>
                {sale.franchises?.electricity_cost > 0 && (
                  <tr>
                    <td className="border border-black px-3 py-2 text-black text-sm">Electricity Cost</td>
                    <td className="border border-black px-3 py-2 text-center text-black text-sm">-</td>
                    <td className="border border-black px-3 py-2 text-right text-black text-sm">-</td>
                    <td className="border border-black px-3 py-2 text-right font-medium text-red-600 text-sm">-৳{sale.franchises.electricity_cost.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="bg-green-100 font-bold">
                  <td className="border border-black px-3 py-2 text-black text-sm" colSpan={3}>Pay To Clowee</td>
                  <td className="border border-black px-3 py-2 text-right font-bold text-green-700 text-sm">৳{sale.pay_to_clowee?.toLocaleString() || '0'}</td>
                </tr>
              </tbody>
            </table>
            
            {/* Additional Costs */}
            {(sale.vat_amount > 0 || sale.franchises?.electricity_cost > 0) && (
              <div className="mt-3 p-2 bg-yellow-50 border border-black rounded">
                {sale.vat_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-black">VAT ({sale.franchises?.vat_percentage || 0}%):</span>
                    <span className="font-medium text-black">৳{sale.vat_amount.toLocaleString()}</span>
                  </div>
                )}
                {sale.franchises?.electricity_cost > 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-black">Electricity Cost (Monthly):</span>
                    <span className="font-medium text-black">৳{sale.franchises.electricity_cost.toLocaleString()}</span>
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
                    <span className="text-black font-bold">৳{Number(sale.pay_to_clowee || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-black font-medium">Amount Paid:</span>
                    <span className="text-green-600 font-bold">৳{Number(sale.total_paid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-black font-medium">Balance Due:</span>
                    <span className={`font-bold ${(sale.pay_to_clowee || 0) - (sale.total_paid || 0) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ৳{Math.max(0, Number(sale.pay_to_clowee || 0) - Number(sale.total_paid || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className={`px-4 py-2 rounded-lg text-center ${
                    sale.payment_status === 'Paid' 
                      ? 'bg-green-100 border border-green-500' 
                      : sale.payment_status === 'Partial'
                      ? 'bg-yellow-100 border border-yellow-500'
                      : 'bg-red-100 border border-red-500'
                  }`}>
                    <span className={`font-bold text-lg ${
                      sale.payment_status === 'Paid' 
                        ? 'text-green-700' 
                        : sale.payment_status === 'Partial'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}>
                      {sale.payment_status === 'Paid' ? 'FULLY PAID' : 
                       sale.payment_status === 'Partial' ? 'PARTIALLY PAID' : 'PAYMENT DUE'}
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
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-black">Payment Bank Details</h3>
              <div className="bg-gray-100 border border-black p-4 rounded">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-black font-medium">Bank Name:</p>
                    <p className="text-black">{sale.franchises.banks.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black font-medium">Account Number:</p>
                    <p className="text-black font-mono">{sale.franchises.banks.account_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black font-medium">Account Holder:</p>
                    <p className="text-black">{sale.franchises.banks.account_holder_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black font-medium">Branch:</p>
                    <p className="text-black">{sale.franchises.banks.branch_name}</p>
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