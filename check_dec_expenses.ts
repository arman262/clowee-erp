import { db } from './src/integrations/postgres/client';

async function checkDecemberExpenses() {
  try {
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';
    
    const [allExpenses, expenseCategories] = await Promise.all([
      db.from('machine_expenses').select('*').execute(),
      db.from('expense_categories').select('*').execute()
    ]);

    const categoryMap = new Map();
    expenseCategories?.forEach((category: any) => categoryMap.set(category.id, category));

    const monthExpenses = (allExpenses || []).filter((expense: any) => {
      if (!expense.expense_date) return false;
      const date = new Date(expense.expense_date);
      const expenseDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      return expenseDateLocal >= startDate && expenseDateLocal <= endDate;
    });

    console.log('\n=== December 2025 Expenses Analysis ===\n');
    console.log(`Total expenses in December: ${monthExpenses.length}`);

    const variableCategories = ['Conveyance', 'Import Accessories', 'Local Accessories', 'Digital Marketing', 'Carrying Cost', 'Prize Delivery Cost'];
    
    let totalVariableCost = 0;
    const categoryBreakdown: any = {};

    monthExpenses.forEach((expense: any) => {
      const category = categoryMap.get(Number(expense.category_id));
      const categoryName = category?.category_name || 'Unknown';
      const amount = Number(expense.total_amount) || 0;
      
      if (variableCategories.includes(categoryName)) {
        totalVariableCost += amount;
        if (!categoryBreakdown[categoryName]) {
          categoryBreakdown[categoryName] = { count: 0, total: 0, expenses: [] };
        }
        categoryBreakdown[categoryName].count++;
        categoryBreakdown[categoryName].total += amount;
        categoryBreakdown[categoryName].expenses.push({
          date: expense.expense_date,
          amount: amount,
          description: expense.description || 'N/A'
        });
      }
    });

    console.log('\n--- Variable Cost Categories Breakdown ---');
    for (const [catName, data] of Object.entries(categoryBreakdown)) {
      const catData = data as any;
      console.log(`\n${catName}:`);
      console.log(`  Count: ${catData.count}`);
      console.log(`  Total: ৳${catData.total.toFixed(2)}`);
      console.log(`  Expenses:`);
      catData.expenses.forEach((exp: any) => {
        console.log(`    - ${exp.date}: ৳${exp.amount.toFixed(2)} (${exp.description})`);
      });
    }

    console.log('\n--- Summary ---');
    console.log(`Total Variable Cost: ৳${totalVariableCost.toFixed(2)}`);
    
    // Also check all expenses for December
    console.log('\n--- All December 2025 Expenses by Category ---');
    const allCategoryTotals: any = {};
    monthExpenses.forEach((expense: any) => {
      const category = categoryMap.get(Number(expense.category_id));
      const categoryName = category?.category_name || 'Unknown';
      const amount = Number(expense.total_amount) || 0;
      
      if (!allCategoryTotals[categoryName]) {
        allCategoryTotals[categoryName] = 0;
      }
      allCategoryTotals[categoryName] += amount;
    });
    
    for (const [catName, total] of Object.entries(allCategoryTotals)) {
      console.log(`${catName}: ৳${(total as number).toFixed(2)}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDecemberExpenses();
