import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'https://erp.tolpar.com.bd/api';

// Try to use franchise_agreements table, fallback to franchises table
export function useFranchiseAgreements(franchiseId?: string) {
  return useQuery({
    queryKey: ["franchise-agreements", franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];

      try {
        // Get from franchise_agreements table using db client (handles auth)
        const data = await db
          .from("franchise_agreements")
          .select("*")
          .execute();

        // Filter by franchise_id and sort by effective_date
        const agreements = (data || [])
          .filter((agreement: any) => agreement.franchise_id === franchiseId)
          .sort((a: any, b: any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());

        if (agreements && agreements.length > 0) {
          console.log('Found franchise agreements:', agreements);
          return agreements;
        }

        // No agreements found
        console.log('No franchise agreements found');
        return [];
      } catch (error) {
        console.error('Error in useFranchiseAgreements:', error);
        return [];
      }
    },
    enabled: !!franchiseId,
  });
}

export function useUpdateFranchiseAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      // Update using db client
      const result = await db
        .from("franchise_agreements")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (result.error) {
        throw new Error(result.error);
      }

      // Update franchises table with new agreement values
      console.log('Updating franchise table for ID:', data.franchise_id);
      try {
        const franchiseUpdateData = {
          coin_price: data.coin_price,
          doll_price: data.doll_price,
          electricity_cost: data.electricity_cost,
          vat_percentage: data.vat_percentage,
          franchise_share: data.franchise_share,
          clowee_share: data.clowee_share,
          payment_duration: data.payment_duration
        };

        const updateResult = await db
          .from("franchises")
          .update(franchiseUpdateData)
          .eq("id", data.franchise_id)
          .select()
          .single();

        console.log('Franchise update result:', updateResult);

        if (updateResult.error) {
          console.warn('Franchise update failed:', updateResult.error);
        }
      } catch (error) {
        console.warn('Franchise update error:', error);
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchise-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["franchises"] });
      toast.success("Franchise agreement updated successfully");
    },
    onError: (error) => {
      console.error("Error updating franchise agreement:", error);
      toast.error("Failed to update franchise agreement");
    },
  });
}

export function useDeleteFranchiseAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await db
        .from("franchise_agreements")
        .delete()
        .eq("id", id)
        .execute();

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchise-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["franchises"] });
      toast.success("Franchise agreement deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting franchise agreement:", error);
      toast.error("Failed to delete franchise agreement");
    },
  });
}

export function useCreateFranchiseAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating franchise agreement with data:', data);

      // Insert into franchise_agreements table using db client
      const agreementResult = await db
        .from("franchise_agreements")
        .insert(data)
        .select()
        .single();

      console.log('Agreement insert result:', agreementResult);

      if (agreementResult.error) {
        throw new Error(agreementResult.error);
      }

      // Update franchises table with new agreement values
      console.log('Updating franchise table for ID:', data.franchise_id);
      try {
        const franchiseUpdateData = {
          coin_price: data.coin_price,
          doll_price: data.doll_price,
          electricity_cost: data.electricity_cost,
          vat_percentage: data.vat_percentage,
          franchise_share: data.franchise_share,
          clowee_share: data.clowee_share,
          payment_duration: data.payment_duration
        };

        const updateResult = await db
          .from("franchises")
          .update(franchiseUpdateData)
          .eq("id", data.franchise_id)
          .select()
          .single();

        console.log('Franchise update result:', updateResult);

        if (updateResult.error) {
          console.warn('Franchise update failed:', updateResult.error);
        }
      } catch (error) {
        console.warn('Franchise update error:', error);
      }

      return agreementResult.data || agreementResult;
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["franchise-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["franchises"] });
      queryClient.invalidateQueries({ queryKey: ["all-franchise-agreements"] });
      // Force refetch of the specific franchise agreements
      queryClient.refetchQueries({ queryKey: ["franchise-agreements"] });
      toast.success("Franchise agreement created successfully");
    },
    onError: (error) => {
      console.error("Error creating franchise agreement:", error);
      toast.error("Failed to create franchise agreement");
    },
  });
}

// Get effective agreement for a specific date
export function getEffectiveAgreement(agreements: any[], date: string) {
  if (!agreements || agreements.length === 0) return null;

  const targetDate = new Date(date);
  const validAgreements = agreements.filter(agreement =>
    new Date(agreement.effective_date) <= targetDate
  );

  // Return the most recent agreement before or on the target date
  return validAgreements.sort((a, b) =>
    new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
  )[0] || null;
}

// Get all franchise agreements for reporting
export function useAllFranchiseAgreements() {
  return useQuery({
    queryKey: ["all-franchise-agreements"],
    queryFn: async () => {
      try {
        // Get from franchise_agreements table
        const agreements = await db
          .from("franchise_agreements")
          .select("*")
          .order("effective_date", { ascending: false })
          .execute();

        return agreements || [];
      } catch (error) {
        console.error('Error fetching all franchise agreements:', error);
        return [];
      }
    },
  });
}