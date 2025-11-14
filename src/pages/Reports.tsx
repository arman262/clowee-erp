import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { Area, Bar, BarChart, CartesianGrid, Cell, Legend, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/numberUtils";

export default function Reports() {
  const [reportType, setReportType] = useState("sales");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFranchise, setSelectedFranchise] = useState("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await db.from('machines').select().execute();
      return data || [];
    }
  });
  
  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises'],
    queryFn: async () => {
      const data = await db.from('franchises').select().execute();
      return data || [];
    }
  });
  
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const data = await db.from('expense_categories').select().execute();
      return data || [];
    }
  });
  
  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: "all", label: "All Months" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
  ];
  
  const selectedMachineName = selectedMachine === "all" 
    ? "All Machines" 
    : machines.find((m: any) => String(m.id) === selectedMachine)?.machine_name || "";
  
  const machineRelatedCategories = ["Carrying Cost", "Prize Purchase", "Prize delivery cost", "Conveyance", "Local Accessories", "Import Accessories"];
  const selectedCategoryName = categories.find((c: any) => String(c.id) === selectedCategory)?.category_name?.trim() || "";
  const showMachineDropdown = reportType === "sales" || (reportType === "expense" && (selectedCategory === "all" || machineRelatedCategories.some(cat => cat.toLowerCase() === selectedCategoryName.toLowerCase())));
  
  const selectedFranchiseName = selectedFranchise === "all" 
    ? "All Franchises" 
    : franchises.find((f: any) => String(f.id) === selectedFranchise)?.name || "";

  const { data: expenseTableData = [] } = useQuery({
    queryKey: ['expense-table-data', selectedYear, selectedMonth, selectedMachine, selectedCategory],
    queryFn: async () => {
      const [expenses, machinesData, categoriesData, stockOutHistory] = await Promise.all([
        db.from('machine_expenses').select().execute(),
        db.from('machines').select().execute(),
        db.from('expense_categories').select().execute(),
        db.from('stock_out_history').select().execute()
      ]);
      
      const accessoryCategories = (categoriesData || []).filter((cat: any) => 
        cat.category_name === 'Local Accessories' || cat.category_name === 'Import Accessories'
      );
      const accessoryCategoryIds = accessoryCategories.map((cat: any) => cat.id);
      const isAccessoryCategory = selectedCategory !== "all" && accessoryCategoryIds.some((id: any) => String(id) === String(selectedCategory));
      
      let filtered;
      if (isAccessoryCategory) {
        // For accessories, use stock_out_history
        filtered = (stockOutHistory || []).filter((record: any) => {
          if (!record.item_id || record.adjustment_type) return false;
          const expense = (expenses || []).find((exp: any) => exp.id === record.item_id);
          if (!expense || !accessoryCategoryIds.includes(expense.category_id)) return false;
          if (selectedCategory !== "all" && String(expense.category_id) !== selectedCategory) return false;
          
          const outDate = new Date(record.out_date);
          const yearMatch = outDate.getFullYear().toString() === selectedYear;
          const monthMatch = selectedMonth === "all" || outDate.getMonth().toString() === selectedMonth;
          const machineMatch = selectedMachine === "all" || (record.machine_id && String(record.machine_id) === selectedMachine);
          return yearMatch && monthMatch && machineMatch;
        }).map((record: any) => {
          const expense = (expenses || []).find((exp: any) => exp.id === record.item_id);
          return {
            ...record,
            expense_date: record.out_date,
            machine_id: record.machine_id,
            category_id: expense?.category_id,
            quantity: record.quantity,
            total_amount: record.quantity * (expense?.item_price || 0)
          };
        });
      } else {
        // For non-accessories, use machine_expenses
        filtered = (expenses || []).filter((expense: any) => {
          const expenseDate = new Date(expense.expense_date);
          const yearMatch = expenseDate.getFullYear().toString() === selectedYear;
          const monthMatch = selectedMonth === "all" || expenseDate.getMonth().toString() === selectedMonth;
          const machineMatch = selectedMachine === "all" || String(expense.machine_id) === selectedMachine;
          const categoryMatch = selectedCategory === "all" || String(expense.category_id) === selectedCategory;
          return yearMatch && monthMatch && machineMatch && categoryMatch;
        });
      }
      
      // Group by month
      const monthMap = new Map();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      filtered.forEach((expense: any) => {
        const date = new Date(expense.expense_date);
        const monthKey = date.getMonth();
        const monthYear = `${monthNames[monthKey]} ${date.getFullYear()}`;
        
        if (!monthMap.has(monthYear)) {
          monthMap.set(monthYear, { month: monthYear, quantity: 0, totalAmount: 0, monthIndex: monthKey });
        }
        
        const monthData = monthMap.get(monthYear);
        monthData.quantity += Number(expense.quantity) || 0;
        monthData.totalAmount += Number(expense.total_amount) || 0;
      });
      
      return Array.from(monthMap.values()).sort((a, b) => a.monthIndex - b.monthIndex);
    },
    enabled: reportType === "expense"
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['report-data', reportType, selectedYear, selectedMonth, selectedMachine, selectedCategory, selectedFranchise],
    queryFn: async () => {
      if (reportType === "sales") {
        const sales = await db.from('sales').select().execute();
        
        const filtered = (sales || []).filter((sale: any) => {
          const saleDate = new Date(sale.sales_date);
          const yearMatch = saleDate.getFullYear().toString() === selectedYear;
          const machineMatch = selectedMachine === "all" || String(sale.machine_id) === selectedMachine;
          return yearMatch && machineMatch;
        });
        
        const monthMap = new Map();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthNames.forEach((month, idx) => monthMap.set(idx, { month, totalSales: 0 }));
        
        filtered.forEach((sale: any) => {
          const month = new Date(sale.sales_date).getMonth();
          monthMap.get(month).totalSales += Number(sale.sales_amount) || 0;
        });
        
        return Array.from(monthMap.values());
      }
      
      if (reportType === "payment") {
        const [payments, machinesData, franchisesData] = await Promise.all([
          db.from('machine_payments').select().execute(),
          db.from('machines').select().execute(),
          db.from('franchises').select().execute()
        ]);
        
        const filtered = (payments || []).filter((payment: any) => {
          const paymentDate = new Date(payment.payment_date);
          const yearMatch = paymentDate.getFullYear().toString() === selectedYear;
          const machine = (machinesData || []).find((m: any) => m.id === payment.machine_id);
          const franchiseMatch = selectedFranchise === "all" || (machine && String(machine.franchise_id) === selectedFranchise);
          return yearMatch && franchiseMatch;
        });
        
        // If specific franchise selected, show month-wise data
        if (selectedFranchise !== "all") {
          const monthMap = new Map();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthNames.forEach((month, idx) => monthMap.set(idx, { month, totalPayment: 0 }));
          
          filtered.forEach((payment: any) => {
            const month = new Date(payment.payment_date).getMonth();
            monthMap.get(month).totalPayment += Number(payment.amount) || 0;
          });
          
          return Array.from(monthMap.values());
        }
        
        // Otherwise show franchise-wise data
        const franchisePaymentMap = new Map();
        
        filtered.forEach((payment: any) => {
          const machine = (machinesData || []).find((m: any) => m.id === payment.machine_id);
          if (machine && machine.franchise_id) {
            const franchise = (franchisesData || []).find((f: any) => f.id === machine.franchise_id);
            if (franchise) {
              const franchiseName = franchise.name;
              if (!franchisePaymentMap.has(franchiseName)) {
                franchisePaymentMap.set(franchiseName, 0);
              }
              franchisePaymentMap.set(franchiseName, franchisePaymentMap.get(franchiseName) + (Number(payment.amount) || 0));
            }
          }
        });
        
        return Array.from(franchisePaymentMap.entries()).map(([franchiseName, totalPayment]) => ({
          franchiseName,
          totalPayment
        }));
      }
      
      if (reportType === "expense") {
        const [expenses, machinesData, categoriesData, stockOutHistory] = await Promise.all([
          db.from('machine_expenses').select().execute(),
          db.from('machines').select().execute(),
          db.from('expense_categories').select().execute(),
          db.from('stock_out_history').select().execute()
        ]);
        
        const categoryMap = new Map();
        (categoriesData || []).forEach((cat: any) => {
          categoryMap.set(cat.id, cat.category_name);
        });
        
        const accessoryCategories = (categoriesData || []).filter((cat: any) => 
          cat.category_name === 'Local Accessories' || cat.category_name === 'Import Accessories'
        );
        const accessoryCategoryIds = accessoryCategories.map((cat: any) => cat.id);
        const isAccessoryCategory = selectedCategory !== "all" && accessoryCategoryIds.some((id: any) => String(id) === String(selectedCategory));
        
        let filtered;
        if (isAccessoryCategory) {
          // For accessories, use stock_out_history
          filtered = (stockOutHistory || []).filter((record: any) => {
            if (!record.item_id || record.adjustment_type) return false;
            const expense = (expenses || []).find((exp: any) => exp.id === record.item_id);
            if (!expense || !accessoryCategoryIds.includes(expense.category_id)) return false;
            if (selectedCategory !== "all" && String(expense.category_id) !== selectedCategory) return false;
            
            const outDate = new Date(record.out_date);
            const yearMatch = outDate.getFullYear().toString() === selectedYear;
            const monthMatch = selectedMonth === "all" || outDate.getMonth().toString() === selectedMonth;
            const machineMatch = selectedMachine === "all" || (record.machine_id && String(record.machine_id) === selectedMachine);
            return yearMatch && monthMatch && machineMatch;
          }).map((record: any) => {
            const expense = (expenses || []).find((exp: any) => exp.id === record.item_id);
            return {
              ...record,
              expense_date: record.out_date,
              machine_id: record.machine_id,
              category_id: expense?.category_id,
              quantity: record.quantity,
              total_amount: record.quantity * (expense?.item_price || 0)
            };
          });
        } else {
          // For non-accessories, use machine_expenses
          filtered = (expenses || []).filter((expense: any) => {
            const expenseDate = new Date(expense.expense_date);
            const yearMatch = expenseDate.getFullYear().toString() === selectedYear;
            const monthMatch = selectedMonth === "all" || expenseDate.getMonth().toString() === selectedMonth;
            const machineMatch = selectedMachine === "all" || String(expense.machine_id) === selectedMachine;
            const categoryMatch = selectedCategory === "all" || String(expense.category_id) === selectedCategory;
            return yearMatch && monthMatch && machineMatch && categoryMatch;
          });
        }
        
        const isMachineRelatedCategory = selectedCategory !== "all" && machineRelatedCategories.some(cat => selectedCategoryName.toLowerCase().includes(cat.toLowerCase()));
        
        // If machine-related category and specific machine selected with all months, show month-wise data
        if (isMachineRelatedCategory && selectedMachine !== "all" && selectedMonth === "all") {
          const monthMap = new Map();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthNames.forEach((month, idx) => monthMap.set(idx, { month, totalExpense: 0 }));
          
          filtered.forEach((expense: any) => {
            const month = new Date(expense.expense_date).getMonth();
            monthMap.get(month).totalExpense += Number(expense.total_amount) || 0;
          });
          
          return Array.from(monthMap.values());
        }
        
        // For machine-related categories with all machines, or non-machine categories, show machine-wise data
        const machineExpenseMap = new Map();
        
        filtered.forEach((expense: any) => {
          const machine = (machinesData || []).find((m: any) => m.id === expense.machine_id);
          if (machine) {
            const machineName = machine.machine_name;
            if (!machineExpenseMap.has(machineName)) {
              machineExpenseMap.set(machineName, 0);
            }
            machineExpenseMap.set(machineName, machineExpenseMap.get(machineName) + (Number(expense.total_amount) || 0));
          }
        });
        
        return Array.from(machineExpenseMap.entries()).map(([machineName, totalExpense]) => ({
          machineName,
          totalExpense
        }));
      }
      
      return [];
    },
    enabled: true
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Sales Reports
        </h1>
        <p className="text-muted-foreground mt-1">Machine-wise sales analysis</p>
      </div>

      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(reportType === "sales" || reportType === "expense" || reportType === "payment") && (
              <>
                <div className="flex-1">
                  <Label>Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {reportType === "expense" && (
                  <div className="flex-1">
                    <Label>Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category: any) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.category_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {showMachineDropdown && (
                  <div className="flex-1">
                    <Label>Machine</Label>
                    <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select machine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Machines</SelectItem>
                        {machines.map((machine: any) => (
                          <SelectItem key={machine.id} value={String(machine.id)}>
                            {machine.machine_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {reportType === "payment" && (
                  <div className="flex-1">
                    <Label>Franchise</Label>
                    <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select franchise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Franchises</SelectItem>
                        {franchises.map((franchise: any) => (
                          <SelectItem key={franchise.id} value={String(franchise.id)}>
                            {franchise.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedYear(new Date().getFullYear().toString());
                  setSelectedMonth("all");
                  setSelectedMachine("all");
                  setSelectedCategory("all");
                  setSelectedFranchise("all");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportType === "sales" && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>Monthly Sales Chart - {selectedYear} ({selectedMachineName})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }} style={{ cursor: 'pointer' }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, '']}
                  contentStyle={{ backgroundColor: 'rgba(132, 140, 152, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                  wrapperStyle={{ outline: 'none' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend />
                <Bar 
                  dataKey="totalSales" 
                  name="Total Sales (৳)"
                  radius={[8, 8, 0, 0]}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={activeIndex === index ? '#a78bfa' : 'url(#salesGradient)'}
                      style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                      stroke="none"
                    />
                  ))}
                  <LabelList 
                    dataKey="totalSales" 
                    position="top" 
                    formatter={(value: any) => `৳${formatCurrency(Number(value))}`}
                    style={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {reportType === "expense" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle>Expense Data - {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseTableData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No expense data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      (() => {
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const paginatedData = expenseTableData.slice(startIndex, endIndex);
                        const totalAmount = expenseTableData.reduce((sum, exp) => sum + exp.totalAmount, 0);
                        
                        return (
                          <>
                            {paginatedData.map((monthData: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{monthData.month}</TableCell>
                                <TableCell className="text-right">৳{formatCurrency(monthData.totalAmount)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold bg-muted/50">
                              <TableCell className="text-right"></TableCell>
                              <TableCell className="text-right">Total ৳{formatCurrency(totalAmount)}</TableCell>
                            </TableRow>
                          </>
                        );
                      })()
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {expenseTableData.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No expense data found
                  </div>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedData = expenseTableData.slice(startIndex, endIndex);
                    const totalAmount = expenseTableData.reduce((sum, exp) => sum + exp.totalAmount, 0);
                    
                    return (
                      <>
                        {paginatedData.map((monthData: any, index: number) => (
                          <div key={index} className="bg-secondary/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Month</span>
                              <span className="font-medium">{monthData.month}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Total Amount</span>
                              <span className="font-bold text-primary">৳{formatCurrency(monthData.totalAmount)}</span>
                            </div>
                          </div>
                        ))}
                        <div className="bg-muted/50 rounded-lg p-4 font-bold">
                          <div className="flex justify-between items-center">
                            <span>Total</span>
                            <span className="text-primary">৳{formatCurrency(totalAmount)}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
              {expenseTableData.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, expenseTableData.length)} of {expenseTableData.length} entries
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(expenseTableData.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(expenseTableData.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle>Expense Trend - {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={expenseTableData.map(d => ({ month: d.month.split(' ')[0].substring(0, 3), totalExpense: d.totalAmount }))} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, 'Total Expense']}
                    contentStyle={{ backgroundColor: 'rgba(132, 140, 152, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="totalExpense" 
                    stroke="#f59e0b" 
                    fill="url(#expenseAreaGradient)" 
                    strokeWidth={0}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalExpense" 
                    name="Total Expense (৳)"
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 5 }}
                    activeDot={{ r: 7, fill: '#fbbf24' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "payment" && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>
              {selectedFranchise === "all" 
                ? `Franchise-wise Pay to Clowee - ${selectedYear}` 
                : `Monthly Payment - ${selectedYear} (${selectedFranchiseName})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="paymentAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey={selectedFranchise === "all" ? "franchiseName" : "month"} stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, 'Total Payment']}
                  contentStyle={{ backgroundColor: 'rgba(132, 140, 152, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="totalPayment" 
                  stroke="#10b981" 
                  fill="url(#paymentAreaGradient)" 
                  strokeWidth={0}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalPayment" 
                  name="Total Payment (৳)"
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7, fill: '#34d399' }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="text-center pt-4 border-t border-border">
              <p className="text-lg font-bold text-primary">
                Total Payment: ৳{formatCurrency(chartData.reduce((sum, item) => sum + (item.totalPayment || 0), 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
