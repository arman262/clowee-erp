import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, TrendingUp, TrendingDown } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/numberUtils";
import { useState } from "react";

interface BankTransactionsDialogProps {
  bank: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moneyLogs: any[];
  payments: any[];
  expenses: any[];
  calculateBankBalance: (bankName: string) => number;
}

export function BankTransactionsDialog({
  bank,
  open,
  onOpenChange,
  moneyLogs,
  payments,
  expenses,
  calculateBankBalance
}: BankTransactionsDialogProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (!bank) return null;

  const transactions: any[] = [];

  // Add money logs
  moneyLogs?.filter((log: any) => log.bank_id === bank.id).forEach((log: any) => {
    transactions.push({
      id: `log-${log.id}`,
      date: log.transaction_date,
      type: log.action_type === 'add' ? 'Credit' : 'Debit',
      description: `Money ${log.action_type === 'add' ? 'Added' : 'Deducted'}`,
      amount: log.amount,
      remarks: log.remarks || '',
      isCredit: log.action_type === 'add'
    });
  });

  // Add payments
  payments?.filter((p: any) => p.bank_id === bank.id).forEach((payment: any) => {
    const invoiceNumber = payment.sales?.invoice_number || payment.invoice_id?.slice(0, 8);
    transactions.push({
      id: `payment-${payment.id}`,
      date: payment.payment_date,
      type: 'Credit',
      description: `Payment - ${payment.machines?.machine_name || 'Unknown'} (Invoice #${invoiceNumber})`,
      amount: payment.amount,
      remarks: payment.remarks || '',
      isCredit: true
    });
  });

  // Add expenses
  expenses?.filter((e: any) => e.bank_id === bank.id).forEach((expense: any) => {
    transactions.push({
      id: `expense-${expense.id}`,
      date: expense.expense_date,
      type: 'Debit',
      description: `${expense.expense_categories?.category_name || 'Expense'} - ${expense.machines?.machine_name || 'General'}`,
      amount: expense.total_amount,
      remarks: expense.remarks || '',
      isCredit: false
    });
  });

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = transactions.filter(txn => {
    if (!dateFrom && !dateTo) return true;
    const txnDate = new Date(txn.date);
    if (dateFrom && txnDate < new Date(dateFrom)) return false;
    if (dateTo && txnDate > new Date(dateTo)) return false;
    return true;
  });

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    let runningBalance = 0;
    const rows = filteredTransactions.map(txn => {
      runningBalance += txn.isCredit ? Number(txn.amount) : -Number(txn.amount);
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(txn.date)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${txn.type}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${txn.description}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc2626;">${!txn.isCredit ? `৳${formatCurrency(txn.amount)}` : ''}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #16a34a;">${txn.isCredit ? `৳${formatCurrency(txn.amount)}` : ''}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">৳${formatCurrency(runningBalance)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${txn.remarks || '-'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Bank Transactions - ${bank.bank_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 10px; }
            .info { text-align: center; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; padding: 10px; border: 1px solid #ddd; text-align: left; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Bank Transactions</h1>
          <div class="info">
            <strong>${bank.bank_name}</strong><br/>
            Account: ${bank.account_number}<br/>
            ${dateFrom || dateTo ? `Period: ${dateFrom || 'Start'} to ${dateTo || 'End'}` : 'All Transactions'}<br/>
            Current Balance: ৳${formatCurrency(calculateBankBalance(bank.bank_name))}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th style="text-align: right;">Debit</th>
                <th style="text-align: right;">Credit</th>
                <th style="text-align: right;">Balance</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Bank Transactions - {bank.bank_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="bg-gradient-primary/10 p-3 sm:p-4 rounded-lg border border-primary/20 flex-1">
              <div className="text-xs sm:text-sm text-muted-foreground">Current Balance</div>
              <div className="text-xl sm:text-2xl font-bold text-success">৳{formatCurrency(calculateBankBalance(bank.bank_name))}</div>
            </div>
            <Button onClick={handlePrint} className="bg-gradient-primary w-full sm:w-auto">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
            <div className="flex-1">
              <Label className="text-xs sm:text-sm">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" />
            </div>
            <div className="flex-1">
              <Label className="text-xs sm:text-sm">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" />
            </div>
            <Button variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); }} className="w-full sm:w-auto">Clear</Button>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm">Description</TableHead>
                  <TableHead className="text-xs sm:text-sm">Debit</TableHead>
                  <TableHead className="text-xs sm:text-sm">Credit</TableHead>
                  <TableHead className="text-xs sm:text-sm">Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (() => {
                  let runningBalance = 0;
                  return filteredTransactions.map((txn) => {
                    runningBalance += txn.isCredit ? Number(txn.amount) : -Number(txn.amount);
                    return (
                      <TableRow key={txn.id}>
                        <TableCell className="text-xs sm:text-sm">{formatDate(txn.date)}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] sm:text-xs ${txn.isCredit ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                            {txn.isCredit ? <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" /> : <TrendingDown className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
                            {txn.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">{txn.description}</TableCell>
                        <TableCell className="text-destructive font-semibold text-xs sm:text-sm">
                          {!txn.isCredit && `৳${formatCurrency(txn.amount)}`}
                        </TableCell>
                        <TableCell className="text-success font-semibold text-xs sm:text-sm">
                          {txn.isCredit && `৳${formatCurrency(txn.amount)}`}
                        </TableCell>
                        <TableCell className="font-bold text-primary text-xs sm:text-sm">
                          ৳{formatCurrency(runningBalance)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">{txn.remarks || '-'}</TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
