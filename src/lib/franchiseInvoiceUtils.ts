// Utility functions for franchise invoice calculations

export interface FranchiseInvoiceData {
  franchise: any;
  sales: any[];
  machines: any[];
  fromDate: string;
  toDate: string;
}

export interface ConsolidatedTotals {
  totalCoinSales: number;
  totalSalesAmount: number;
  totalPrizeOut: number;
  totalPrizeCost: number;
  totalVatAmount: number;
  totalNetProfit: number;
  totalMaintenanceAmount: number;
  totalCloweeProfit: number;
  totalFranchiseProfit: number;
  totalPayToClowee: number;
}

export interface MachineBreakdown {
  machineId: string;
  machineName: string;
  coinSales: number;
  salesAmount: number;
  prizeOut: number;
  prizeCost: number;
  payToClowee: number;
  salesCount: number;
}

// Get agreement value with fallback to franchise value
export const getAgreementValue = (
  franchise: any, 
  agreements: any[] | undefined, 
  field: string, 
  referenceDate: string
): number => {
  if (!agreements || agreements.length === 0) {
    return Number(franchise[field]) || 0;
  }
  
  const latestAgreement = agreements
    .filter(a => new Date(a.effective_date) <= new Date(referenceDate))
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
  
  return latestAgreement ? Number(latestAgreement[field]) || 0 : Number(franchise[field]) || 0;
};

// Calculate consolidated totals for all machines in franchise
export const calculateConsolidatedTotals = (
  franchise: any,
  sales: any[],
  agreements?: any[]
): ConsolidatedTotals => {
  return sales.reduce((acc, sale) => {
    const coinPrice = getAgreementValue(franchise, agreements, 'coin_price', sale.sales_date);
    const dollPrice = getAgreementValue(franchise, agreements, 'doll_price', sale.sales_date);
    const vatPercentage = getAgreementValue(franchise, agreements, 'vat_percentage', sale.sales_date);
    const cloweeShare = getAgreementValue(franchise, agreements, 'clowee_share', sale.sales_date) || 40;
    const franchiseShare = getAgreementValue(franchise, agreements, 'franchise_share', sale.sales_date) || 60;
    const maintenancePercentage = getAgreementValue(franchise, agreements, 'maintenance_percentage', sale.sales_date) || 0;
    const electricityCost = getAgreementValue(franchise, agreements, 'electricity_cost', sale.sales_date) || 0;

    const calculatedSalesAmount = (sale.coin_sales || 0) * coinPrice;
    const calculatedPrizeCost = (sale.prize_out_quantity || 0) * dollPrice;
    const calculatedVatAmount = calculatedSalesAmount * vatPercentage / 100;
    const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
    const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
    const profitAfterMaintenance = netProfit - maintenanceAmount;
    const cloweeProfit = (profitAfterMaintenance * cloweeShare) / 100;
    const franchiseProfit = (profitAfterMaintenance * franchiseShare) / 100;
    const payToClowee = cloweeProfit + calculatedPrizeCost + maintenanceAmount - electricityCost - (sale.amount_adjustment || 0);

    return {
      totalCoinSales: acc.totalCoinSales + (sale.coin_sales || 0),
      totalSalesAmount: acc.totalSalesAmount + calculatedSalesAmount,
      totalPrizeOut: acc.totalPrizeOut + (sale.prize_out_quantity || 0),
      totalPrizeCost: acc.totalPrizeCost + calculatedPrizeCost,
      totalVatAmount: acc.totalVatAmount + calculatedVatAmount,
      totalNetProfit: acc.totalNetProfit + netProfit,
      totalMaintenanceAmount: acc.totalMaintenanceAmount + maintenanceAmount,
      totalCloweeProfit: acc.totalCloweeProfit + cloweeProfit,
      totalFranchiseProfit: acc.totalFranchiseProfit + franchiseProfit,
      totalPayToClowee: acc.totalPayToClowee + payToClowee
    };
  }, {
    totalCoinSales: 0,
    totalSalesAmount: 0,
    totalPrizeOut: 0,
    totalPrizeCost: 0,
    totalVatAmount: 0,
    totalNetProfit: 0,
    totalMaintenanceAmount: 0,
    totalCloweeProfit: 0,
    totalFranchiseProfit: 0,
    totalPayToClowee: 0
  });
};

// Calculate machine-wise breakdown
export const calculateMachineBreakdown = (
  franchise: any,
  machines: any[],
  sales: any[],
  agreements?: any[]
): MachineBreakdown[] => {
  return machines.map(machine => {
    const machineSales = sales.filter(sale => sale.machine_id === machine.id);
    
    const machineTotal = machineSales.reduce((acc, sale) => {
      const coinPrice = getAgreementValue(franchise, agreements, 'coin_price', sale.sales_date);
      const dollPrice = getAgreementValue(franchise, agreements, 'doll_price', sale.sales_date);
      const vatPercentage = getAgreementValue(franchise, agreements, 'vat_percentage', sale.sales_date);
      const cloweeShare = getAgreementValue(franchise, agreements, 'clowee_share', sale.sales_date) || 40;
      const maintenancePercentage = getAgreementValue(franchise, agreements, 'maintenance_percentage', sale.sales_date) || 0;
      const electricityCost = getAgreementValue(franchise, agreements, 'electricity_cost', sale.sales_date) || 0;

      const calculatedSalesAmount = (sale.coin_sales || 0) * coinPrice;
      const calculatedPrizeCost = (sale.prize_out_quantity || 0) * dollPrice;
      const calculatedVatAmount = calculatedSalesAmount * vatPercentage / 100;
      const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
      const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
      const profitAfterMaintenance = netProfit - maintenanceAmount;
      const cloweeProfit = (profitAfterMaintenance * cloweeShare) / 100;
      const payToClowee = cloweeProfit + calculatedPrizeCost + maintenanceAmount - electricityCost - (sale.amount_adjustment || 0);

      return {
        coinSales: acc.coinSales + (sale.coin_sales || 0),
        salesAmount: acc.salesAmount + calculatedSalesAmount,
        prizeOut: acc.prizeOut + (sale.prize_out_quantity || 0),
        prizeCost: acc.prizeCost + calculatedPrizeCost,
        payToClowee: acc.payToClowee + payToClowee
      };
    }, { coinSales: 0, salesAmount: 0, prizeOut: 0, prizeCost: 0, payToClowee: 0 });

    return {
      machineId: machine.id,
      machineName: machine.machine_name,
      coinSales: machineTotal.coinSales,
      salesAmount: machineTotal.salesAmount,
      prizeOut: machineTotal.prizeOut,
      prizeCost: machineTotal.prizeCost,
      payToClowee: machineTotal.payToClowee,
      salesCount: machineSales.length
    };
  });
};

// Generate consolidated invoice number
export const generateConsolidatedInvoiceNumber = (
  franchise: any,
  fromDate: string,
  toDate: string
): string => {
  const year = new Date(fromDate).getFullYear();
  const month = new Date(fromDate).getMonth() + 1;
  const isHalfMonth = franchise.payment_duration === 'Half Monthly';
  
  let period = 'M'; // Monthly
  if (isHalfMonth) {
    const startDay = new Date(fromDate).getDate();
    period = startDay <= 15 ? 'H1' : 'H2';
  }
  
  const franchiseCode = franchise.name.substring(0, 3).toUpperCase();
  return `CLW-${franchiseCode}-${year}-${month.toString().padStart(2, '0')}-${period}`;
};

// Calculate payment status for consolidated invoice
export const calculateConsolidatedPaymentStatus = (
  sales: any[],
  payments: any[],
  totalPayToClowee: number
) => {
  const franchisePayments = payments?.filter(p => 
    sales.some(sale => sale.id === p.invoice_id)
  ) || [];
  
  const totalPaid = franchisePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  
  if (totalPaid === 0) {
    return { status: 'Due', totalPaid, balance: totalPayToClowee };
  }
  
  if (totalPaid >= totalPayToClowee) {
    return { status: 'Paid', totalPaid, balance: 0 };
  }
  
  return { status: 'Partial', totalPaid, balance: totalPayToClowee - totalPaid };
};

// Filter sales for franchise and date range
export const filterFranchiseSales = (
  sales: any[],
  franchiseId: string,
  machines: any[],
  fromDate: string,
  toDate: string
): any[] => {
  const franchiseMachineIds = machines
    .filter(m => m.franchise_id === franchiseId)
    .map(m => m.id);

  return sales?.filter(sale => {
    if (!sale.sales_date || !franchiseMachineIds.includes(sale.machine_id)) {
      return false;
    }
    
    const saleDate = new Date(sale.sales_date);
    const saleDateLocal = new Date(saleDate.getTime() - saleDate.getTimezoneOffset() * 60000)
      .toISOString().split('T')[0];
    
    return saleDateLocal >= fromDate && saleDateLocal <= toDate;
  }) || [];
};

// Get date range for period type
export const getDateRangeForPeriod = (
  year: number,
  month: number,
  periodType: 'half' | 'full',
  half?: 'first' | 'second'
): { fromDate: string; toDate: string } => {
  if (periodType === 'half') {
    if (half === 'first') {
      return {
        fromDate: `${year}-${month.toString().padStart(2, '0')}-01`,
        toDate: `${year}-${month.toString().padStart(2, '0')}-15`
      };
    } else {
      const lastDay = new Date(year, month, 0).getDate();
      return {
        fromDate: `${year}-${month.toString().padStart(2, '0')}-16`,
        toDate: `${year}-${month.toString().padStart(2, '0')}-${lastDay}`
      };
    }
  } else {
    const lastDay = new Date(year, month, 0).getDate();
    return {
      fromDate: `${year}-${month.toString().padStart(2, '0')}-01`,
      toDate: `${year}-${month.toString().padStart(2, '0')}-${lastDay}`
    };
  }
};