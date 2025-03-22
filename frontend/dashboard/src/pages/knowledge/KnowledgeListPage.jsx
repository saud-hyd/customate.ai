// frontend/dashboard/src/pages/knowledge/KnowledgeListPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import knowledgeService from '../../services/knowledgeService';
import DocumentUploader from '../../components/knowledge/DocumentUploader';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatBytes } from '../../utils/formatters';

// Import icons
import {
  DocumentIcon,
  FolderIcon,
  TrashIcon,
  PlusIcon,
  PencilIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const KnowledgeListPage = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('collections'); // 'collections' or 'allDocuments'
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'files' within collection view
  const [collections, setCollections] = useState([]);
  const [currentCollection, setCurrentCollection] = useState(null);
  const [items, setItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [collectionFiles, setCollectionFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  
  // Form states
  const [newCollection, setNewCollection] = useState({ name: '', description: '', type: 'general' });
  const [newItem, setNewItem] = useState({ title: '', content: '' });
  
  const { success, error: showError } = useToast();

  // Initialize data on component mount
  useEffect(() => {
    fetchCollections();
    fetchAllDocuments();
  }, []);

  // When current collection changes, fetch its items
  useEffect(() => {
    if (currentCollection) {
      fetchCollectionItems(currentCollection.collection_id);
    }
  }, [currentCollection]);

  // Map files to collections when both lists are available
  useEffect(() => {
    if (collections.length > 0 && items.length > 0 && documents.length > 0) {
      mapFilesToCollections();
    }
  }, [collections, items, documents]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const data = await knowledgeService.getCollections();
      setCollections(data);
      
      // Set the first collection as the current one if none is selected
      if (data.length > 0 && !currentCollection) {
        setCurrentCollection(data[0]);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Could not load collections');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionItems = async (collectionId) => {
    try {
      const data = await knowledgeService.getCollectionItems(collectionId);
      setItems(data);
    } catch (err) {
      console.error('Error fetching collection items:', err);
      setError('Could not load items for this collection');
    }
  };

  const fetchAllDocuments = async () => {
    try {
      setLoading(true);
      const data = await knowledgeService.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapFilesToCollections = () => {
    const fileMap = {};
    
    // Initialize all collections with empty arrays
    collections.forEach(collection => {
      fileMap[collection.collection_id] = [];
    });
    
    // Find source documents for each item and map to collection
    items.forEach(item => {
      if (item.source_document_id) {
        const doc = documents.find(d => d.document_id === item.source_document_id);
        if (doc) {
          // Only add if not already present
          const collectionDocs = fileMap[item.collection_id] || [];
          const docExists = collectionDocs.some(d => d.document_id === doc.document_id);
          
          if (!docExists) {
            fileMap[item.collection_id] = [...collectionDocs, doc];
          }
        }
      }
    });
    
    setCollectionFiles(fileMap);
  };

  const handleCreateCollection = async () => {
    try {
      await knowledgeService.createCollection(newCollection);
      setIsNewCollectionModalOpen(false);
      setNewCollection({ name: '', description: '', type: 'general' });
      success('Collection created');
      await fetchCollections();
    } catch (err) {
      console.error('Error creating collection:', err);
      showError('Failed to create collection');
    }
  };

  const handleCreateItem = async () => {
    if (!currentCollection) {
      showError('Please select a collection first');
      return;
    }
    
    try {
      await knowledgeService.createKnowledgeItem(currentCollection.collection_id, newItem);
      setIsNewItemModalOpen(false);
      setNewItem({ title: '', content: '' });
      success('Knowledge item created');
      await fetchCollectionItems(currentCollection.collection_id);
    } catch (err) {
      console.error('Error creating item:', err);
      showError('Failed to create item');
    }
  };

  const handleDelete = (type, item) => {
    setToDelete({ type, item });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    
    try {
      if (toDelete.type === 'collection') {
        await knowledgeService.deleteCollection(toDelete.item.collection_id);
        success('Collection deleted');
        
        // If we deleted the current collection, reset it
        if (currentCollection?.collection_id === toDelete.item.collection_id) {
          const remaining = collections.filter(c => c.collection_id !== toDelete.item.collection_id);
          setCurrentCollection(remaining[0] || null);
        }
        
        await fetchCollections();
      } else if (toDelete.type === 'document') {
        await knowledgeService.deleteDocument(toDelete.item.document_id);
        success('Document deleted');
        await fetchAllDocuments();
        if (currentCollection) {
          await fetchCollectionItems(currentCollection.collection_id);
        }
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      showError('Delete failed');
    } finally {
      setIsDeleteModalOpen(false);
      setToDelete(null);
    }
  };

  const handleUploadComplete = async () => {
    setIsUploadModalOpen(false);
    success('Document uploaded');
    
    // Refresh all data
    await fetchAllDocuments();
    await fetchCollections();
    if (currentCollection) {
      await fetchCollectionItems(currentCollection.collection_id);
    }
  };

  // Handle item edit
  const handleEditItem = (itemId) => {
    // Navigate to the detail page for editing
    navigate(`/knowledge/${itemId}`);
  };

  // Get status badge based on document status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return { 
          class: 'bg-green-100 text-green-800', 
          text: 'Processed',
          icon: CheckCircleIcon
        };
      case 'processing':
        return { 
          class: 'bg-yellow-100 text-yellow-800', 
          text: 'Processing',
          icon: ClockIcon
        };
      case 'failed':
        return { 
          class: 'bg-red-100 text-red-800', 
          text: 'Failed',
          icon: ExclamationCircleIcon
        };
      default:
        return { 
          class: 'bg-gray-100 text-gray-500', 
          text: status,
          icon: DocumentIcon
        };
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsNewCollectionModalOpen(true)}
            className="btn btn-outline text-sm flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            New Collection
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn btn-outline text-sm flex items-center"
          >
            <DocumentIcon className="h-5 w-5 mr-1" />
            Upload
          </button>
          <button
            onClick={() => setIsNewItemModalOpen(true)}
            disabled={!currentCollection || activeView !== 'collections'}
            className="btn btn-primary text-sm flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            Add Item
          </button>
        </div>
      </div>

      {/* Main tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeView === 'collections'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveView('collections')}
          >
            Collections & Items
          </button>
          <button
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeView === 'allDocuments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveView('allDocuments')}
          >
            All Documents
          </button>
        </nav>
      </div>

      {/* Collections view */}
      {activeView === 'collections' && (
        <div className="flex-1 flex flex-col md:flex-row gap-4">
          {/* Left sidebar with collections */}
          <div className="w-full md:w-64 bg-white rounded-lg shadow-sm p-4 md:overflow-y-auto">
            <div className="mb-4 pb-2 border-b">
              <h2 className="text-lg font-medium text-gray-900">Collections</h2>
            </div>

            {/* Collection list */}
            {loading && collections.length === 0 ? (
              <div className="py-20 text-center text-gray-500">
                <div className="spinner mx-auto"></div>
                <p className="mt-2">Loading...</p>
              </div>
            ) : collections.length === 0 ? (
              <div className="py-10 text-center">
                <FolderIcon className="h-10 w-10 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No collections yet</p>
                <button
                  onClick={() => setIsNewCollectionModalOpen(true)}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Create your first collection
                </button>
              </div>
            ) : (
              <ul className="space-y-1">
                {collections.map((collection) => (
                  <li key={collection.collection_id}>
                    <button
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        currentCollection?.collection_id === collection.collection_id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setCurrentCollection(collection)}
                    >
                      <div className="flex items-center">
                        <FolderIcon className="h-5 w-5 mr-2 text-gray-400" />
                        <span className="truncate">{collection.name}</span>
                      </div>
                      
                      <div className="flex items-center">
                        {currentCollection?.collection_id === collection.collection_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete('collection', collection);
                            }}
                            className="ml-2 text-gray-400 hover:text-red-500"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right content area */}
          <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            {!currentCollection ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <FolderIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No Collection Selected</h3>
                  <p className="mt-1 text-gray-500">Select a collection or create a new one</p>
                </div>
              </div>
            ) : (
              <>
                {/* Collection header */}
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">{currentCollection.name}</h2>
                  {currentCollection.description && (
                    <p className="mt-1 text-sm text-gray-500">{currentCollection.description}</p>
                  )}
                  
                  {/* Collection tabs */}
                  <div className="mt-4 flex space-x-4 border-b border-gray-200">
                    <button 
                      className={`px-1 pb-2 border-b-2 font-medium text-sm ${
                        activeTab === 'items'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('items')}
                    >
                      Knowledge Items
                    </button>
                    
                    <button
                      className={`px-1 pb-2 border-b-2 font-medium text-sm ${
                        activeTab === 'files'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('files')}
                    >
                      Files
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="m-4 bg-red-50 border-l-4 border-red-500 p-4">
                    <div className="flex">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                      <p className="ml-3 text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Files tab content */}
                {activeTab === 'files' && (
                  <div className="p-4">
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Files in this collection
                      </h3>
                      <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Upload
                      </button>
                    </div>
                    
                    {(collectionFiles[currentCollection.collection_id] || []).length === 0 ? (
                      <div className="bg-gray-50 rounded-md py-6 px-4 text-center">
                        <p className="text-sm text-gray-500">No files associated with this collection</p>
                        <button
                          onClick={() => setIsUploadModalOpen(true)}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Upload a document
                        </button>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                        {(collectionFiles[currentCollection.collection_id] || []).map(file => {
                          const statusBadge = getStatusBadge(file.status);
                          const StatusIcon = statusBadge.icon;
                          return (
                            <li key={file.document_id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                              <div className="flex items-center">
                                <DocumentIcon className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                                  <div className="mt-1 flex items-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge.class}`}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {statusBadge.text}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      {formatBytes(file.file_size || 0)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDelete('document', file)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Items tab content */}
                {activeTab === 'items' && (
                  <div className="p-4">
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Knowledge Items
                      </h3>
                      <button
                        onClick={() => setIsNewItemModalOpen(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Item
                      </button>
                    </div>
                    
                    {items.length === 0 ? (
                      <div className="bg-gray-50 rounded-md py-6 px-4 text-center">
                        <p className="text-sm text-gray-500">No knowledge items in this collection</p>
                        <button
                          onClick={() => setIsNewItemModalOpen(true)}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Add your first item
                        </button>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                        {items.map(item => (
                          <li key={item.item_id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                              <button
                                onClick={() => handleEditItem(item.item_id)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              Updated {formatDate(item.updated_at)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* All Documents view */}
      {activeView === 'allDocuments' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Upload Document
            </button>
          </div>
          
          {loading ? (
            <div className="py-12 text-center">
              <div className="spinner mx-auto"></div>
              <p className="mt-3 text-gray-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-lg">
              <DocumentIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload documents to enhance your knowledge base
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Upload Document
              </button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map(doc => {
                    const statusBadge = getStatusBadge(doc.status);
                    const StatusIcon = statusBadge.icon;
                    return (
                      <tr key={doc.document_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <DocumentIcon className="h-5 w-5 text-gray-400 mr-3" />
                            <div className="text-sm font-medium text-gray-900">{doc.filename}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.class}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatBytes(doc.file_size || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDelete('document', doc)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsNewCollectionModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">New Collection</h3>
              <button
                onClick={() => setIsNewCollectionModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                id="name"
                value={newCollection.name}
                onChange={(e) => setNewCollection({...newCollection, name: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Collection name"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                id="description"
                value={newCollection.description}
                onChange={(e) => setNewCollection({...newCollection, description: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                rows="2"
                placeholder="Collection description"
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                id="type"
                value={newCollection.type}
                onChange={(e) => setNewCollection({...newCollection, type: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCollection}
                disabled={!newCollection.name}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsNewItemModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Add Knowledge Item
              </h3>
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                id="title"
                value={newItem.title}
                onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Item title"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                id="content"
                value={newItem.content}
                onChange={(e) => setNewItem({...newItem, content: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                rows="8"
                placeholder="Item content"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateItem}
                disabled={!newItem.title || !newItem.content}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
            <p className="mt-2 text-sm text-gray-500">
              {toDelete.type === 'collection' 
                ? `Are you sure you want to delete the "${toDelete.item.name}" collection? This will remove all knowledge items in this collection.`
                : `Are you sure you want to delete "${toDelete.item.filename}"?`}
            </p>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsUploadModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Document</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <DocumentUploader 
              collections={collections} 
              initialCollection={currentCollection?.collection_id}
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