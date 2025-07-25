// frontend/dashboard/src/services/teamService.js
import api from './api';

/**
 * Service for team-related API operations
 */
const teamService = {
  /**
   * Get all team members
   * @returns {Promise<Array>} List of team members
   */
  getTeamMembers: async () => {
    try {
      const response = await api.get('/api/team/members');
      return response.data;
    } catch (error) {
      console.error('Error getting team members:', error);
      throw error;
    }
  },

  /**
   * Invite a new team member
   * @param {Object} memberData - Email and role for the new member
   * @returns {Promise<Object>} Invitation result
   */
  inviteMember: async (memberData) => {
    try {
      const response = await api.post('/api/team/invite', memberData);
      return response.data;
    } catch (error) {
      console.error('Error inviting team member:', error);
      throw error;
    }
  },

  /**
   * Update a team member's role
   * @param {string} memberId - ID of the member to update
   * @param {Object} updateData - Data to update (e.g., role)
   * @returns {Promise<Object>} Updated member data
   */
  updateMember: async (memberId, updateData) => {
    try {
      const response = await api.put(`/api/team/members/${memberId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  },

  /**
   * Remove a team member
   * @param {string} memberId - ID of the member to remove
   * @returns {Promise<Object>} Removal result
   */
  removeMember: async (memberId) => {
    try {
      const response = await api.delete(`/api/team/members/${memberId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  },

  /**
   * Resend invitation to a pending team member
   * @param {string} memberId - ID of the member to resend invitation to
   * @returns {Promise<Object>} Resend result
   */
  resendInvitation: async (memberId) => {
    try {
      const response = await api.post(`/api/team/invite/resend/${memberId}`);
      return response.data;
    } catch (error) {
      console.error('Error resending invitation:', error);
      throw error;
    }
  },

  /**
   * Get team usage information (total members, available slots)
   * @returns {Promise<Object>} Team usage data
   */
  getTeamUsage: async () => {
    try {
      const response = await api.get('/api/team/usage');
      return response.data;
    } catch (error) {
      console.error('Error getting team usage:', error);
      throw error;
    }
  }
};

export default teamService;