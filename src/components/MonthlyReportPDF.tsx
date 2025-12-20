import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/numberUtils";
import { Download, Printer, X } from "lucide-react";
import { useFranchises } from "@/hooks/useFranchises";
import { useMachines } from "@/hooks/useMachines";
import { useSales } from "@/hooks/useSales";
import { usePrizeStock } from "@/hooks/useInventory";
import { useBanks } from "@/hooks/useBanks";
import { useBankMoneyLogs } from "@/hooks/useBankMoneyLogs";
import { useMachineExpenses } from "@/hooks/useMachineExpenses";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { db } from "@/integrations/postgres/client";
import { useEffect, useState } from "react";

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
  totalSalesAmount: number;
  inventoryValue?: {
    totalDollsInStock: number;
    averageCostPerDoll: number;
    totalInventoryValue: number;
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
  
  const { data: franchises } = useFranchises();
  const { data: machines } = useMachines();
  const { data: sales } = useSales();
  const { data: prizeStock } = usePrizeStock();
  const { data: banks } = useBanks();
  const { data: moneyLogs } = useBankMoneyLogs();
  const { data: expenses } = useMachineExpenses();
  const { data: payments } = useMachinePayments();
  const [inventoryData, setInventoryData] = useState<{
    totalDollsInStock: number;
    averageCostPerDoll: number;
    totalInventoryValue: number;
  }>({ totalDollsInStock: 0, averageCostPerDoll: 0, totalInventoryValue: 0 });
  const [nccBankBalance, setNccBankBalance] = useState(0);
  const [totalCashInHand, setTotalCashInHand] = useState(0);
  const [accessoriesData, setAccessoriesData] = useState<{
    totalQuantity: number;
    totalValue: number;
  }>({ totalQuantity: 0, totalValue: 0 });
  
  const [month, year] = data.reportMonth.split(' ');
  const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month) + 1;
  const startDate = `${year}-${monthIndex.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(parseInt(year), monthIndex, 0).getDate();
  const endDate = `${year}-${monthIndex.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  
  // Calculate inventory value for the month
  useEffect(() => {
    const calculateInventoryValue = async () => {
      try {
        const [allExpenses, allCategories, allSales, machines, stockOutHistory] = await Promise.all([
          db.from('machine_expenses').select('*').execute(),
          db.from('expense_categories').select('*').execute(),
          db.from('sales').select('*').execute(),
          db.from('machines').select('*').execute(),
          db.from('stock_out_history').select('*').execute()
        ]);
        
        const prizeCategoryId = (allCategories || []).find((cat: any) => cat.category_name === 'Prize Purchase')?.id;
        
        console.log('Prize Category ID:', prizeCategoryId);
        
        // Get machine-wise stock calculation (similar to Inventory.tsx)
        const machineMap = new Map();
        (machines || []).forEach((machine: any) => {
          if (machine.is_active !== false) {
            machineMap.set(machine.id, {
              machineId: machine.id,
              machineName: machine.machine_name,
              purchased: 0,
              prizeOut: 0,
              stock: 0,
              totalPurchaseValue: 0,
              purchaseCount: 0
            });
          }
        });
        
        // Calculate purchases up to month end with unit prices
        const prizeExpenses = (allExpenses || []).filter((exp: any) => {
          if (exp.category_id !== prizeCategoryId || !exp.expense_date) return false;
          const expenseDate = new Date(exp.expense_date).toISOString().split('T')[0];
          return expenseDate <= endDate;
        });
        
        // Get current month's purchases for pricing
        const currentMonthExpenses = prizeExpenses.filter((exp: any) => {
          const expenseDate = new Date(exp.expense_date).toISOString().split('T')[0];
          return expenseDate >= startDate && expenseDate <= endDate;
        });
        
        console.log('Prize expenses found:', prizeExpenses.length);
        console.log('Current month expenses:', currentMonthExpenses.length);
        
        prizeExpenses.forEach((exp: any) => {
          const machineId = exp.machine_id || 'no_machine';
          if (!machineMap.has(machineId)) {
            machineMap.set(machineId, {
              machineId: machineId,
              machineName: '',
              purchased: 0,
              prizeOut: 0,
              stock: 0,
              totalPurchaseValue: 0,
              purchaseCount: 0
            });
          }
          const entry = machineMap.get(machineId);
          const quantity = Number(exp.quantity) || 0;
          // Try multiple possible unit price fields
          const unitPrice = Number(exp.unit_price) || Number(exp.item_price) || (Number(exp.total_amount) / quantity) || 0;
          entry.purchased += quantity;
          entry.totalPurchaseValue += quantity * unitPrice;
          entry.purchaseCount += 1;
          
          console.log(`Machine ${machineId}: +${quantity} dolls @ ৳${unitPrice} each (from unit_price: ${exp.unit_price}, item_price: ${exp.item_price}, total_amount: ${exp.total_amount})`);
        });
        
        // Calculate prize outs up to month end
        const monthEndSales = (allSales || []).filter((sale: any) => {
          if (!sale.sales_date) return false;
          const saleDate = new Date(sale.sales_date).toISOString().split('T')[0];
          return saleDate <= endDate;
        });
        
        monthEndSales.forEach((sale: any) => {
          const machineId = sale.machine_id;
          if (machineId && machineMap.has(machineId)) {
            const entry = machineMap.get(machineId);
            entry.prizeOut += Number(sale.prize_out_quantity) || 0;
          }
        });
        
        // Include stock adjustments from stock_out_history
        (stockOutHistory || []).forEach((record: any) => {
          if ((record.adjustment_type === 'doll_add' || record.adjustment_type === 'doll_deduct') && record.machine_id) {
            const outDate = new Date(record.out_date).toISOString().split('T')[0];
            if (outDate <= endDate && machineMap.has(record.machine_id)) {
              const entry = machineMap.get(record.machine_id);
              entry.purchased += Number(record.quantity) || 0;
            }
          }
        });
        
        // Calculate stock and inventory value
        let totalDollsInStock = 0;
        let totalInventoryValue = 0;
        let totalPurchaseValue = 0;
        let totalPurchased = 0;
        
        // Calculate current month's average price
        let currentMonthTotalValue = 0;
        let currentMonthTotalQty = 0;
        
        currentMonthExpenses.forEach((exp: any) => {
          const quantity = Number(exp.quantity) || 0;
          const unitPrice = Number(exp.unit_price) || Number(exp.item_price) || (Number(exp.total_amount) / quantity) || 0;
          currentMonthTotalValue += quantity * unitPrice;
          currentMonthTotalQty += quantity;
        });
        
        machineMap.forEach((entry) => {
          entry.stock = entry.purchased - entry.prizeOut;
          totalDollsInStock += entry.stock;
          totalPurchaseValue += entry.totalPurchaseValue;
          totalPurchased += entry.purchased;
          
          console.log(`Machine ${entry.machineName}: Stock=${entry.stock}, PurchaseValue=৳${entry.totalPurchaseValue}`);
        });
        
        // Use current month's average price if available, otherwise use historical average
        let averageCostPerDoll = 0;
        if (currentMonthTotalQty > 0) {
          averageCostPerDoll = currentMonthTotalValue / currentMonthTotalQty;
          console.log('Using current month average price:', averageCostPerDoll);
        } else if (totalPurchased > 0) {
          averageCostPerDoll = totalPurchaseValue / totalPurchased;
          console.log('Using historical average price:', averageCostPerDoll);
        }
        
        totalInventoryValue = totalDollsInStock * averageCostPerDoll;
        
        console.log('Final calculation:', {
          totalDollsInStock,
          totalPurchaseValue,
          totalPurchased,
          averageCostPerDoll,
          totalInventoryValue
        });
        
        setInventoryData({
          totalDollsInStock,
          averageCostPerDoll,
          totalInventoryValue
        });
      } catch (error) {
        console.error('Error calculating inventory value:', error);
      }
    };
    
    calculateInventoryValue();
  }, [endDate]);
  
  // Calculate NCC Bank balance at end of month
  useEffect(() => {
    const calculateNccBankBalance = () => {
      const nccBank = banks?.find(b => b.bank_name === 'NCC Bank');
      if (!nccBank) {
        setNccBankBalance(0);
        return;
      }

      let balance = 0;

      // Add money logs up to end of month
      if (moneyLogs && moneyLogs.length > 0) {
        balance += moneyLogs
          .filter((log: any) => {
            if (log.bank_id !== nccBank.id || !log.created_at) return false;
            const logDate = new Date(log.created_at).toISOString().split('T')[0];
            return logDate <= endDate;
          })
          .reduce((sum: number, log: any) => {
            const amount = Number(log.amount) || 0;
            return log.action_type === 'add' ? sum + amount : sum - amount;
          }, 0);
      }

      // Add payments received up to end of month
      balance += payments?.filter(payment => {
        if (payment.bank_id !== nccBank.id || !payment.payment_date) return false;
        const paymentDate = new Date(payment.payment_date).toISOString().split('T')[0];
        return paymentDate <= endDate;
      }).reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

      // Subtract expenses up to end of month
      balance -= expenses?.filter(expense => {
        if (expense.bank_id !== nccBank.id || !expense.expense_date) return false;
        const expenseDate = new Date(expense.expense_date).toISOString().split('T')[0];
        return expenseDate <= endDate;
      }).reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0) || 0;

      setNccBankBalance(balance);
    };
    
    calculateNccBankBalance();
  }, [banks, moneyLogs, payments, expenses, endDate]);
  
  // Calculate Total Cash In Hand at end of month (Cash + MDB Bank + Bkash Personal)
  useEffect(() => {
    const calculateTotalCashInHand = () => {
      const calculateBankBalance = (bankName: string) => {
        const bank = banks?.find(b => b.bank_name === bankName);
        if (!bank) return 0;

        let balance = 0;

        // Add money logs up to end of month
        if (moneyLogs && moneyLogs.length > 0) {
          balance += moneyLogs
            .filter((log: any) => {
              if (log.bank_id !== bank.id || !log.created_at) return false;
              const logDate = new Date(log.created_at).toISOString().split('T')[0];
              return logDate <= endDate;
            })
            .reduce((sum: number, log: any) => {
              const amount = Number(log.amount) || 0;
              return log.action_type === 'add' ? sum + amount : sum - amount;
            }, 0);
        }

        // Add payments received up to end of month
        balance += payments?.filter(payment => {
          if (payment.bank_id !== bank.id || !payment.payment_date) return false;
          const paymentDate = new Date(payment.payment_date).toISOString().split('T')[0];
          return paymentDate <= endDate;
        }).reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

        // Subtract expenses up to end of month
        balance -= expenses?.filter(expense => {
          if (expense.bank_id !== bank.id || !expense.expense_date) return false;
          const expenseDate = new Date(expense.expense_date).toISOString().split('T')[0];
          return expenseDate <= endDate;
        }).reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0) || 0;

        return balance;
      };

      const cashInHand = calculateBankBalance('Cash');
      const mdbBank = calculateBankBalance('MDB Bank');
      const bkashPersonal = calculateBankBalance('Bkash(Personal)');
      
      setTotalCashInHand(cashInHand + mdbBank + bkashPersonal);
    };
    
    calculateTotalCashInHand();
  }, [banks, moneyLogs, payments, expenses, endDate]);
  
  // Calculate accessories inventory value at end of month
  useEffect(() => {
    const calculateAccessoriesValue = async () => {
      try {
        const [expenses, categories, stockOut] = await Promise.all([
          db.from('machine_expenses').select().execute(),
          db.from('expense_categories').select().execute(),
          db.from('stock_out_history').select().execute()
        ]);
        
        const accessoryCategories = (categories || []).filter((cat: any) => 
          cat.category_name === 'Local Accessories' || cat.category_name === 'Import Accessories'
        );
        
        const accessoryCategoryIds = accessoryCategories.map((cat: any) => cat.id);
        const accessoryExpenses = (expenses || []).filter((exp: any) => {
          if (!accessoryCategoryIds.includes(exp.category_id) || !exp.expense_date) return false;
          const expenseDate = new Date(exp.expense_date).toISOString().split('T')[0];
          return expenseDate <= endDate;
        });
        
        const stockInItems = (stockOut || []).filter((record: any) => {
          if (record.adjustment_type !== 'stock_in' || !record.out_date) return false;
          const outDate = new Date(record.out_date).toISOString().split('T')[0];
          return outDate <= endDate;
        });
        
        const combinedData = [...accessoryExpenses.map((exp: any) => {
          const stockOutQuantity = (stockOut || []).filter((out: any) => {
            if (out.item_id !== exp.id || !out.out_date) return false;
            const outDate = new Date(out.out_date).toISOString().split('T')[0];
            return outDate <= endDate;
          }).reduce((sum: number, out: any) => sum + (out.quantity || 0), 0);
          
          const presentStock = exp.quantity - stockOutQuantity;
          const presentTotalAmount = presentStock * (exp.item_price || 0);
          
          return {
            quantity: presentStock,
            total_amount: presentTotalAmount
          };
        }), ...stockInItems.map((item: any) => ({
          quantity: item.quantity,
          total_amount: item.total_price
        }))];
        
        const totalQuantity = combinedData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const totalValue = combinedData.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
        
        setAccessoriesData({ totalQuantity, totalValue });
      } catch (error) {
        console.error('Error calculating accessories value:', error);
      }
    };
    
    calculateAccessoriesValue();
  }, [endDate]);
  
  // Group sales data by franchise and sum monthly amounts
  const franchiseSalesMap = new Map<string, number>();
  
  (data.salesBreakdown || []).forEach(item => {
    const franchiseName = item.location || 'Unknown';
    const currentSales = franchiseSalesMap.get(franchiseName) || 0;
    franchiseSalesMap.set(franchiseName, currentSales + (Number(item.sales) || 0));
  });
  
  const machineWithSales = Array.from(franchiseSalesMap.entries())
    .filter(([name, sales]) => sales > 0)
    .map(([name, totalSales]) => ({
      name,
      totalSales,
      profitShare: 0
    }))
    .sort((a, b) => b.totalSales - a.totalSales);
  
  
  const totalMachineSales = machineWithSales.reduce((sum, m) => sum + m.totalSales, 0);
  
  const midPoint = Math.ceil(machineWithSales.length / 2);
  const leftColumn = machineWithSales.slice(0, midPoint);
  const rightColumn = machineWithSales.slice(midPoint);
  
  const totalIncome = Number(data.income?.profitShareClowee || 0) + Number(data.income?.prizeIncome || 0) + Number(data.income?.maintenanceCharge || 0);
  const totalExpense = Number(data.expense?.fixedCost || 0) + Number(data.expense?.variableCost || 0) + Number(data.income?.totalElectricityCost || 0);
  const netProfitLoss = totalIncome - totalExpense;
  
  console.log('Calculated totals:', { totalIncome, totalExpense, netProfitLoss, totalMachineSales });

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
              .sm\\:hidden { display: none !important; }
              .hidden { display: block !important; }
              .sm\\:table { display: table !important; }
              .sm\\:grid { display: grid !important; }
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
            .text-sm { font-size: 0.85rem; }
            .text-lg { font-size: 1rem; }
            .text-xl { font-size: 1.15rem; }
            .text-2xl { font-size: 1.35rem; }
            .text-3xl { font-size: 1.5rem; }
            .mb-2 { margin-bottom: 0.15rem; }
            .mb-4 { margin-bottom: 0.25rem; }
            .mb-6 { margin-bottom: 0.35rem; }
            .mt-6 { margin-top: 0.35rem; }
            .p-4 { padding: 1.3rem; }
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
            .h-8 { height: 2rem; }
            .w-auto { width: auto; }
            .object-contain { object-fit: contain; }
            .opacity-60 { opacity: 0.6; }
            .report-header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 1.5rem; margin-bottom: 1rem; }
            .report-title { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.3rem; }
            .report-subtitle { font-size: 0.9rem; opacity: 0.9; }
            .summary-card { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 1rem; margin-bottom: 0.8rem; }
            .summary-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
            .summary-value { font-size: 1.4rem; font-weight: 700; color: #1e293b; margin-top: 0.2rem; }
            .section-header { background: #1e40af; color: white; padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1rem; }
            .data-row { display: flex; justify-content: space-between; padding: 0.5rem 1rem; border-bottom: 1px solid #e2e8f0; }
            .data-row:hover { background: #f1f5f9; }
            .data-label { color: #475569; font-size: 1rem; }
            .data-value { font-weight: 600; color: #1e293b; font-size: 1.3rem; }
            .total-row { background: #e0f2fe; border-top: 2px solid #0284c7; padding: 1rem 1rem; font-weight: 700; }
            .net-profit-box { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1.2 rem; text-align: center; border-radius: 0.5rem; margin: 1rem 0; }
            .net-loss-box { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1.2rem; text-align: center; border-radius: 0.5rem; margin: 1rem 0; }
            .profit-label { font-size: 0.8rem; opacity: 0.9; margin-bottom: 0.3rem; }
            .profit-amount { font-size: 2rem; font-weight: 700; }
            .franchise-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.5rem; }
            .franchise-item { display: flex; justify-content: space-between; padding: 0.4rem 0.6rem; background: white; border: 1px solid #e2e8f0; border-radius: 0.25rem; }
            .franchise-name { font-size: 0.85rem; color: #475569; }
            .franchise-sales { font-size: 1rem; font-weight: 600; color: #1e293b; }
            .sales-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
            .sales-table th, .sales-table td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; font-size: 0.85rem; }
            .sales-table th { background-color: #f8fafc; font-weight: 600; }
            table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
            th, td { border: 1px solid #e5e7eb; padding: 0.6rem 0.8rem; text-align: left; vertical-align: top; font-size: 0.85rem; }
            th { background-color: #f9fafb; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            tbody tr:nth-child(even) { background-color: #f9fafb; }
            .financial-summary { margin: 1.5rem 0; }
            .financial-summary table { margin: 1rem 0; border: 2px solid #e5e7eb; }
            .financial-summary th { padding: 1rem 0.8rem; background-color: #f3f4f6; }
            .financial-summary td { padding: 0.8rem; line-height: 1.5; margin: 0.2rem 0; }
            .financial-summary tbody tr { margin-bottom: 0.3rem; }
            .financial-summary .total-row td { padding: 1rem 0.8rem; font-weight: bold; background-color: #f9fafb; }
            .divide-y > * + * { border-top: 1px solid #e5e7eb; }
            .hover\\:bg-gray-50:hover { background-color: #f9fafb; }
            img { max-width: 100%; height: auto; }
            .border { border: 1px solid #e5e7eb; }
            .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .gap-2 { gap: 0.5rem; }
            .gap-3 { gap: 0.75rem; }
            .p-2 { padding: 0.5rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mt-1 { margin-top: 0.25rem; }
            .text-xs { font-size: 0.75rem; }
            .text-\[10px\] { font-size: 10px; }
            .text-success { color: #16a34a; }
            .text-purple-600 { color: #9333ea; }
            .text-gray-500 { color: #6b7280; }
            .rounded { border-radius: 0.25rem; }
            .net-profit-amount {
              border: 2px solid;
              padding: 8px 12px;
              border-radius: 8px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              line-height: 1.2;
              min-width: 120px;
              font-weight: bold;
            }
            .net-profit-positive {
              border-color: #16a34a;
              background-color: #dcfce7;
              color: #16a34a;
            }
            .net-loss-negative {
              border-color: #dc2626;
              background-color: #fee2e2;
              color: #dc2626;
            }
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

      // Temporarily force desktop layout
      const mobileElements = element.querySelectorAll('.sm\\:hidden');
      const desktopElements = element.querySelectorAll('.hidden.sm\\:table, .hidden.sm\\:grid');
      
      mobileElements.forEach(el => (el as HTMLElement).style.display = 'none');
      desktopElements.forEach(el => {
        if (el.classList.contains('sm:table')) {
          (el as HTMLElement).style.display = 'table';
        } else if (el.classList.contains('sm:grid')) {
          (el as HTMLElement).style.display = 'grid';
        }
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      // Restore original layout
      mobileElements.forEach(el => (el as HTMLElement).style.display = '');
      desktopElements.forEach(el => (el as HTMLElement).style.display = '');

      const imgData = canvas.toDataURL('image/jpeg', 1);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Fit to single page if possible
      if (imgHeight > pdfHeight) {
        const scale = pdfHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = pdfHeight;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, scaledHeight, undefined, 'FAST');
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
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

          <div id="report-content" className="bg-white p-0 sm:p-6 max-w-4xl mx-auto">

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

            {/* Report Info Card */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4 sm:mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">REPORT PERIOD</h3>
                <p className="font-medium text-lg text-gray-900">{data.reportMonth}</p>
              </div>
            </div>

            {/* Financial Summary - Matching Invoice Table Style */}
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                </div>
                
                {/* Desktop Table */}
                <table className="w-full hidden sm:table print:table">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Income Category</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider border-r">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">Expense Categories</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-300">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 ">Profit Share Clowee</td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600 text-right border-r">৳{formatCurrency(data.income.profitShareClowee)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        Fixed Cost
                        <div className="text-xs text-gray-500 mt-0.5">(Office Rent, Salary, cloud Bill, etc.)</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">৳{formatCurrency(data.expense.fixedCost)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">Prize Income</td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600 text-right border-r">৳{formatCurrency(data.income.prizeIncome)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        Variable Cost
                        <div className="text-xs text-flex text-gray-500 mt-0.5">(Conveyance, Accessories, Delivery, etc.)</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">৳{formatCurrency(data.expense.variableCost)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">Maintenance Charge</td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600 text-right border-r">৳{formatCurrency(data.income.maintenanceCharge)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">Electricity Cost</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">৳{formatCurrency(data.income.totalElectricityCost)}</td>
                    </tr>
                    
                    <tr className="font-bold border-r hover:bg-gray-200">
                      <td className="px-4 py-3 text-xl text-gray-900 ">Total Income</td>
                      <td className="px-4 py-3 text-xl font-bold text-green-800 text-right border-r">৳{formatCurrency(totalIncome)}</td>
                      <td className="px-4 py-3 text-xl text-gray-900">Total Expenses</td>
                      <td className="px-4 py-3 text-xl font-bold text-red-900 text-right">৳{formatCurrency(totalExpense)}</td>
                    </tr>
                  </tbody>
                </table>
                
                {/* Mobile Card View */}
                <div className="sm:hidden print:hidden p-3 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">INCOME</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-700">Profit Share Clowee</span>
                        <span className="text-sm font-medium text-blue-600">৳{formatCurrency(data.income.profitShareClowee)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-700">Prize Income</span>
                        <span className="text-sm font-medium text-blue-600">৳{formatCurrency(data.income.prizeIncome)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-700">Maintenance Charge</span>
                        <span className="text-sm font-medium text-blue-600">৳{formatCurrency(data.income.maintenanceCharge)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-green-50 rounded font-bold">
                        <span className="text-xs text-gray-900">Total Income</span>
                        <span className="text-sm text-green-800">৳{formatCurrency(totalIncome)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">EXPENSES</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-700">Fixed Cost</span>
                        <span className="text-sm font-medium text-red-600">৳{formatCurrency(data.expense.fixedCost)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-700">Variable Cost</span>
                        <span className="text-sm font-medium text-red-600">৳{formatCurrency(data.expense.variableCost)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-700">Electricity Cost</span>
                        <span className="text-sm font-medium text-red-600">৳{formatCurrency(data.income.totalElectricityCost)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-red-50 rounded font-bold">
                        <span className="text-xl text-gray-900">Total Expenses</span>
                        <span className="text-2xl font-bold text-red-800">৳{formatCurrency(totalExpense)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-3 border-t-2 border-blue-600">
                      <span className="text-2xl font-bold text-gray-900">Net {netProfitLoss >= 0 ? 'Profit' : 'Loss'}</span>
                      <span 
                        className="text-3xl font-bold"
                        style={{
                          color: netProfitLoss >= 0 ? '#16a34a' : '#dc2626',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          lineHeight: '1.4'
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
                
                {/* Mobile Card View */}
                <div className="sm:hidden print:hidden p-3 space-y-2">
                  {machineWithSales.map((machine, index) => (
                    <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-xs font-medium text-gray-900">{machine.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">৳{formatCurrency(machine.totalSales)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-gray-50 px-2 py-3 border-gray-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Total Sales</div>
                        <div className="text-xl font-bold text-success">৳{formatCurrency(data.totalSalesAmount || 0)}</div>
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Doll Inventory</div>
                        <div className="text-xl font-bold text-purple-600">৳{formatCurrency(inventoryData.totalInventoryValue)}</div>
                        <div className="text-[12px] text-gray-500">{inventoryData.totalDollsInStock} dolls</div>
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Accessories Inventory</div>
                        <div className="text-xl font-bold text-orange-600">৳{formatCurrency(accessoriesData.totalValue)}</div>
                        <div className="text-[12px] text-gray-500">{accessoriesData.totalQuantity} items</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-1">NCC Bank</div>
                        <div className="text-xl font-bold text-blue-600">৳{formatCurrency(nccBankBalance)}</div>
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Cash In Hand</div>
                        <div className="text-xl font-bold text-green-600">৳{formatCurrency(totalCashInHand)}</div>
                        <div className="text-[12px] text-gray-500">Cash+MDB+Bkash</div>
                      </div>
                    </div>
                  </div>
                </div>
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
