import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/numberUtils";
import { Download, Printer, X } from "lucide-react";

interface MonthlyReportData {
  reportMonth: string;
  preparedBy: string;
  income: {
    profitShareClowee: number;
    prizeIncome: number;
    maintenanceCharge: number;
    totalElectricityCost: number;
  };
  expense: {
    fixedCost: number;
    variableCost: number;
  };
  salesBreakdown: Array<{
    location: string;
    sales: number;
    profitShare: number;
  }>;
}

interface MonthlyReportPDFProps {
  data: MonthlyReportData;
  onClose: () => void;
}

export function MonthlyReportPDF({ data, onClose }: MonthlyReportPDFProps) {
  console.log('MonthlyReportPDF received data:', data);
  
  const totalIncome = data.income.profitShareClowee + data.income.prizeIncome + data.income.maintenanceCharge;
  const totalExpense = data.expense.fixedCost + data.expense.variableCost + (data.income.totalElectricityCost || 0);
  const netProfitLoss = totalIncome - totalExpense;

  const handlePrint = () => {
    const printContent = document.getElementById('report-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${window.location.origin}">
          <title>Clowee Monthly Report - ${data.reportMonth}</title>
          <style>
            @media print {
              @page { margin: 0.3in 0.4in; size: A4; }
              body { -webkit-print-color-adjust: exact; }
            }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; background: white; font-size: 9px; }
            * { box-sizing: border-box; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .text-sm { font-size: 0.7rem; }
            .text-lg { font-size: 0.85rem; }
            .text-xl { font-size: 0.95rem; }
            .text-2xl { font-size: 1.1rem; }
            .text-3xl { font-size: 1.4rem; }
            .mb-2 { margin-bottom: 0.15rem; }
            .mb-4 { margin-bottom: 0.25rem; }
            .mb-6 { margin-bottom: 0.35rem; }
            .mt-6 { margin-top: 0.35rem; }
            .p-4 { padding: 0.3rem; }
            .px-4 { padding-left: 0.45rem; padding-right: 0.45rem; }
            .py-3 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .border-b-2 { border-bottom: 2px solid; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border-t-2 { border-top: 2px solid; }
            .border-blue-600 { border-color: #2563eb; }
            .border-gray-200 { border-color: #e5e7eb; }
            .rounded-lg { border-radius: 0.5rem; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-white { background-color: #fff; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .text-blue-600 { color: #2563eb; }
            .text-green-600 { color: #16a34a; }
            .text-red-600 { color: #dc2626; }
            .space-x-4 > * + * { margin-left: 0.45rem; }
            .h-12 { height: 1.8rem; }
            .w-auto { width: auto; }
            .object-contain { object-fit: contain; }
            table { border-collapse: collapse; width: 100%; margin-top: 0.4rem; margin-bottom: 1rem; }
            th, td { border: none; padding: 1rem 1rem; text-align: left; vertical-align: top; font-size: 0.7rem; }
            th { background-color: #f9fafb; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
            .divide-y > * + * { border-top: 1px solid #e5e7eb; }
            .hover\\:bg-gray-50:hover { background-color: #f9fafb; }
            img { max-width: 100%; height: auto; }
            .border { border: 1px solid #e5e7eb; }
            .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
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
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const element = document.getElementById('report-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
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

      pdf.save(`Clowee-Monthly-Report-${data.reportMonth.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.print();
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Monthly Report Preview</DialogTitle>
        <DialogDescription className="sr-only">Preview and download monthly financial report</DialogDescription>
        
        <div className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">Report Preview</h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button onClick={handlePrint} className="border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none">
                <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Print Report</span>
                <span className="sm:hidden">Print</span>
              </Button>
              <Button onClick={handleDownloadPDF} className="border-2 border-green-600 text-green-600 bg-green-50 hover:bg-green-100 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button onClick={onClose} variant="outline" className="text-xs sm:text-sm px-2 sm:px-4">
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Close</span>
                <span className="sm:hidden">X</span>
              </Button>
            </div>
          </div>

          <div id="report-content" className="bg-white p-3 sm:p-6 max-w-4xl mx-auto">

            {/* Header - Matching Invoice */}
            <div className="border-b-2 border-blue-600 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <img src="clowee logo.png" alt="Clowee Logo" className="h-12 w-auto object-contain" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">CLOWEE</h1>
                    <p className="text-sm text-gray-600 mt-0">I3 Technologies</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-bold text-blue-600 mb-1">MONTHLY REPORT</h2>
                  <p className="text-xl font-bold text-green-600 mb-1">{data.reportMonth}</p>
                </div>
              </div>
            </div>

            {/* Report Info Card - Matching Invoice */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4 sm:mb-6">
              <table style={{ width: '100%', border: 'none' }}>
                <tr>
                  <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: '0.5rem' }}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">REPORT PERIOD</h3>
                    <div className="text-sm text-gray-900">
                      <p className="font-medium text-lg">{data.reportMonth}</p>
                    </div>
                  </td>
                  <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: '0.5rem' }}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">PREPARED BY</h3>
                    <div className="text-sm text-gray-900">
                      <p className="font-medium">{data.preparedBy}</p>
                      <p className="text-xs text-gray-600">Generated: {new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            {/* Financial Summary - Matching Invoice Table Style */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                </div>
                
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Income Category</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Expense Category</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">Profit Share Clowee</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">৳{formatCurrency(data.income.profitShareClowee)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">Fixed Cost</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">৳{formatCurrency(data.expense.fixedCost)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">Prize Income</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">৳{formatCurrency(data.income.prizeIncome)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">Variable Cost</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">৳{formatCurrency(data.expense.variableCost)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">Maintenance Charge</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">৳{formatCurrency(data.income.maintenanceCharge)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">Electricity Cost</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">৳{formatCurrency(data.income.totalElectricityCost)}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="bg-gray-50 px-4 py-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">Total Income</span>
                      <span className="text-lg font-semibold text-green-600">৳{formatCurrency(totalIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">Total Expenses</span>
                      <span className="text-lg font-semibold text-red-600">৳{formatCurrency(totalExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t-2 border-blue-600 mt-3">
                      <span className="text-base font-semibold text-gray-900">Net {netProfitLoss >= 0 ? 'Profit' : 'Loss'}</span>
                      <span 
                        className="text-3xl font-bold"
                        style={{
                          border: `2px solid ${netProfitLoss >= 0 ? '#16a34a' : '#dc2626'}`,
                          backgroundColor: netProfitLoss >= 0 ? '#dcfce7' : '#fee2e2',
                          color: netProfitLoss >= 0 ? '#16a34a' : '#dc2626',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          lineHeight: '1.2'
                        }}
                      >
                        ৳{formatCurrency(Math.abs(netProfitLoss))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Breakdown - Matching Invoice Table Style */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Sales Breakdown by Franchises</h3>
                </div>
                
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Franchises</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Sales Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Fanchise Profit Share </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.salesBreakdown.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-semibold">Total Sales </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">৳{formatCurrency(item.sales)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">৳{formatCurrency(item.profitShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


            {/* Footer - Matching Invoice */}
            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <img src="i3 technologies logo.png" alt="i3 Technologies" className="h-8 w-auto object-contain opacity-60" />
                  <div className="text-xs text-gray-500">
                    <p>Powered by Clowee ERP System</p>
                    <p>Clowee, I3 Technologies, Mobile: 01325-886868</p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>This is a computer generated report</p>
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
