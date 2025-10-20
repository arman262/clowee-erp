import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MonthlyReportPDF } from "@/components/MonthlyReportPDF";
import { FileText } from "lucide-react";

export default function MonthlyReport() {
  const [showReport, setShowReport] = useState(false);

  // Sample data matching the requirements
  const sampleReportData = {
    reportMonth: "September 2025",
    preparedBy: "Md. Asif Sahariwar",
    income: {
      profitShareClowee: 175236.06,
      prizeIncome: 44550.00,
      maintenanceCharge: 5769.38,
    },
    expense: {
      fixedCost: 120023.00,
      variableCost: 10360.00,
      electricityVatOthers: 3252.75,
    },
    salesBreakdown: [
      { location: "Sales Cafe Rio", sales: 141080.63, profitShare: 56432.25 },
      { location: "SHANG HIGH", sales: 98750.50, profitShare: 39500.20 },
      { location: "Dining Lounge", sales: 87650.25, profitShare: 35060.10 },
      { location: "City Center Mall", sales: 76540.00, profitShare: 30616.00 },
      { location: "Airport Terminal", sales: 65430.75, profitShare: 26172.30 },
      { location: "Shopping Plaza", sales: 54320.50, profitShare: 21728.20 },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Monthly Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate and view monthly financial reports
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-gradient-card border-border rounded-lg p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">September 2025 Report</h3>
              <p className="text-sm text-muted-foreground">
                Monthly financial summary and sales breakdown
              </p>
              <div className="flex gap-4 text-sm mt-4">
                <div>
                  <span className="text-muted-foreground">Total Income:</span>
                  <span className="ml-2 font-semibold text-success">
                    ৳{(175236.06 + 44550.00 + 5769.38).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Expense:</span>
                  <span className="ml-2 font-semibold text-destructive">
                    ৳{(120023.00 + 10360.00 + 3252.75).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Profit:</span>
                  <span className="ml-2 font-semibold text-primary">
                    ৳{(91919.69).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setShowReport(true)}
              className="bg-gradient-primary hover:opacity-90"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Report
            </Button>
          </div>
        </div>
      </div>

      {showReport && (
        <MonthlyReportPDF 
          data={sampleReportData}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
