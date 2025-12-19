import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";

export function useDollStockValue(endDate: string) {
  return useQuery({
    queryKey: ['doll-stock-value', endDate],
    queryFn: async () => {
      const [allExpenses, expenseCategories, allSales, stockOutHistory] = await Promise.all([
        db.from('machine_expenses').select('*').execute(),
        db.from('expense_categories').select('*').execute(),
        db.from('sales').select('*').execute(),
        db.from('stock_out_history').select('*').execute()
      ]);

      const categoryMap = new Map();
      expenseCategories?.forEach((category: any) => categoryMap.set(category.id, category));

      // Get all Prize Purchase expenses up to end date
      const prizePurchases = (allExpenses || []).filter((expense: any) => {
        if (!expense.expense_date) return false;
        const category = categoryMap.get(Number(expense.category_id));
        return category?.category_name === 'Prize Purchase' && expense.expense_date <= endDate;
      });

      // Calculate total purchased dolls and total cost
      let totalPurchasedQty = 0;
      let totalPurchaseCost = 0;

      prizePurchases.forEach((expense: any) => {
        const qty = Number(expense.quantity) || 0;
        const cost = Number(expense.total_amount) || 0;
        totalPurchasedQty += qty;
        totalPurchaseCost += cost;
      });

      // Get all prize out (sales) up to end date
      const salesUpToDate = (allSales || []).filter((sale: any) => {
        return sale.sales_date && sale.sales_date <= endDate;
      });

      let totalPrizeOutQty = 0;
      salesUpToDate.forEach((sale: any) => {
        totalPrizeOutQty += Number(sale.prize_out_quantity) || 0;
      });

      // Get stock adjustments (doll add/deduct) up to end date
      const stockAdjustments = (stockOutHistory || []).filter((record: any) => {
        return record.out_date && record.out_date <= endDate && 
               (record.adjustment_type === 'doll_add' || record.adjustment_type === 'doll_deduct');
      });

      let totalAdjustmentQty = 0;
      stockAdjustments.forEach((record: any) => {
        totalAdjustmentQty += Number(record.quantity) || 0;
      });

      // Calculate current stock
      const currentStock = totalPurchasedQty - totalPrizeOutQty + totalAdjustmentQty;

      // Calculate average purchase price
      const avgPurchasePrice = totalPurchasedQty > 0 ? totalPurchaseCost / totalPurchasedQty : 0;

      // Calculate stock value
      const stockValue = currentStock * avgPurchasePrice;

      return {
        currentStock,
        avgPurchasePrice,
        stockValue,
        totalPurchasedQty,
        totalPurchaseCost,
        totalPrizeOutQty
      };
    }
  });
}
