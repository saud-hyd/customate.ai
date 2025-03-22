// frontend/dashboard/src/services/knowledgeService.js

import api from './api';

const knowledgeService = {
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
  
  // Search knowledge base
  async searchKnowledge(query, collectionId = null) {
    const params = {
      query,
      ...(collectionId && { collection_id: collectionId })
    };
    
    const response = await api.post('/api/knowledge/knowledge/search', params);
    return response.data;
  },
  
  // Get document stats
  async getDocumentStats() {
    const response = await api.get('/api/knowledge/knowledge/documents/stats');
    return response.data;
  }
};

export default knowledgeService;