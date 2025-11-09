import { MonthlyReportPDF } from "@/components/MonthlyReportPDF";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/integrations/postgres/client";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/numberUtils";

export default function MonthlyReport() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [showMonthReport, setShowMonthReport] = useState(false);
  const [monthReportData, setMonthReportData] = useState<any>(null);
  const [chartYear, setChartYear] = useState(currentYear.toString());
  const [chartData, setChartData] = useState<any[]>([]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
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

  useEffect(() => {
    fetchChartData();
  }, [chartYear]);

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
      
      // Initialize all franchises with zero values
      franchises?.forEach((franchise: any) => {
        franchiseData[franchise.franchise_name] = { sales: 0, profitShare: 0, salesList: [] };
      });

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
          franchiseData[franchiseName] = { sales: 0, profitShare: 0, salesList: [] };
        }
        franchiseData[franchiseName].sales += Number(sale.sales_amount) || 0;
        franchiseData[franchiseName].profitShare += cloweeProfit;
        franchiseData[franchiseName].salesList.push({
          date: new Date(sale.sales_date).toLocaleDateString('en-GB'),
          amount: Number(sale.sales_amount) || 0
        });
      });

      let totalExpenses = 0;
      let variableCost = 0;
      const variableCategories = ['Conveyance', 'Import Accessories', 'Local Accessories', 'Digital Marketing', 'Carrying Cost', 'Prize Delivery Cost'];

      expenses?.forEach((expense: any) => {
        const category = categoryMap.get(Number(expense.category_id));
        const categoryName = category?.category_name || '';
        const amount = Number(expense.total_amount) || 0;
        
        if (categoryName !== 'Profit Share(Share Holders)') {
          totalExpenses += amount;
          if (variableCategories.includes(categoryName)) {
            variableCost += amount;
          }
        }
      });



      const salesBreakdown = Object.entries(franchiseData)
        .map(([location, data]: [string, any]) => ({
          location,
          sales: data.sales,
          profitShare: data.profitShare,
        }));

      setReportData({
        reportMonth: selectedMonthYear,
        income: {
          profitShareClowee,
          maintenanceCharge,
        },
        expense: {
          fixedCost: totalExpenses - variableCost,
          variableCost: variableCost,
        },
        salesBreakdown,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData({
        reportMonth: selectedMonthYear,
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

      const monthlyData = months.map((month, index) => {
        const monthNum = index + 1;
        const startDate = `${selectedYear}-${monthNum.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(parseInt(selectedYear), monthNum, 0).getDate();
        const endDate = `${selectedYear}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

        const monthSales = (allSales || []).filter((sale: any) => {
          if (!sale.sales_date) return false;
          const date = new Date(sale.sales_date);
          const saleDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          return saleDateLocal >= startDate && saleDateLocal <= endDate;
        });

        const monthExpenses = (allExpenses || []).filter((expense: any) => {
          if (!expense.expense_date) return false;
          const date = new Date(expense.expense_date);
          const expenseDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          return expenseDateLocal >= startDate && expenseDateLocal <= endDate;
        });

        const machinePurchaseMap = new Map();
        (allExpenses || []).forEach((expense: any) => {
          if (!expense.expense_date) return;
          const expenseDate = new Date(expense.expense_date);
          const expenseDateLocal = new Date(expenseDate.getTime() - expenseDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          if (expenseDateLocal > endDate) return;
          
          const category = categoryMap.get(Number(expense.category_id));
          if (category?.category_name === 'Prize Purchase' && expense.machine_id) {
            if (!machinePurchaseMap.has(expense.machine_id)) {
              machinePurchaseMap.set(expense.machine_id, { cost: 0, qty: 0 });
            }
            const data = machinePurchaseMap.get(expense.machine_id);
            data.cost += Number(expense.total_amount) || 0;
            data.qty += Number(expense.quantity) || 0;
          }
        });

        let totalSalesAmount = 0;
        let totalPrizeOutCost = 0;
        let totalPrizePurchaseCost = 0;
        let totalMaintenanceCost = 0;
        let totalCloweeProfit = 0;
        let totalFranchiseProfit = 0;
        let totalNetSales = 0;
        let totalVatAmount = 0;
        let totalElectricityCost = 0;

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
          totalElectricityCost += Number(franchise?.electricity_cost) || 0;

          totalSalesAmount += Number(sale.sales_amount) || 0;
          totalPrizeOutCost += Number(sale.prize_out_cost) || 0;
          totalMaintenanceCost += maintenanceAmount;
          totalCloweeProfit += cloweeProfit;
          totalFranchiseProfit += franchiseProfit;
          totalNetSales += Number(sale.net_sales_amount) || 0;

          const prizeOutQty = Number(sale.prize_out_quantity) || 0;
          const purchaseData = machinePurchaseMap.get(sale.machine_id);

          if (purchaseData && purchaseData.qty > 0) {
            const unitPrice = purchaseData.cost / purchaseData.qty;
            totalPrizePurchaseCost += prizeOutQty * unitPrice;
          }
        });

        let totalExpenses = 0;
        let totalPrizePurchaseAmount = 0;
        let totalPrizePurchaseQty = 0;
        let totalOtherExpenses = 0;
        let variableCost = 0;
        const variableCategories = ['Conveyance', 'Import Accessories', 'Local Accessories', 'Digital Marketing', 'Carrying Cost', 'Prize Delivery Cost'];

        
        monthExpenses.forEach((expense: any) => {
          const category = categoryMap.get(Number(expense.category_id));
          const categoryName = category?.category_name || '';
          const amount = Number(expense.total_amount) || 0;
          
          if (categoryName === 'Prize Purchase') {
            totalPrizePurchaseAmount += amount;
            totalPrizePurchaseQty += Number(expense.quantity) || 0;
          } else if (categoryName !== 'Profit Share(Share Holders)') {
            totalOtherExpenses += amount;
            if (variableCategories.includes(categoryName)) {
              variableCost += amount;
            }
          }
        });

        const avgPrizeRate = totalPrizePurchaseQty > 0 ? totalPrizePurchaseAmount / totalPrizePurchaseQty : 0;
        let totalPrizeOutQty = 0;
        monthSales.forEach((sale: any) => {
          totalPrizeOutQty += Number(sale.prize_out_quantity) || 0;
        });
        const totalPrizePurchaseCostForMonth = totalPrizeOutQty * avgPrizeRate;

        totalExpenses = totalOtherExpenses + totalElectricityCost;

        console.log(`${month.label} Expenses:`, {
          totalPrizePurchaseAmount,
          totalPrizePurchaseQty,
          avgPrizeRate,
          totalPrizeOutQty,
          totalPrizePurchaseCostForMonth,
          totalOtherExpenses,
          totalElectricityCost,
          totalExpenses,
          monthExpensesCount: monthExpenses.length
        });

        
        const prizeProfit = totalPrizeOutCost - totalPrizePurchaseCostForMonth;

        const totalRevenue = totalCloweeProfit + prizeProfit + totalMaintenanceCost;
        const netProfit = totalRevenue - totalOtherExpenses - totalElectricityCost;

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
          totalOtherExpenses,
          totalElectricityCost,
          variableCost,
          netProfit
        };
      });

      setYearlyData(monthlyData);
    } catch (error) {
      console.error('Error fetching yearly data:', error);
    }
  };

  const fetchChartData = async () => {
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

      const monthlyChartData = months.map((month, index) => {
        const monthNum = index + 1;
        const startDate = `${chartYear}-${monthNum.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(parseInt(chartYear), monthNum, 0).getDate();
        const endDate = `${chartYear}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

        const monthSales = (allSales || []).filter((sale: any) => {
          if (!sale.sales_date) return false;
          const date = new Date(sale.sales_date);
          const saleDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          return saleDateLocal >= startDate && saleDateLocal <= endDate;
        });

        const monthExpenses = (allExpenses || []).filter((expense: any) => {
          if (!expense.expense_date) return false;
          const date = new Date(expense.expense_date);
          const expenseDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          return expenseDateLocal >= startDate && expenseDateLocal <= endDate;
        });

        let totalCloweeProfit = 0;
        let totalFranchiseProfit = 0;
        let totalMaintenanceCost = 0;
        let totalPrizeOutCost = 0;
        let totalElectricityCost = 0;
        let totalSalesAmount = 0;

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

          totalCloweeProfit += cloweeProfit;
          totalFranchiseProfit += franchiseProfit;
          totalMaintenanceCost += maintenanceAmount;
          totalPrizeOutCost += Number(sale.prize_out_cost) || 0;
          totalElectricityCost += Number(franchise?.electricity_cost) || 0;
          totalSalesAmount += Number(sale.sales_amount) || 0;
        });

        let totalOtherExpenses = 0;
        const variableCategories = ['Conveyance', 'Import Accessories', 'Local Accessories', 'Digital Marketing', 'Carrying Cost', 'Prize Delivery Cost'];

        monthExpenses.forEach((expense: any) => {
          const category = categoryMap.get(Number(expense.category_id));
          const categoryName = category?.category_name || '';
          if (categoryName !== 'Prize Purchase' && categoryName !== 'Profit Share(Share Holders)') {
            totalOtherExpenses += Number(expense.total_amount) || 0;
          }
        });

        const totalExpenses = totalOtherExpenses + totalElectricityCost;
        const totalRevenue = totalCloweeProfit + totalMaintenanceCost;
        const prizeProfit = totalPrizeOutCost * 0.3; // Approximate prize profit
        const netProfit = totalRevenue + prizeProfit - totalExpenses;

        return {
          month: month.label.substring(0, 3),
          netProfit: Math.round(netProfit * 100) / 100,
          prizeProfit: Math.round(prizeProfit * 100) / 100,
          franchiseeProfit: Math.round(totalFranchiseProfit * 100) / 100,
          cloweeProfit: Math.round(totalCloweeProfit * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100
        };
      });

      setChartData(monthlyChartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
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
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                 Year {year}
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
                  <th className="px-4 py-2 text-right text-3xl font-bold">Net Profit</th>
                  <th className="px-4 py-2 text-right">Sales Amount</th>
                  <th className="px-4 py-2 text-right">Vat Amount</th>
                  <th className="px-4 py-2 text-right">Prize Cost</th>
                  <th className="px-4 py-2 text-right">Maintenance</th>
                  <th className="px-4 py-2 text-right">Total Revenue</th>
                  <th className="px-4 py-2 text-right">Franchisee Profit</th>
                  <th className="px-4 py-2 text-right">Clowee Profit</th>
                  <th className="px-4 py-2 text-right">Prize Profit</th>
                  <th className="px-4 py-2 text-right">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.filter((data, index) => {
                  if (selectedYear === '2025') {
                    const monthIndex = months.findIndex(m => m.label === data.month);
                    return monthIndex >= 8;
                  }
                  return true;
                }).map((data, index) => (
                  <tr 
                    key={index} 
                    className="border-t border-border hover:bg-primary/10 hover:scale-[1] cursor-pointer transition-all duration-200 ease-in-out"
                    onClick={async () => {
                      const monthIndex = months.findIndex(m => m.label === data.month);
                      if (monthIndex !== -1) {
                        const monthNum = (monthIndex + 1).toString();
                        const startDate = `${selectedYear}-${monthNum.padStart(2, '0')}-01`;
                        const lastDay = new Date(parseInt(selectedYear), monthIndex + 1, 0).getDate();
                        const endDate = `${selectedYear}-${monthNum.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

                        const [allSales, machines, franchises] = await Promise.all([
                          db.from('sales').select('*').execute(),
                          db.from('machines').select('*').execute(),
                          db.from('franchises').select('*').execute()
                        ]);

                        const sales = (allSales || []).filter((sale: any) => {
                          const saleDate = sale.sales_date;
                          return saleDate >= startDate && saleDate <= endDate;
                        });

                        const machineMap = new Map();
                        machines?.forEach(machine => machineMap.set(machine.id, machine));

                        const franchiseMap = new Map();
                        franchises?.forEach(franchise => franchiseMap.set(franchise.id, franchise));

                        const franchiseData: any = {};
                        franchises?.forEach((franchise: any) => {
                          franchiseData[franchise.franchise_name] = { sales: 0, profitShare: 0, salesList: [] };
                        });

                        sales?.forEach((sale: any) => {
                          const machine = machineMap.get(sale.machine_id);
                          const franchise = machine ? franchiseMap.get(machine.franchise_id) : null;
                          const cloweeProfit = Number(sale.clowee_profit) || 0;
                          const franchiseName = franchise?.franchise_name || 'Unknown';
                          
                          if (!franchiseData[franchiseName]) {
                            franchiseData[franchiseName] = { sales: 0, profitShare: 0, salesList: [] };
                          }
                          franchiseData[franchiseName].sales += Number(sale.sales_amount) || 0;
                          franchiseData[franchiseName].profitShare += cloweeProfit;
                          franchiseData[franchiseName].salesList.push({
                            date: new Date(sale.sales_date).toLocaleDateString('en-GB'),
                            amount: Number(sale.sales_amount) || 0
                          });
                        });

                        const salesBreakdown = Object.entries(franchiseData)
                          .map(([location, fData]: [string, any]) => ({
                            location,
                            sales: fData.sales,
                            profitShare: fData.profitShare,
                          }));

                        setMonthReportData({
                          reportMonth: `${data.month} ${selectedYear}`,
                          preparedBy: "Md. Asif Sahariwar",
                          income: {
                            profitShareClowee: data.totalCloweeProfit,
                            prizeIncome: data.prizeProfit,
                            maintenanceCharge: data.totalMaintenanceCost,
                            totalElectricityCost: data.totalElectricityCost || 0,
                          },
                          expense: {
                            fixedCost: (data.totalOtherExpenses || 0) - (data.variableCost || 0),
                            variableCost: data.variableCost || 0,
                          },
                          salesBreakdown,
                        });
                        setShowMonthReport(true);
                      }
                    }}
                  >
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
      </div>

            {/* Charts Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Financial Trends</h2>
          <Select value={chartYear} onValueChange={setChartYear}>
            <SelectTrigger className="w-[130px]">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Net Profit Trend */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Net Profit Trends
              </CardTitle>
              <CardDescription>Monthly profit trends for {chartYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netProfitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="prizeProfitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} domain={[0, 'auto']} />
                  <Tooltip 
                    formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, '']}
                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="netProfit" stroke="#10B981" fill="url(#netProfitGradient)" name="Net Profit" />
                  <Area type="monotone" dataKey="prizeProfit" stroke="#3B82F6" fill="url(#prizeProfitGradient)" name="Prize Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Total Revenue Trend */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600"/>
                Total Revenue Trend
              </CardTitle>
              <CardDescription>Monthly revenue for {chartYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#da31daff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#da31daff" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, '']}
                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="totalRevenue" stroke="#3B82F6" fill="url(#revenueGradient)" name="Total Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Franchisee Profit Trend */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Franchisee Profit Trend
              </CardTitle>
              <CardDescription>Monthly franchisee profit for {chartYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="franchiseeProfitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, '']}
                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="franchiseeProfit" stroke="#10B981" fill="url(#franchiseeProfitGradient)" name="Franchisee Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Clowee Profit Trend */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-warning"/>
                Clowee Profit Trend
              </CardTitle>
              <CardDescription>Monthly clowee profit for {chartYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cloweeProfitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, '']}
                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="cloweeProfit" stroke="#F59E0B" fill="url(#cloweeProfitGradient)" name="Clowee Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {showReport && reportData && (
        <MonthlyReportPDF 
          data={reportData}
          onClose={() => setShowReport(false)}
        />
      )}

      {showMonthReport && monthReportData && (
        <MonthlyReportPDF 
          data={monthReportData}
          onClose={() => setShowMonthReport(false)}
        />
      )}
    </div>
  );
}