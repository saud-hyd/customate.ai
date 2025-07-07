// frontend/dashboard/src/services/knowledgeService.js

import api from './api';

const knowledgeService = {
  // ================================
  // COLLECTIONS MANAGEMENT
  // ================================
  
  // Get all collections
  async getCollections() {
    try {
      const response = await api.get('/api/knowledge/knowledge/collections');
      return response.data;
    } catch (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }
  },
  
  // Create a new collection
  async createCollection(collectionData) {
    const response = await api.post('/api/knowledge/knowledge/collections', collectionData);
    return response.data;
  },
  
  // Delete a collection
  async deleteCollection(collectionId) {
    const response = await api.delete(`/api/knowledge/knowledge/collections/${collectionId}`);
    return response.data;
  },

  // Get collection items
  async getCollectionItems(collectionId) {
    const response = await api.get(`/api/knowledge/knowledge/collections/${collectionId}/items`);
    return response.data;
  },

  // ================================
  // KNOWLEDGE ITEMS MANAGEMENT
  // ================================
  
  // Create a new knowledge item
  async createKnowledgeItem(collectionId, itemData) {
    const response = await api.post(`/api/knowledge/knowledge/collections/${collectionId}/items`, itemData);
    return response.data;
  },
  
  // Update a knowledge item
  async updateKnowledgeItem(itemId, itemData) {
    const response = await api.put(`/api/knowledge/knowledge/items/${itemId}`, itemData);
    return response.data;
  },
  
  // Delete a knowledge item
  async deleteKnowledgeItem(itemId) {
    const response = await api.delete(`/api/knowledge/knowledge/items/${itemId}`);
    return response.data;
  },
  
  // Get a single knowledge item
  async getKnowledgeItem(itemId) {
    const response = await api.get(`/api/knowledge/knowledge/items/${itemId}`);
    return response.data;
  },

  // Search knowledge base
  async searchKnowledge(query, collectionId = null) {
    const params = {
      query,
      ...(collectionId && { collection_id: collectionId })
    };
    
    const response = await api.post('/api/knowledge/knowledge/search', params);
    return response.data;
  },

  // ================================
  // DOCUMENT MANAGEMENT
  // ================================
  
  // Upload a document
  async uploadDocument(file, collectionId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_id', collectionId);
    
    const response = await api.post('/api/knowledge/knowledge/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  // Get all documents
  async getDocuments(status = null) {
    const params = status ? { status } : {};
    const response = await api.get('/api/knowledge/knowledge/documents', { params });
    return response.data;
  },
  
  // Get document details
  async getDocument(documentId) {
    const response = await api.get(`/api/knowledge/knowledge/documents/${documentId}`);
    return response.data;
  },
  
  // Get document sections (knowledge items)
  async getDocumentSections(documentId) {
    const response = await api.get(`/api/knowledge/knowledge/documents/${documentId}/sections`);
    return response.data;
  },
  
  // Delete a document
  async deleteDocument(documentId) {
    const response = await api.delete(`/api/knowledge/knowledge/documents/${documentId}`);
    return response.data;
  },

  // Get document stats
  async getDocumentStats() {
    const response = await api.get('/api/knowledge/knowledge/documents/stats');
    return response.data;
  },

  // ================================
  // WEB CRAWLING - ENHANCED WITH INTELLIGENT FEATURES
  // ================================

  // Create a website crawl job with intelligent mode support
  async createCrawlJob(crawlData) {
    const response = await api.post('/api/knowledge/crawl', crawlData);
    return response.data;
  },

  // Get all crawl jobs
  async getCrawlJobs() {
    const response = await api.get('/api/knowledge/crawl');
    return response.data;
  },

  // Get a specific crawl job's status
  async getCrawlJobStatus(jobId, includeDetails = false) {
    const response = await api.get(`/api/knowledge/crawl/${jobId}`, {
      params: { include_details: includeDetails }
    });
    return response.data;
  },

  // Get detailed crawl progress with real-time updates
  async getCrawlProgress(jobId) {
    const response = await api.get(`/api/knowledge/crawl/${jobId}/progress`);
    return response.data;
  },

  // Cancel or delete a crawl job
  async cancelCrawlJob(jobId) {
    const response = await api.delete(`/api/knowledge/crawl/${jobId}`);
    return response.data;
  },

  // Retry a failed crawl job
  async retryCrawlJob(jobId) {
    const response = await api.post(`/api/knowledge/crawl/${jobId}/retry`);
    return response.data;
  },

  // Add specific pages to an existing crawl job
  async addSpecificPages(jobId, pages) {
    const response = await api.post(`/api/knowledge/crawl/${jobId}/add-pages`, {
      pages: pages
    });
    return response.data;
  },

  // Get crawl job details
  async getCrawlJob(jobId) {
    const response = await api.get(`/api/knowledge/crawl/${jobId}`);
    return response.data;
  },

  // ================================
  // ANALYTICS & STORAGE
  // ================================

  // Get storage statistics
  async getStorageStats() {
    try {
      const response = await api.get('/api/analytics/storage');
      return response.data;
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      throw error;
    }
  },

  // Get usage analytics
  async getUsageAnalytics() {
    try {
      const response = await api.get('/api/analytics/usage');
      return response.data;
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      throw error;
    }
  },

  // ================================
  // LEGACY SUPPORT METHODS
  // ================================

  // Legacy method names for backward compatibility
  async getKnowledgeCollections() {
    return this.getCollections();
  },

  async createKnowledgeCollection(collectionData) {
    return this.createCollection(collectionData);
  },

  async deleteKnowledgeCollection(collectionId) {
    return this.deleteCollection(collectionId);
  },

  // ================================
  // UTILITY METHODS
  // ================================

  // Validate URL format
  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get file extension
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  },

  // Check if file type is supported
  isSupportedFileType(filename) {
    const supportedTypes = ['pdf', 'docx', 'doc', 'txt'];
    const extension = this.getFileExtension(filename);
    return supportedTypes.includes(extension);
  },

  // Estimate crawl time based on parameters
  estimateCrawlTime(maxPages, maxDepth) {
    // Rough estimate: 1-2 seconds per page
    const avgTimePerPage = 1.5;
    const estimatedMinutes = Math.ceil((maxPages * avgTimePerPage) / 60);
    return estimatedMinutes;
  },

  // Calculate storage impact
  calculateStorageImpact(pageCount, avgPageSize = 5000) {
    return pageCount * avgPageSize;
  },

  // ================================
  // ERROR HANDLING UTILITIES
  // ================================

  // Handle API errors consistently
  handleApiError(error, context = 'API call') {
    console.error(`${context} failed:`, error);
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.detail || error.response.data?.message || 'An error occurred';
      throw new Error(message);
    } else if (error.request) {
      // Network error
      throw new Error('Network error. Please check your connection.');
    } else {
      // Other error
      throw new Error('An unexpected error occurred');
    }
  },

  // ================================
  // BATCH OPERATIONS
  // ================================

  // Delete multiple knowledge items
  async deleteMultipleKnowledgeItems(itemIds) {
    const results = await Promise.allSettled(
      itemIds.map(id => this.deleteKnowledgeItem(id))
    );
    
    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      total: itemIds.length
    };
  },

  // Delete multiple documents
  async deleteMultipleDocuments(documentIds) {
    const results = await Promise.allSettled(
      documentIds.map(id => this.deleteDocument(id))
    );
    
    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      total: documentIds.length
    };
  },

  // ================================
  // ADVANCED SEARCH
  // ================================

  // Advanced search with filters
  async advancedSearch(searchParams) {
    const response = await api.post('/api/knowledge/knowledge/search/advanced', searchParams);
    return response.data;
  },

  // Search within specific collection
  async searchInCollection(collectionId, query, filters = {}) {
    const searchParams = {
      query,
      collection_id: collectionId,
      ...filters
    };
    
    const response = await api.post('/api/knowledge/knowledge/search', searchParams);
    return response.data;
  },

  // ================================
  // EXPORT/IMPORT OPERATIONS
  // ================================

  // Export collection data
  async exportCollection(collectionId, format = 'json') {
    const response = await api.get(`/api/knowledge/knowledge/collections/${collectionId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  // Import collection data
  async importCollection(file, collectionId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_id', collectionId);
    
    const response = await api.post('/api/knowledge/knowledge/collections/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default knowledgeService;