import { supabase } from './supabaseClient';

export const groupService = {
  // Create new group
  async createGroup(groupName, description, createdBy) {
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([
          {
            group_name: groupName,
            description,
            created_by: createdBy,
          },
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as group member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          {
            group_id: group.id,
            user_id: createdBy,
          },
        ]);

      if (memberError) throw memberError;

      return { success: true, group };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get all groups for user
  async getUserGroups(userId) {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(
          `
          group_id,
          groups (
            id,
            group_name,
            description,
            created_by,
            created_at,
            users!groups_created_by_fkey (username, full_name)
          )
        `
        )
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        groups: data.map((item) => ({
          ...item.groups,
          createdByUser: item.groups.users[0],
        })),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get group details with members
  async getGroupDetails(groupId) {
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(
          `
          user_id,
          users (id, username, full_name, email)
        `
        )
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      return {
        success: true,
        group,
        members: members.map((m) => m.users),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Search user by email
  async searchUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, email')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'User not found' };
        }
        throw error;
      }

      return { success: true, user: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Add member to group
  async addGroupMember(groupId, userId) {
    try {
      // Check if already a member
      const { data: existing, error: checkError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        return { success: false, error: 'User is already a member of this group' };
      }

      const { error } = await supabase
        .from('group_members')
        .insert([
          {
            group_id: groupId,
            user_id: userId,
          },
        ]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Remove member from group
  async removeGroupMember(groupId, userId) {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete group
  async deleteGroup(groupId) {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
