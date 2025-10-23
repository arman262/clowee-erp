import { MonthlyReportPDF } from "@/components/MonthlyReportPDF";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/integrations/postgres/client";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

export default function MonthlyReport() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const getMonthName = (monthNum: string) => {
    return months.find(m => m.value === monthNum)?.label || "";
  };

  const selectedMonthYear = `${getMonthName(selectedMonth)} ${selectedYear}`;

  useEffect(() => {
    fetchReportData();
  }, [selectedYear, selectedMonth]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).toISOString().split('T')[0];

      const [salesResult, machinesResult, franchisesResult, expensesResult, categoriesResult] = await Promise.all([
        db.from('sales').select('*').gte('sales_date', startDate).lte('sales_date', endDate).execute(),
        db.from('machines').select('*').execute(),
        db.from('franchises').select('*').execute(),
        db.from('machine_expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate).execute(),
        db.from('expense_categories').select('*').execute()
      ]);

      const sales = salesResult?.data || salesResult || [];
      const machines = machinesResult?.data || machinesResult || [];
      const franchises = franchisesResult?.data || franchisesResult || [];
      const expenses = expensesResult?.data || expensesResult || [];
      const expenseCategories = categoriesResult?.data || categoriesResult || [];

      console.log('Sales data:', sales);
      console.log('Machines data:', machines);
      console.log('Franchises data:', franchises);
      console.log('Expenses data:', expenses);
      console.log('Categories data:', expenseCategories);

      const machineMap = new Map();
      machines?.forEach(machine => machineMap.set(machine.id, machine));

      const franchiseMap = new Map();
      franchises?.forEach(franchise => franchiseMap.set(franchise.id, franchise));

      const categoryMap = new Map();
      expenseCategories?.forEach(category => categoryMap.set(category.id, category));

      let profitShareClowee = 0;
      let totalPrizeOutSales = 0;
      let maintenanceCharge = 0;
      const franchiseData: any = {};

      sales?.forEach((sale: any) => {
        const machine = machineMap.get(sale.machine_id);
        const franchise = machine ? franchiseMap.get(machine.franchise_id) : null;

        const cloweeProfit = Number(sale.clowee_profit) || 0;
        const prizeOut = Number(sale.prize_out_cost) || 0;
        const maintenance = Number(franchise?.maintenance_charge) || 0;

        profitShareClowee += cloweeProfit;
        totalPrizeOutSales += prizeOut;
        maintenanceCharge += maintenance;

        const franchiseName = franchise?.franchise_name || 'Unknown';
        if (!franchiseData[franchiseName]) {
          franchiseData[franchiseName] = { sales: 0, profitShare: 0 };
        }
        franchiseData[franchiseName].sales += Number(sale.sales_amount) || 0;
        franchiseData[franchiseName].profitShare += cloweeProfit;
      });

      let fixedCost = 0;
      let variableCost = 0;
      let totalPrizeExpense = 0;

      expenses?.forEach((expense: any) => {
        const category = categoryMap.get(expense.category_id);
        const categoryName = category?.category_name || '';
        const amount = Number(expense.total_amount) || 0;
        
        if (categoryName === 'Employee Salary' || categoryName === 'Rent' || categoryName === 'HR & Admin Cost') {
          fixedCost += amount;
        } else if (categoryName === 'Prize Purchase') {
          totalPrizeExpense += amount;
        } else if (categoryName === 'Conveyance' || categoryName === 'Local Accessories' || categoryName === 'Import Accessories' || categoryName === 'Prize Delivery Cost' || categoryName === 'Carrying Cost' || categoryName === 'Digital Marketing') {
          variableCost += amount;
        }
      });

      const prizeIncome = totalPrizeOutSales - totalPrizeExpense;

      const salesBreakdown = Object.entries(franchiseData)
        .map(([location, data]: [string, any]) => ({
          location,
          sales: data.sales,
          profitShare: data.profitShare,
        }))
        .sort((a, b) => b.sales - a.sales);

      setReportData({
        reportMonth: selectedMonthYear,
        preparedBy: "Md. Asif Sahariwar",
        income: {
          profitShareClowee,
          prizeIncome,
          maintenanceCharge,
        },
        expense: {
          fixedCost,
          variableCost,
        },
        salesBreakdown: salesBreakdown.length > 0 ? salesBreakdown : [{ location: 'No Data', sales: 0, profitShare: 0 }],
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData({
        reportMonth: selectedMonthYear,
        preparedBy: "Md. Asif Sahariwar",
        income: { profitShareClowee: 0, prizeIncome: 0, maintenanceCharge: 0 },
        expense: { fixedCost: 0, variableCost: 0 },
        salesBreakdown: [{ location: 'No Data', sales: 0, profitShare: 0 }],
      });
    } finally {
      setLoading(false);
    }
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
        <div className="flex gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-gradient-card border-border rounded-lg p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{selectedMonthYear} Report</h3>
              <p className="text-sm text-muted-foreground">
                Monthly financial summary and sales breakdown
              </p>
              {loading ? (
                <p className="text-sm text-muted-foreground mt-4">Loading report data...</p>
              ) : reportData ? (
                <div className="flex gap-4 text-sm mt-4">
                  <div>
                    <span className="text-muted-foreground">Total Income:</span>
                    <span className="ml-2 font-semibold text-success">
                      ৳{(reportData.income.profitShareClowee + reportData.income.prizeIncome + reportData.income.maintenanceCharge).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Expense:</span>
                    <span className="ml-2 font-semibold text-destructive">
                      ৳{(reportData.expense.fixedCost + reportData.expense.variableCost).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Profit:</span>
                    <span className="ml-2 font-semibold text-primary">
                      ৳{((reportData.income.profitShareClowee + reportData.income.prizeIncome + reportData.income.maintenanceCharge) - (reportData.expense.fixedCost + reportData.expense.variableCost)).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <Button 
              onClick={() => setShowReport(true)}
              className="bg-gradient-primary hover:opacity-90"
              disabled={loading}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Report
            </Button>
          </div>
        </div>
      </div>

      {showReport && reportData && (
        <MonthlyReportPDF 
          data={reportData}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
