import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import knowledgeService from '../../services/knowledgeService';
import DocumentUploader from '../../components/knowledge/DocumentUploader';

import {
  DocumentIcon,
  DocumentTextIcon,
  FolderIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const KnowledgeListPage = () => {
  const [activeTab, setActiveTab] = useState('faqs');
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [items, setItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: '', description: '', type: 'general' });
  const [newItem, setNewItem] = useState({ title: '', content: '' });

  // Fetch collections on component mount
  useEffect(() => {
    fetchCollections();
  }, []);

  // Fetch items when active collection changes
  useEffect(() => {
    if (activeCollection) {
      fetchCollectionItems(activeCollection.collection_id);
    } else {
      setItems([]);
    }
  }, [activeCollection]);

  // Fetch documents when documents tab is active
  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [activeTab]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await knowledgeService.getCollections();
      setCollections(data);
      
      // Set the first collection as active if available
      if (data.length > 0 && !activeCollection) {
        setActiveCollection(data[0]);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to load knowledge collections. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionItems = async (collectionId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await knowledgeService.getCollectionItems(collectionId);
      setItems(data);
    } catch (err) {
      console.error('Error fetching collection items:', err);
      setError('Failed to load knowledge items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await knowledgeService.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    try {
      setLoading(true);
      setError(null);
      await knowledgeService.createCollection(newCollection);
      setIsNewCollectionModalOpen(false);
      setNewCollection({ name: '', description: '', type: 'general' });
      await fetchCollections();
    } catch (err) {
      console.error('Error creating collection:', err);
      setError('Failed to create collection. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    try {
      if (!activeCollection) {
        setError('Please select a collection first');
        return;
      }
      
      setLoading(true);
      setError(null);
      await knowledgeService.createKnowledgeItem(activeCollection.collection_id, newItem);
      setIsNewItemModalOpen(false);
      setNewItem({ title: '', content: '' });
      await fetchCollectionItems(activeCollection.collection_id);
    } catch (err) {
      console.error('Error creating knowledge item:', err);
      setError('Failed to create knowledge item. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      setLoading(true);
      await knowledgeService.deleteDocument(documentId);
      // Refresh the documents list
      await fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async () => {
    setIsUploadModalOpen(false);
    await fetchCollections();
    
    if (activeTab === 'documents') {
      await fetchDocuments();
    }
    
    if (activeCollection) {
      await fetchCollectionItems(activeCollection.collection_id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Knowledge Base</h2>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setIsNewCollectionModalOpen(true)}
            className="btn btn-outline flex items-center"
          >
            <FolderIcon className="h-5 w-5 mr-2" />
            New Collection
          </button>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="btn btn-outline flex items-center"
          >
            <DocumentIcon className="h-5 w-5 mr-2" />
            Upload Document
          </button>
          <button
            type="button"
            onClick={() => setIsNewItemModalOpen(true)}
            disabled={!activeCollection}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Item
          </button>
        </div>
      </div>
      
      {/* Knowledge Base Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'faqs' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('faqs')}
          >
            FAQs
          </button>
          <button
            className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'documents' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
          <button
            className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'training' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('training')}
          >
            Training
          </button>
        </nav>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* FAQs and Collections View */}
      {activeTab === 'faqs' && (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Collections sidebar */}
          <div className="w-full md:w-64 bg-white shadow-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Collections</h2>
              <button
                onClick={fetchCollections}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
            
            {loading && collections.length === 0 ? (
              <div className="py-4 text-center text-gray-500">
                <div className="spinner mx-auto"></div>
                <p className="mt-2 text-sm">Loading collections...</p>
              </div>
            ) : collections.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <FolderIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-sm">No collections yet</p>
                <button
                  onClick={() => setIsNewCollectionModalOpen(true)}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Create your first collection
                </button>
              </div>
            ) : (
              <ul className="space-y-1">
                {collections.map((collection) => (
                  <li key={collection.collection_id}>
                    <button
                      onClick={() => setActiveCollection(collection)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        activeCollection?.collection_id === collection.collection_id
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <FolderIcon className="h-5 w-5 mr-3 text-gray-400" />
                      <span className="truncate">{collection.name}</span>
                      <span className="ml-auto text-xs text-gray-500">{collection.item_count || 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Knowledge items */}
          <div className="flex-1 bg-white shadow-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {activeCollection ? activeCollection.name : 'Select a Collection'}
              </h2>
              
              {/* Search box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search items..."
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            {activeCollection && (
              <p className="text-sm text-gray-600 mb-4">
                {activeCollection.description || `All items in the ${activeCollection.name} collection.`}
              </p>
            )}
            
            {loading && activeCollection && items.length === 0 ? (
              <div className="py-4 text-center text-gray-500">
                <div className="spinner mx-auto"></div>
                <p className="mt-2 text-sm">Loading items...</p>
              </div>
            ) : !activeCollection ? (
              <div className="py-8 text-center text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-sm">Select a collection to view items</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-sm">No items in this collection</p>
                <button
                  onClick={() => setIsNewItemModalOpen(true)}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Add your first item
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {items.map((item) => (
                  <li key={item.item_id} className="py-4">
                    <div className="flex items-start">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900">{item.title}</h3>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.content}</p>
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <Link to={`/dashboard/knowledge/${item.item_id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Documents Tab View */}
      {activeTab === 'documents' && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Uploaded Documents</h3>
            <div className="flex space-x-2">
              <button
                onClick={fetchDocuments}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500"
                title="Refresh document list"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn btn-primary flex items-center"
              >
                <DocumentIcon className="h-5 w-5 mr-1" />
                Upload New Document
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              <div className="spinner mx-auto"></div>
              <p className="mt-2 text-sm">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <DocumentIcon className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm">No documents uploaded yet</p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
              >
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.document_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="font-medium text-gray-900">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === 'processed' ? 'bg-green-100 text-green-800' : 
                          doc.status === 'failed' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.round(doc.file_size / 1024)} KB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteDocument(doc.document_id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete document"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Training Tab (Placeholder) */}
      {activeTab === 'training' && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Training Management</h3>
          <p className="text-gray-600">This feature is coming soon.</p>
        </div>
      )}

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsNewCollectionModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Collection</h3>
            
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                id="name"
                value={newCollection.name}
                onChange={(e) => setNewCollection({...newCollection, name: e.target.value})}
                className="input w-full"
                placeholder="Collection name"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                id="description"
                value={newCollection.description}
                onChange={(e) => setNewCollection({...newCollection, description: e.target.value})}
                className="input w-full"
                rows="3"
                placeholder="Collection description"
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                id="type"
                value={newCollection.type}
                onChange={(e) => setNewCollection({...newCollection, type: e.target.value})}
                className="input w-full"
              >
                <option value="general">General</option>
                <option value="faqs">FAQs</option>
                <option value="policies">Policies</option>
                <option value="products">Products</option>
                <option value="procedures">Procedures</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setIsNewCollectionModalOpen(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCollection}
                disabled={!newCollection.name}
                className="btn btn-primary"
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsNewItemModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Knowledge Item</h3>
            
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                id="title"
                value={newItem.title}
                onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                className="input w-full"
                placeholder="Item title"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                id="content"
                value={newItem.content}
                onChange={(e) => setNewItem({...newItem, content: e.target.value})}
                className="input w-full"
                rows="8"
                placeholder="Item content"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateItem}
                disabled={!newItem.title || !newItem.content}
                className="btn btn-primary"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsUploadModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Document</h3>
            
            <DocumentUploader 
              collections={collections} 
              onUploadComplete={handleUploadComplete}
              onCancel={() => setIsUploadModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeListPage;