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
  const [yearlyData, setYearlyData] = useState<any[]>([]);

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
    fetchYearlyData();
  }, [selectedYear, selectedMonth]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      const [allSales, machines, franchises, allExpenses, expenseCategories] = await Promise.all([
        db.from('sales').select('*').execute(),
        db.from('machines').select('*').execute(),
        db.from('franchises').select('*').execute(),
        db.from('machine_expenses').select('*').execute(),
        db.from('expense_categories').select('*').execute()
      ]);

      const sales = (allSales || []).filter((sale: any) => {
        const saleDate = sale.sales_date;
        return saleDate >= startDate && saleDate <= endDate;
      });

      const expenses = (allExpenses || []).filter((expense: any) => {
        if (!expense.expense_date) return false;
        const date = new Date(expense.expense_date);
        const expenseDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return expenseDateLocal >= startDate && expenseDateLocal <= endDate;
      });

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

      let totalExpenses = 0;

      expenses?.forEach((expense: any) => {
        const category = categoryMap.get(Number(expense.category_id));
        const categoryName = category?.category_name || '';
        const amount = Number(expense.total_amount) || 0;
        
        if (categoryName !== 'Profit Share(Share Holders)') {
          totalExpenses += amount;
        }
      });



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
          maintenanceCharge,
        },
        expense: {
          fixedCost: totalExpenses,
          variableCost: 0,
        },
        salesBreakdown: salesBreakdown.length > 0 ? salesBreakdown : [{ location: 'No Data', sales: 0, profitShare: 0 }],
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData({
        reportMonth: selectedMonthYear,
        preparedBy: "Md. Asif Sahariwar",
        income: { profitShareClowee: 0, maintenanceCharge: 0 },
        expense: { fixedCost: 0, variableCost: 0 },
        salesBreakdown: [{ location: 'No Data', sales: 0, profitShare: 0 }],
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchYearlyData = async () => {
    try {
      const [allSales, machines, franchises, allExpenses, expenseCategories] = await Promise.all([
        db.from('sales').select('*').execute(),
        db.from('machines').select('*').execute(),
        db.from('franchises').select('*').execute(),
        db.from('machine_expenses').select('*').execute(),
        db.from('expense_categories').select('*').execute()
      ]);

      const machineMap = new Map();
      machines?.forEach(machine => machineMap.set(machine.id, machine));

      const franchiseMap = new Map();
      franchises?.forEach(franchise => franchiseMap.set(franchise.id, franchise));

      const categoryMap = new Map();
      expenseCategories?.forEach(category => categoryMap.set(category.id, category));

      // Calculate average prize purchase price from ALL expenses (not month-filtered)
      const prizePurchaseExpenses = (allExpenses || []).filter((e: any) => {
        const category = categoryMap.get(Number(e.category_id));
        return category?.category_name === 'Prize Purchase';
      });
      const totalPrizePurchaseCost = prizePurchaseExpenses.reduce((sum: number, e: any) => sum + Number(e.total_amount || 0), 0);
      const totalPrizePurchaseQty = prizePurchaseExpenses.reduce((sum: number, e: any) => sum + Number(e.quantity || 0), 0);
      const avgPrizePurchasePrice = totalPrizePurchaseQty > 0 ? totalPrizePurchaseCost / totalPrizePurchaseQty : 0;

      const monthlyData = months.map((month, index) => {
        const monthNum = index + 1;
        const startDate = `${selectedYear}-${monthNum.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(parseInt(selectedYear), monthNum, 0).getDate();
        const endDate = `${selectedYear}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

        const monthSales = (allSales || []).filter((sale: any) => {
          const saleDate = sale.sales_date;
          return saleDate >= startDate && saleDate <= endDate;
        });

        const monthExpenses = (allExpenses || []).filter((expense: any) => {
          if (!expense.expense_date) return false;
          const date = new Date(expense.expense_date);
          const expenseDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          return expenseDateLocal >= startDate && expenseDateLocal <= endDate;
        });

        let totalSalesAmount = 0;
        let totalPrizeOutCost = 0;
        let totalPrizeOutQuantity = 0;
        let totalMaintenanceCost = 0;
        let totalCloweeProfit = 0;
        let totalFranchiseProfit = 0;
        let totalNetSales = 0;
        let totalVatAmount = 0;

        monthSales.forEach((sale: any) => {
          const machine = machineMap.get(sale.machine_id);
          const franchise = machine ? franchiseMap.get(machine.franchise_id) : null;
          const maintenancePercentage = Number(franchise?.maintenance_percentage) || 0;
          const cloweeShare = Number(franchise?.clowee_share) || 40;
          const franchiseShare = Number(franchise?.franchise_share) || 60;
          const netProfit = (Number(sale.sales_amount) || 0) - (Number(sale.vat_amount) || 0) - (Number(sale.prize_out_cost) || 0);
          const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
          const profitAfterMaintenance = netProfit - maintenanceAmount;
          const cloweeProfit = (profitAfterMaintenance * cloweeShare) / 100;
          const franchiseProfit = (profitAfterMaintenance * franchiseShare) / 100;
          totalVatAmount += Number(sale.vat_amount) || 0;

          totalSalesAmount += Number(sale.sales_amount) || 0;
          totalPrizeOutCost += Number(sale.prize_out_cost) || 0;
          totalPrizeOutQuantity += Number(sale.prize_out_quantity) || 0;
          totalMaintenanceCost += maintenanceAmount;
          totalCloweeProfit += cloweeProfit;
          totalFranchiseProfit += franchiseProfit;
          totalNetSales += Number(sale.net_sales_amount) || 0;
        });

        let totalExpenses = 0;
        monthExpenses.forEach((expense: any) => {
          const category = categoryMap.get(Number(expense.category_id));
          const categoryName = category?.category_name || '';
          const amount = Number(expense.total_amount) || 0;
          
          if (categoryName !== 'Profit Share(Share Holders)') {
            totalExpenses += amount;
          }
        });

        // Prize Profit = (Sale Price × Quantity) - (Avg Purchase Price × Quantity)
        const prizePurchaseCost = avgPrizePurchasePrice * totalPrizeOutQuantity;
        const prizeProfit = totalPrizeOutCost - prizePurchaseCost;
        const totalRevenue = totalNetSales - totalPrizeOutCost - totalMaintenanceCost;
        const totalIncome = totalCloweeProfit + totalMaintenanceCost + prizeProfit;
        const netProfit = totalIncome - totalExpenses;

        return {
          month: month.label,
          totalSalesAmount,
          totalVatAmount,
          totalPrizeCost: totalPrizeOutCost,
          totalMaintenanceCost,
          totalRevenue,
          totalFranchiseeProfit: totalFranchiseProfit,
          totalCloweeProfit,
          prizeProfit,
          totalExpenses,
          netProfit
        };
      });

      setYearlyData(monthlyData);
    } catch (error) {
      console.error('Error fetching yearly data:', error);
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
        {/* Yearly Profit Summary Table */}
        <div className="bg-gradient-card border-border rounded-lg p-6 shadow-card">
          <h3 className="text-xl font-semibold mb-4">Profit Summary - {selectedYear}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-4 py-2 text-left">Month</th>
                  <th className="px-4 py-2 text-right font-bold">Net Profit</th>
                  <th className="px-4 py-2 text-right">Sales Amount</th>
                  <th className="px-4 py-2 text-right">Vat Amount</th>
                  <th className="px-4 py-2 text-right">Prize Cost</th>
                  <th className="px-4 py-2 text-right">Maintenance</th>
                  <th className="px-4 py-2 text-right">Total Net Profit</th>
                  <th className="px-4 py-2 text-right">Franchisee Profit</th>
                  <th className="px-4 py-2 text-right">Clowee Profit</th>
                  <th className="px-4 py-2 text-right">Prize Profit</th>
                  <th className="px-4 py-2 text-right">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((data, index) => (
                  <tr key={index} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-2 font-medium">{data.month}</td>
                      <td className="px-4 py-2 text-right font-bold text-lg">
                      <span className={data.netProfit >= 0 ? 'text-success' : 'text-destructive'}>
                        ৳{data.netProfit.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">৳{data.totalSalesAmount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right">৳{data.totalVatAmount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-red-600">৳{data.totalPrizeCost.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right">৳{data.totalMaintenanceCost.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-primary">৳{data.totalRevenue.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-green-600">৳{data.totalFranchiseeProfit.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-success">৳{data.totalCloweeProfit.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-blue-600">৳{data.prizeProfit.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-destructive">৳{data.totalExpenses.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
                      ৳{(reportData.income.profitShareClowee + reportData.income.maintenanceCharge).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      ৳{((reportData.income.profitShareClowee + reportData.income.maintenanceCharge) - (reportData.expense.fixedCost + reportData.expense.variableCost)).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
