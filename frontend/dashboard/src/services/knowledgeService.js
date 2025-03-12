import api from './api';

const knowledgeService = {
  // Get all collections
  async getCollections() {
    const response = await api.get('/knowledge/collections');
    return response.data;
  },
  
  // Create a new collection
  async createCollection(collectionData) {
    const response = await api.post('/knowledge/collections', collectionData);
    return response.data;
  },
  
  // Get collection items
  async getCollectionItems(collectionId) {
    const response = await api.get(`/knowledge/collections/${collectionId}/items`);
    return response.data;
  },
  
  // Create a new knowledge item
  async createKnowledgeItem(collectionId, itemData) {
    const response = await api.post(`/knowledge/collections/${collectionId}/items`, itemData);
    return response.data;
  },
  
  // Upload a document
  async uploadDocument(file, collectionId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_id', collectionId);
    
    const response = await api.post('/knowledge/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  // Get all documents
  async getDocuments(status = null) {
    const params = status ? { status } : {};
    const response = await api.get('/knowledge/documents', { params });
    return response.data;
  },
  
  // Get document details
  async getDocumentDetails(documentId) {
    const response = await api.get(`/knowledge/documents/${documentId}`);
    return response.data;
  },
  
  // Search knowledge base
  async searchKnowledge(query, collectionId = null) {
    const params = {
      query,
      ...(collectionId && { collection_id: collectionId })
    };
    
    const response = await api.post('/knowledge/search', params);
    return response.data;
  },
  
  // Get document stats
  async getDocumentStats() {
    const response = await api.get('/knowledge/documents/stats');
    return response.data;
  }
};

export default knowledgeService;