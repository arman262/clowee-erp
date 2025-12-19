import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useFranchiseAgreements } from "@/hooks/useFranchiseAgreements";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/numberUtils";
import { 
  calculateConsolidatedTotals, 
  calculateMachineBreakdown, 
  generateConsolidatedInvoiceNumber,
  calculateConsolidatedPaymentStatus,
  getAgreementValue 
} from "@/lib/franchiseInvoiceUtils";
import { Download, Image, Printer, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";

interface FranchiseInvoicePrintProps {
  franchise: any;
  sales: any[];
  machines: any[];
  fromDate: string;
  toDate: string;
  onClose: () => void;
}

export function FranchiseInvoicePrint({ 
  franchise, 
  sales, 
  machines, 
  fromDate, 
  toDate, 
  onClose 
}: FranchiseInvoicePrintProps) {
  const { data: payments } = useMachinePayments();
  const { data: agreements } = useFranchiseAgreements(franchise.id);

  // Fetch bank details
  const { data: bankDetails } = useQuery({
    queryKey: ['bank-details', franchise.payment_bank_id],
    queryFn: async () => {
      if (!franchise.payment_bank_id) return null;
      const { data } = await db.from('banks').select('*').eq('id', franchise.payment_bank_id).single();
      return data;
    },
    enabled: !!franchise.payment_bank_id
  });

  // Calculate consolidated data using utility functions
  const consolidatedData = calculateConsolidatedTotals(franchise, sales, agreements);
  const machineBreakdowns = calculateMachineBreakdown(franchise, machines, sales, agreements);
  const paymentInfo = calculateConsolidatedPaymentStatus(sales, payments || [], consolidatedData.totalPayToClowee);
  const invoiceNumber = generateConsolidatedInvoiceNumber(franchise, fromDate, toDate);



  const handlePrint = () => {
    const printContent = document.getElementById('franchise-invoice-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Franchise Invoice - ${franchise.name}</title>
          <style>
            @page { size: A4; margin: 8mm; }
            body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 0; color: #000; background: white; }
            * { box-sizing: border-box; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .space-x-4 > * + * { margin-left: 1rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-3xl { font-size: 1.875rem; }
            .mb-1 { margin-bottom: 0.15rem; }
            .mb-2 { margin-bottom: 0.3rem; }
            .mb-3 { margin-bottom: 0.4rem; }
            .mb-4 { margin-bottom: 0.5rem; }
            .mb-6 { margin-bottom: 0.6rem; }
            .mt-3 { margin-top: 0.4rem; }
            .mt-6 { margin-top: 0.6rem; }
            .p-4 { padding: 0.5rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .px-4 { padding-left: 1rem; padding-right: 1rem; }
            .py-1 { padding-top: 0.15rem; padding-bottom: 0.15rem; }
            .py-2 { padding-top: 0.3rem; padding-bottom: 0.3rem; }
            .py-3 { padding-top: 0.4rem; padding-bottom: 0.4rem; }
            .pt-2 { padding-top: 0.3rem; }
            .pt-4 { padding-top: 0.5rem; }
            .pb-4 { padding-bottom: 0.5rem; }
            .border { border: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t-2 { border-top: 2px solid; }
            .border-b-2 { border-bottom: 2px solid; }
            .border-blue-600 { border-color: #2563eb; }
            .border-gray-200 { border-color: #e5e7eb; }
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-full { border-radius: 9999px; }
            .bg-white { background-color: #fff; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-green-100 { background-color: #dcfce7; }
            .bg-yellow-100 { background-color: #fef3c7; }
            .bg-red-100 { background-color: #fee2e2; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-700 { color: #1d4ed8; }
            .text-blue-800 { color: #1e40af; }
            .text-green-600 { color: #16a34a; }
            .text-green-800 { color: #166534; }
            .text-yellow-800 { color: #92400e; }
            .text-red-800 { color: #991b1b; }
            .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
            .overflow-hidden { overflow: hidden; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .gap-4 { gap: 0.5rem; }
            .h-8 { height: 2rem; }
            .h-12 { height: 3rem; }
            .w-auto { width: auto; }
            .object-contain { object-fit: contain; }
            .opacity-60 { opacity: 0.6; }
            table { width: 100%; border-collapse: collapse; margin: 0; }
            th, td { border: 1px solid #e5e7eb; padding: 0.25rem 0.4rem; text-align: left; font-size: 10px; }
            th { background-color: #f9fafb; font-weight: bold; color: #000; }
            tbody { background-color: #f9fafb; color: #000; }
            .no-print { display: none !important; }
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Franchise Invoice Preview</DialogTitle>
        
        <div className="p-6">
          {/* Print Controls */}
          <div className="flex justify-between items-center mb-6 no-print">
            <h2 className="text-2xl font-bold">Franchise Invoice Preview</h2>
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100">
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
          <div id="franchise-invoice-content" className="bg-white p-6">
            
            {/* Header */}
            <div className="border-b-2 border-blue-600 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <img src="/clowee logo.png" alt="Clowee Logo" className="h-12 w-auto object-contain" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">CLOWEE</h1>
                    <p className="text-sm text-gray-600">I3 Technologies</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-bold text-blue-600 mb-1">INVOICE</h2>
                </div>
              </div>
            </div>

            {/* Invoice Info */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">BILL TO</h3>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">Franchise: {franchise.name}</p>
                    <p>Machines: {machines.length} units</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">BILLING PERIOD</h3>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">{franchise.payment_duration || 'Monthly'}</p>
                    <p>{formatDate(fromDate)} to {formatDate(toDate)}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">INVOICE DETAILS</h3>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">No: {invoiceNumber}</p>
                    <p className="font-medium">Date: {formatDate(new Date().toISOString())}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Machine Breakdown Table */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-blue-800">Machine-wise Sales Breakdown</h3>
                </div>
                
                <table className="w-full">
                  <thead className="bg-gray-50 text-black">
                    <tr>
                      <th className="text-left px-4 py-3">Machine Name</th>
                      <th className="text-right">Coin Sales</th>
                      <th className="text-right">Sales Amount</th>
                      <th className="text-right">Prize Out</th>
                      <th className="text-right">Prize Cost</th>
                      <th className="text-right px-4">Pay to Clowee</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50 text-black">
                    {machineBreakdowns.map(breakdown => (
                      <tr key={breakdown.machineId}>
                        <td className="text-left px-4 py-1">{breakdown.machineName}</td>
                        <td className="text-right">{breakdown.coinSales.toLocaleString()}</td>
                        <td className="text-right">৳{formatCurrency(breakdown.salesAmount)}</td>
                        <td className="text-right">{breakdown.prizeOut.toLocaleString()}</td>
                        <td className="text-right">৳{formatCurrency(breakdown.prizeCost)}</td>
                        <td className="text-right px-4">৳{formatCurrency(breakdown.payToClowee)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-50">
                      <td className="text-left px-4 py-3">TOTAL</td>
                      <td className="text-right">{consolidatedData.totalCoinSales.toLocaleString()}</td>
                      <td className="text-right">৳{formatCurrency(consolidatedData.totalSalesAmount)}</td>
                      <td className="text-right">{consolidatedData.totalPrizeOut.toLocaleString()}</td>
                      <td className="text-right">৳{formatCurrency(consolidatedData.totalPrizeCost)}</td>
                      <td className="text-right px-4">৳{formatCurrency(consolidatedData.totalPayToClowee)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Consolidated Summary */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-xl font-medium text-blue-800">Net Profit (All Machines)</span>
                    <span className="text-2xl font-semibold text-blue-700">৳{formatCurrency(consolidatedData.totalNetProfit)}</span>
                  </div>
                  {consolidatedData.totalMaintenanceAmount > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600">Maintenance ({getAgreementValue(franchise, agreements, 'maintenance_percentage', fromDate)}%)</span>
                      <span className="text-sm font-medium text-gray-900">৳{formatCurrency(consolidatedData.totalMaintenanceAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">Franchise Profit ({getAgreementValue(franchise, agreements, 'franchise_share', fromDate) || 60}%)</span>
                    <span className="text-sm font-medium text-green-600">৳{formatCurrency(consolidatedData.totalFranchiseProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">Clowee Profit ({getAgreementValue(franchise, agreements, 'clowee_share', fromDate) || 40}%)</span>
                    <span className="text-sm font-medium text-green-600">৳{formatCurrency(consolidatedData.totalCloweeProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t-2 border-blue-600 mt-3">
                    <span className="text-base font-semibold text-gray-900">Total Pay To Clowee</span>
                    <span 
                      className="text-3xl font-bold text-blue-600"
                      style={{
                        border: '2px solid #2563eb',
                        backgroundColor: '#eff6ff',
                        padding: '8px 12px',
                        borderRadius: '8px'
                      }}
                    >
                      ৳{formatCurrency(consolidatedData.totalPayToClowee)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status & Bank Information */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Payment Status - Left */}
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
                      <span className="font-medium text-gray-900">৳{formatCurrency(consolidatedData.totalPayToClowee)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-medium text-green-600">৳{formatCurrency(paymentInfo.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="font-medium text-gray-900">Balance Due:</span>
                      <span 
                        className="text-2xl font-medium"
                        style={{
                          border: paymentInfo.balance <= 0 ? '2px solid #16a34a' : '2px solid #dc2626',
                          backgroundColor: paymentInfo.balance <= 0 ? '#dcfce7' : '#fee2e2',
                          color: paymentInfo.balance <= 0 ? '#16a34a' : '#dc2626',
                          padding: '8px 12px',
                          borderRadius: '8px'
                        }}
                      >
                        ৳{formatCurrency(paymentInfo.balance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Information - Right */}
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Payment Method Details</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-900"><span className="font-semibold">Bank:</span> {bankDetails?.bank_name || 'N/A'}</p>
                    <p className="text-gray-900"><span className="font-semibold">Account Holder:</span> {bankDetails?.account_holder_name || 'N/A'}</p>
                    <p className="text-gray-900"><span className="font-semibold">Account Number:</span> {bankDetails?.account_number || 'N/A'}</p>
                    <p className="text-gray-900"><span className="font-semibold">Branch:</span> {bankDetails?.branch_name || 'N/A'}</p>
                    <p className="text-gray-900"><span className="font-semibold">Routing:</span> {bankDetails?.routing_number || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <img src="/i3 technologies logo.png" alt="i3 Technologies" className="h-8 w-auto object-contain opacity-60" />
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