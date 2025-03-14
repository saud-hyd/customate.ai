// frontend/dashboard/src/services/knowledgeService.js

import api from './api';

const knowledgeService = {
  // Get all collections
  async getCollections() {
    try {
      // Keep the duplicated "knowledge/" segment as shown in Swagger
      const response = await api.get('/api/knowledge/knowledge/collections');
      return response.data;
    } catch (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }
  },
  
  // Create a new collection
  async createCollection(collectionData) {
    // Keep the duplicated "knowledge/" segment
    const response = await api.post('/api/knowledge/knowledge/collections', collectionData);
    return response.data;
  },
  
  // Get collection items
  async getCollectionItems(collectionId) {
    // Keep the duplicated "knowledge/" segment
    const response = await api.get(`/api/knowledge/knowledge/collections/${collectionId}/items`);
    return response.data;
  },
  
  // Create a new knowledge item
  async createKnowledgeItem(collectionId, itemData) {
    // Keep the duplicated "knowledge/" segment
    const response = await api.post(`/api/knowledge/knowledge/collections/${collectionId}/items`, itemData);
    return response.data;
  },
  
  // Upload a document
  async uploadDocument(file, collectionId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_id', collectionId);
    
    // Keep the duplicated "knowledge/" segment
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
    // This should match the endpoint pattern we're setting up
    const response = await api.get('/api/knowledge/knowledge/documents', { params });
    return response.data;
  },
  
  // Get document details
  async getDocumentDetails(documentId) {
    // This should match the endpoint pattern we're setting up
    const response = await api.get(`/api/knowledge/knowledge/documents/${documentId}`);
    return response.data;
  },
  
  // Search knowledge base
  async searchKnowledge(query, collectionId = null) {
    const params = {
      query,
      ...(collectionId && { collection_id: collectionId })
    };
    
    // Keep the duplicated "knowledge/" segment
    const response = await api.post('/api/knowledge/knowledge/search', params);
    return response.data;
  },
  
  // Get document stats
  async getDocumentStats() {
    // Keep the correct path format for documents
    const response = await api.get('/api/knowledge/knowledge/documents/stats');
    return response.data;
  },
  
  // Delete a document
  async deleteDocument(documentId) {
    // Keep the correct path format for documents
    const response = await api.delete(`/api/knowledge/documents/${documentId}`);
    return response.data;
  }
};

export default knowledgeService;