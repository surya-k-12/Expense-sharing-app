import { supabase } from './supabaseClient';

export const expenseService = {
  // Create expense with splits
  async createExpense(expenseData) {
    const { groupId, paidBy, description, amount, splitType, splits } =
      expenseData;

    try {
      // Create expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert([
          {
            group_id: groupId,
            paid_by: paidBy,
            description,
            amount: parseFloat(amount),
            split_type: splitType,
          },
        ])
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create splits
      const splitsData = splits.map((split) => ({
        expense_id: expense.id,
        user_id: split.userId,
        amount: parseFloat(split.amount),
        percentage: split.percentage ? parseFloat(split.percentage) : null,
      }));

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitsData);

      if (splitsError) throw splitsError;

      return { success: true, expense };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get group expenses
  async getGroupExpenses(groupId) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          `
          *,
          users!expenses_paid_by_fkey (id, username, full_name),
          expense_splits (
            id,
            user_id,
            amount,
            percentage,
            users!expense_splits_user_id_fkey (id, username, full_name)
          )
        `
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, expenses: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get expense details
  async getExpenseDetails(expenseId) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          `
          *,
          users!expenses_paid_by_fkey (id, username, full_name),
          expense_splits (
            id,
            user_id,
            amount,
            percentage,
            users!expense_splits_user_id_fkey (id, username, full_name)
          )
        `
        )
        .eq('id', expenseId)
        .single();

      if (error) throw error;
      return { success: true, expense: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update expense
  async updateExpense(expenseId, updates) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, expense: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete expense
  async deleteExpense(expenseId) {
    try {
      // Delete splits first (cascade)
      const { error: splitsError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId);

      if (splitsError) throw splitsError;

      // Delete expense
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
