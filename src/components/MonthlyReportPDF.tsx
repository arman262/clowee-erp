import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/numberUtils";
import { Download, Printer, X } from "lucide-react";

interface MonthlyReportData {
  reportMonth: string;
  preparedBy: string;
  income: {
    profitShareClowee: number;
    prizeIncome: number;
    maintenanceCharge: number;
  };
  expense: {
    fixedCost: number;
    variableCost: number;
    electricityVatOthers: number;
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
  const totalIncome = data.income.profitShareClowee + data.income.prizeIncome + data.income.maintenanceCharge;
  const totalExpense = data.expense.fixedCost + data.expense.variableCost + data.expense.electricityVatOthers;
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
              @page { margin: 0.5in; size: A4; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; background: white; }
            .page-break { page-break-after: always; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f9fafb; font-weight: 600; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .bg-green-100 { background-color: #dcfce7; }
            .bg-red-100 { background-color: #fee2e2; }
            .bg-blue-50 { background-color: #eff6ff; }
            .text-green-700 { color: #15803d; }
            .border-blue-600 { border-color: #2563eb; }
            .border-b-2 { border-bottom: 2px solid; }
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

      pdf.save(`Clowee-Monthly-Report-${data.reportMonth}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.print();
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Monthly Report Preview</DialogTitle>
        
        <div className="p-6">
          {/* Controls */}
          <div className="flex justify-between items-center gap-3 mb-6 no-print">
            <h2 className="text-2xl font-bold">Report Preview</h2>
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} className="border-2 border-green-600 text-green-600 bg-green-50 hover:bg-green-100">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={onClose} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>

          {/* Report Content */}
          <div id="report-content" className="bg-white p-8 max-w-4xl mx-auto">
            
            {/* PAGE 1 - Monthly Report Summary */}
            <div>
              {/* Header */}
              <div className="border-b-2 border-blue-600 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <img src="/clowee logo.png" alt="Clowee Logo" className="h-16 w-auto object-contain" />
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">CLOWEE</h1>
                      <p className="text-sm text-gray-600">I3 Technologies</p>
                    </div>
                  </div>
                  <img src="/i3 technologies logo.png" alt="i3 Technologies" className="h-16 w-auto object-contain" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-blue-600 mb-2">Clowee Monthly Report | {data.reportMonth}</h2>
                <p className="text-gray-600">Prepared by: {data.preparedBy}</p>
              </div>

              {/* Monthly Report Section */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 bg-blue-50 p-3 rounded">Monthly Report</h3>
                
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left font-bold">Income</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-bold">Taka</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-bold">Expense</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-bold">Taka</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-green-100">
                      <td className="border border-gray-300 px-4 py-3">Profit Share Clowee</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-medium">৳{formatCurrency(data.income.profitShareClowee)}</td>
                      <td className="border border-gray-300 px-4 py-3 bg-red-100">Fixed Cost</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-medium bg-red-100">৳{formatCurrency(data.expense.fixedCost)}</td>
                    </tr>
                    <tr className="bg-green-100">
                      <td className="border border-gray-300 px-4 py-3">Prize Income</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-medium">৳{formatCurrency(data.income.prizeIncome)}</td>
                      <td className="border border-gray-300 px-4 py-3 bg-red-100">Variable Cost</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-medium bg-red-100">৳{formatCurrency(data.expense.variableCost)}</td>
                    </tr>
                    <tr className="bg-green-100">
                      <td className="border border-gray-300 px-4 py-3">Maintenance Charge</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-medium">৳{formatCurrency(data.income.maintenanceCharge)}</td>
                      <td className="border border-gray-300 px-4 py-3 bg-red-100">Electricity + VAT + Others</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-medium bg-red-100">৳{formatCurrency(data.expense.electricityVatOthers)}</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="border border-gray-300 px-4 py-3 font-bold">Total Income</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-bold">৳{formatCurrency(totalIncome)}</td>
                      <td className="border border-gray-300 px-4 py-3 font-bold">Total Expenses</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-bold">৳{formatCurrency(totalExpense)}</td>
                    </tr>
                    <tr>
                      <td className="border-0 px-4 py-2"></td>
                      <td className="border-0 px-4 py-2"></td>
                      <td className="border-0 px-4 py-2"></td>
                      <td className="border-0 px-4 py-2"></td>
                    </tr>
                    <tr className={netProfitLoss >= 0 ? "bg-green-200" : "bg-red-200"}>
                      <td className="border border-gray-300 px-4 py-4 font-bold text-lg" colSpan={3}>
                        Net {netProfitLoss >= 0 ? "Profit" : "Loss"}
                      </td>
                      <td className="border border-gray-300 px-4 py-4 text-right font-bold text-xl text-green-700">
                        ৳{formatCurrency(Math.abs(netProfitLoss))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="mt-12 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-600 mb-8">Prepared by:</p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="font-medium">{data.preparedBy}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-8">Approved by:</p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="font-medium text-gray-400">(Signature)</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-4 mt-8">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <p>Clowee ERP System | I3 Technologies | Mobile: 01325-886868</p>
                  <p>Page 1 of 2</p>
                </div>
              </div>
            </div>

            {/* PAGE 2 - Sales Breakdown */}
            <div className="page-break mt-12">
              {/* Header */}
              <div className="border-b-2 border-blue-600 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <img src="/clowee logo.png" alt="Clowee Logo" className="h-16 w-auto object-contain" />
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">CLOWEE</h1>
                      <p className="text-sm text-gray-600">I3 Technologies</p>
                    </div>
                  </div>
                  <img src="/i3 technologies logo.png" alt="i3 Technologies" className="h-16 w-auto object-contain" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-blue-600">Sales Summary — {data.reportMonth}</h2>
              </div>

              {/* Sales Breakdown Table */}
              <div className="mb-8">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="border border-gray-300 px-4 py-3 text-left font-bold">Location</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-bold">Sales Amount</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-bold">Profit Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.salesBreakdown.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="border border-gray-300 px-4 py-3">{item.location}</td>
                        <td className="border border-gray-300 px-4 py-3 text-right">৳{formatCurrency(item.sales)}</td>
                        <td className="border border-gray-300 px-4 py-3 text-right font-medium text-green-700">৳{formatCurrency(item.profitShare)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-100">
                      <td className="border border-gray-300 px-4 py-4 font-bold text-lg">Total</td>
                      <td className="border border-gray-300 px-4 py-4 text-right font-bold text-lg">
                        ৳{formatCurrency(data.salesBreakdown.reduce((sum, item) => sum + item.sales, 0))}
                      </td>
                      <td className="border border-gray-300 px-4 py-4 text-right font-bold text-lg text-green-700">
                        ৳{formatCurrency(data.salesBreakdown.reduce((sum, item) => sum + item.profitShare, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-4 mt-8">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <p>Clowee ERP System | I3 Technologies | Mobile: 01325-886868</p>
                  <p>Page 2 of 2</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
