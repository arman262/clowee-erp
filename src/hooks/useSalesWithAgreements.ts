import { useQuery } from "@tanstack/react-query";
import { useSales } from "./useSales";
import { useAllFranchiseAgreements } from "./useFranchiseAgreements";
import { getEffectiveAgreementForSale, calculateSalesWithAgreement } from "@/lib/agreementUtils";

// Enhanced sales hook that includes agreement-based calculations
export function useSalesWithAgreements() {
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: allAgreements, isLoading: agreementsLoading } = useAllFranchiseAgreements();

  return useQuery({
    queryKey: ["sales-with-agreements", sales, allAgreements],
    queryFn: () => {
      if (!sales || !allAgreements) return [];

      return sales.map(sale => {
        // Get agreements for this franchise
        const franchiseAgreements = allAgreements.filter(
          agreement => agreement.franchise_id === sale.franchise_id
        );

        // Get effective agreement for this sale date
        const effectiveAgreement = getEffectiveAgreementForSale(
          franchiseAgreements,
          sale.sales_date
        );

        // Calculate values based on effective agreement
        const calculatedValues = effectiveAgreement 
          ? calculateSalesWithAgreement(
              sale.coin_sales || 0,
              sale.prize_out_quantity || 0,
              effectiveAgreement
            )
          : null;

        return {
          ...sale,
          effectiveAgreement,
          calculatedValues,
          agreementMismatch: calculatedValues && (
            Math.abs(Number(sale.pay_to_clowee) - calculatedValues.payToClowee) > 0.01
          )
        };
      });
    },
    enabled: !salesLoading && !agreementsLoading && !!sales && !!allAgreements,
  });
}

// Hook to get agreement history for a specific franchise
export function useFranchiseAgreementHistory(franchiseId: string) {
  const { data: allAgreements } = useAllFranchiseAgreements();

  return useQuery({
    queryKey: ["franchise-agreement-history", franchiseId, allAgreements],
    queryFn: () => {
      if (!allAgreements || !franchiseId) return [];

      return allAgreements
        .filter(agreement => agreement.franchise_id === franchiseId)
        .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
    },
    enabled: !!allAgreements && !!franchiseId,
  });
}