// Path: frontend/admin/src/services/paymentService.js

import api from './api';

export const paymentService = {
  /**
   * Get payment overview
   * 
   * @param {string} period - Time period (day, week, month, year)
   * @returns {Promise<Object>} - Payment overview data
   */
  async getPaymentOverview(period = 'month') {
    const params = { period };
    
    // Update endpoint to match the backend path
    const response = await api.get('/admin/payments', { params });
    return response.data;
  },
  
  /**
   * Get payment history
   * 
   * @param {Object} options - Query options
   * @param {number} options.days - Number of days of history
   * @param {string} options.status - Filter by payment status
   * @returns {Promise<Array>} - List of payments
   */
  async getPaymentHistory({ days = 30, status } = {}) {
    const params = { days };
    
    if (status) params.status = status;
    
    // Update endpoint to match the backend path
    const response = await api.get('/admin/payments/history', { params });
    return response.data;
  },
  
  /**
   * Issue a refund for a payment
   * 
   * @param {string} paymentId - Payment ID
   * @param {Object} refundData - Refund data
   * @param {number} refundData.amount - Amount to refund (in cents)
   * @param {string} refundData.reason - Reason for refund
   * @returns {Promise<Object>} - Refund result
   */
  async issueRefund(paymentId, refundData) {
    // Update endpoint to match the backend path
    const response = await api.post(`/admin/payments/${paymentId}/refund`, refundData);
    return response.data;
  }
};