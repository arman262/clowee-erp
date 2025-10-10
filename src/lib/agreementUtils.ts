import { getEffectiveAgreement } from "@/hooks/useFranchiseAgreements";

// Get effective agreement terms for a specific franchise and date
export function getEffectiveAgreementForSale(agreements: any[], saleDate: string) {
  return getEffectiveAgreement(agreements, saleDate);
}

// Calculate sales values based on effective agreement
export function calculateSalesWithAgreement(
  coinSales: number,
  prizeOut: number,
  agreement: any,
  electricityCost?: number
) {
  if (!agreement) return null;

  const coinPrice = Number(agreement.coin_price) || 0;
  const dollPrice = Number(agreement.doll_price) || 0;
  const vatPercentage = Number(agreement.vat_percentage) || 0;
  const cloweeShare = Number(agreement.clowee_share) || 40;
  const electricity = electricityCost || Number(agreement.electricity_cost) || 0;

  const salesAmount = coinSales * coinPrice;
  const prizeCost = prizeOut * dollPrice;
  const vatAmount = salesAmount * vatPercentage / 100;
  const netSalesAmount = salesAmount - vatAmount;
  const netAfterPrize = netSalesAmount - prizeCost;
  const cloweeProfit = netAfterPrize * cloweeShare / 100;
  const payToClowee = cloweeProfit + prizeCost - electricity;

  return {
    salesAmount,
    prizeCost,
    vatAmount,
    netSalesAmount,
    cloweeProfit,
    payToClowee: Math.max(0, payToClowee),
    agreement
  };
}

// Validate if agreement is effective for a given date
export function isAgreementEffective(agreement: any, date: string): boolean {
  if (!agreement || !agreement.effective_date) return false;
  
  const effectiveDate = new Date(agreement.effective_date);
  const checkDate = new Date(date);
  
  return effectiveDate <= checkDate;
}