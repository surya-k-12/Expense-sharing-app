import { supabase } from './supabaseClient';

export const balanceService = {
  // Get all balances for a group
  async getGroupBalances(groupId) {
    try {
      const { data, error } = await supabase
        .from('balances')
        .select(
          `
          id,
          group_id,
          creditor_id,
          debtor_id,
          amount,
          created_at,
          updated_at,
          users_creditor_id_fkey:users!balances_creditor_id_fkey(id, username, full_name, email),
          users_debtor_id_fkey:users!balances_debtor_id_fkey(id, username, full_name, email)
        `
        )
        .eq('group_id', groupId);

      if (error) throw error;

      return { success: true, balances: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get user's balance in a group
  async getUserGroupBalance(groupId, userId) {
    try {
      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .eq('group_id', groupId)
        .or(`creditor_id.eq.${userId},debtor_id.eq.${userId}`);

      if (error) throw error;

      let owesAmount = 0;
      let owesByOthers = 0;

      (data || []).forEach((balance) => {
        if (balance.debtor_id === userId) {
          owesAmount += parseFloat(balance.amount);
        } else if (balance.creditor_id === userId) {
          owesByOthers += parseFloat(balance.amount);
        }
      });

      return {
        success: true,
        summary: {
          owesAmount: owesAmount.toFixed(2),
          owesByOthers: owesByOthers.toFixed(2),
          netBalance: (owesByOthers - owesAmount).toFixed(2),
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Process settlement and update balances
  async processSettlement(groupId, fromUserId, toUserId, amount) {
    try {
      const amountNum = parseFloat(amount);

      // Get existing balance
      const { data: existingBalance, error: fetchError } = await supabase
        .from('balances')
        .select('*')
        .eq('group_id', groupId)
        .eq('debtor_id', fromUserId)
        .eq('creditor_id', toUserId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingBalance) {
        // Balance exists - update it
        const newAmount = parseFloat(existingBalance.amount) - amountNum;

        if (newAmount > 0.01) {
          // Update existing balance
          const { error: updateError } = await supabase
            .from('balances')
            .update({ 
              amount: newAmount,
              updated_at: new Date()
            })
            .eq('id', existingBalance.id);

          if (updateError) throw updateError;
        } else if (newAmount < -0.01) {
          // Balance reverses - delete old and create reverse
          await supabase
            .from('balances')
            .delete()
            .eq('id', existingBalance.id);

          const { error: insertError } = await supabase
            .from('balances')
            .insert([
              {
                group_id: groupId,
                creditor_id: fromUserId,
                debtor_id: toUserId,
                amount: Math.abs(newAmount),
              },
            ]);

          if (insertError) throw insertError;
        } else {
          // Balance is exactly settled - delete it
          const { error: deleteError } = await supabase
            .from('balances')
            .delete()
            .eq('id', existingBalance.id);

          if (deleteError) throw deleteError;
        }
      } else {
        // No existing balance - check reverse direction
        const { data: reverseBalance, error: reverseError } = await supabase
          .from('balances')
          .select('*')
          .eq('group_id', groupId)
          .eq('debtor_id', toUserId)
          .eq('creditor_id', fromUserId)
          .single();

        if (reverseError && reverseError.code !== 'PGRST116') {
          throw reverseError;
        }

        if (reverseBalance) {
          // Reverse balance exists
          const newAmount = parseFloat(reverseBalance.amount) - amountNum;

          if (newAmount > 0.01) {
            // Update reverse balance
            const { error: updateError } = await supabase
              .from('balances')
              .update({ 
                amount: newAmount,
                updated_at: new Date()
              })
              .eq('id', reverseBalance.id);

            if (updateError) throw updateError;
          } else if (newAmount < -0.01) {
            // Reverse reverses back
            await supabase
              .from('balances')
              .delete()
              .eq('id', reverseBalance.id);

            const { error: insertError } = await supabase
              .from('balances')
              .insert([
                {
                  group_id: groupId,
                  creditor_id: fromUserId,
                  debtor_id: toUserId,
                  amount: Math.abs(newAmount),
                },
              ]);

            if (insertError) throw insertError;
          } else {
            // Balance completely settled
            const { error: deleteError } = await supabase
              .from('balances')
              .delete()
              .eq('id', reverseBalance.id);

            if (deleteError) throw deleteError;
          }
        } else {
          // No existing balance in either direction - create new one
          const { error: insertError } = await supabase
            .from('balances')
            .insert([
              {
                group_id: groupId,
                creditor_id: toUserId,
                debtor_id: fromUserId,
                amount: amountNum,
              },
            ]);

          if (insertError) throw insertError;
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Simplify balances (optional - reduces number of transactions)
  async simplifyBalances(groupId) {
    try {
      const balancesResult = await this.getGroupBalances(groupId);
      if (!balancesResult.success) throw new Error(balancesResult.error);

      const balances = balancesResult.balances;
      const members = new Set();

      balances.forEach((b) => {
        members.add(b.creditor_id);
        members.add(b.debtor_id);
      });

      // Calculate net balance for each member
      const netBalances = {};
      members.forEach((m) => {
        netBalances[m] = 0;
      });

      balances.forEach((b) => {
        netBalances[b.creditor_id] += parseFloat(b.amount);
        netBalances[b.debtor_id] -= parseFloat(b.amount);
      });

      return { success: true, netBalances };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
