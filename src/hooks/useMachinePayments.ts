import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";
import { useNotificationMutations } from "@/hooks/useNotificationMutations";

type MachinePayment = {
  id: string;
  machine_id?: string;
  bank_id?: string;
  invoice_id?: string;
  payment_date: string;
  amount: number;
  remarks?: string;
  created_at?: string;
};

export function useMachinePayments() {
  return useQuery({
    queryKey: ["machine_payments"],
    queryFn: async () => {
      // Fetch payments, machines, banks, sales, and users separately
      const [payments, machines, banks, sales, users] = await Promise.all([
        db.from("machine_payments").select("*").order("payment_date", { ascending: false }).execute(),
        db.from("machines").select("*").execute(),
        db.from("banks").select("*").execute(),
        db.from("sales").select("*").execute(),
        db.from("users").select("*").execute()
      ]);

      // Create lookup maps
      const machineMap = new Map();
      machines?.forEach(machine => {
        machineMap.set(machine.id, machine);
      });

      const bankMap = new Map();
      banks?.forEach(bank => {
        bankMap.set(bank.id, bank);
      });

      const salesMap = new Map();
      sales?.forEach(sale => {
        salesMap.set(sale.id, sale);
      });

      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.id, user);
      });

      // Join payments with machine, bank, and sales data
      const paymentsWithDetails = (payments || []).map(payment => {
        // Find matching sale by invoice_id or machine_id and payment_date
        let matchingSale = null;
        if (payment.invoice_id) {
          matchingSale = sales?.find(sale => sale.id === payment.invoice_id);
        } else {
          // Fallback to old matching logic
          matchingSale = sales?.find(sale => 
            sale.machine_id === payment.machine_id && 
            sale.sales_date === payment.payment_date
          );
        }
        
        return {
          ...payment,
          machines: payment.machine_id ? machineMap.get(payment.machine_id) : null,
          banks: payment.bank_id ? bankMap.get(payment.bank_id) : null,
          sales: matchingSale || null,
          created_by_user: payment.created_by ? userMap.get(payment.created_by) : { name: 'System' }
        };
      });

      return paymentsWithDetails;
    },
  });
}

export function useCreateMachinePayment() {
  const queryClient = useQueryClient();
  const { notifyCreate } = useNotificationMutations();

  return useMutation({
    mutationFn: async (data: Omit<MachinePayment, 'id' | 'created_at'>) => {
      console.log('Creating payment with data:', data);
      try {
        const storedUser = localStorage.getItem('clowee_user');
        const userId = storedUser ? JSON.parse(storedUser).user.id : null;
        const insertData = userId ? { ...data, created_by: userId } : data;
        
        const result = await db
          .from("machine_payments")
          .insert(insertData)
          .select()
          .single();

        // Update sales payment status if invoice_id is provided
        if (data.invoice_id) {
          try {
            // Get the sale to check pay_to_clowee amount
            const sale = await db.from('sales').select('*').eq('id', data.invoice_id).single();
            if (sale.data) {
              // Calculate total payments for this invoice including the new payment
              const allPayments = await db.from('machine_payments').select('*').eq('invoice_id', data.invoice_id).execute();
              const existingTotal = (allPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
              const totalPaid = existingTotal + (data.amount || 0);
              
              console.log(`Invoice ${data.invoice_id}: existing=${existingTotal}, new=${data.amount}, total=${totalPaid}, payToClowee=${sale.data.pay_to_clowee}`);
              
              // Update payment status
              let paymentStatus = 'Due';
              const payToClowee = sale.data.pay_to_clowee || 0;
              if (payToClowee > 0) {
                if (totalPaid >= payToClowee) {
                  paymentStatus = 'Paid';
                } else if (totalPaid > 0) {
                  paymentStatus = 'Partial';
                }
              } else if (totalPaid > 0) {
                paymentStatus = 'Paid';
              }
              
              console.log(`Updating payment status to: ${paymentStatus}`);
              await db.from('sales').update({ payment_status: paymentStatus }).eq('id', data.invoice_id).execute();
            }
          } catch (statusUpdateError) {
            console.warn('Failed to update payment status, but payment was created:', statusUpdateError);
            // Don't throw error here - payment was successful
          }
        }

        console.log('Payment creation result:', result);
        return result;
      } catch (error) {
        console.error('Payment creation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_payments"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Payment added successfully");
      notifyCreate("Payment");
    },
    onError: (error) => {
      console.error("Error creating payment:", error);
      toast.error("Failed to add payment");
    },
  });
}

export function useUpdateMachinePayment() {
  const queryClient = useQueryClient();
  const { notifyUpdate } = useNotificationMutations();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<MachinePayment>) => {
      const result = await db
        .from("machine_payments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_payments"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Payment updated successfully");
      notifyUpdate("Payment");
    },
    onError: (error) => {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment");
    },
  });
}

export function useDeleteMachinePayment() {
  const queryClient = useQueryClient();
  const { notifyDelete } = useNotificationMutations();

  return useMutation({
    mutationFn: async (id: string) => {
      await db
        .from("machine_payments")
        .delete()
        .eq("id", id)
        .execute();

      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_payments"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Payment deleted successfully");
      notifyDelete("Payment");
    },
    onError: (error) => {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    },
  });
}