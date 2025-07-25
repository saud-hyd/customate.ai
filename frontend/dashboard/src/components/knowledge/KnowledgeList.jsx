// frontend/dashboard/src/pages/knowledge/KnowledgeListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import knowledgeService from '../../services/knowledgeService';
import DocumentUploader from '../../components/knowledge/DocumentUploader';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Import icons
import {
  DocumentIcon,
  DocumentTextIcon,
  FolderIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const KnowledgeListPage = () => {
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [items, setItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [newCollection, setNewCollection] = useState({ name: '', description: '', type: 'general' });
  const [newItem, setNewItem] = useState({ title: '', content: '' });
  const [view, setView] = useState('collections'); // 'collections' or 'documents'
  
  const { success, error: showError } = useToast();

  // Fetch collections and documents on component mount
  useEffect(() => {
    fetchCollections();
    fetchDocuments();
  }, []);

  // Fetch items when active collection changes
  useEffect(() => {
    if (activeCollection) {
      fetchCollectionItems(activeCollection.collection_id);
    } else {
      setItems([]);
    }
  }, [activeCollection]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await knowledgeService.getCollections();
      setCollections(data);
      
      // Set the first collection as active if available and none is currently selected
      if (data.length > 0 && !activeCollection) {
        setActiveCollection(data[0]);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to load knowledge collections. Please try again later.');
      showError('Failed to load collections');
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
      showError('Failed to load items');
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
      showError('Failed to load documents');
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
      success('Collection created successfully');
      await fetchCollections();
    } catch (err) {
      console.error('Error creating collection:', err);
      setError('Failed to create collection. Please try again later.');
      showError('Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return;
    
    try {
      setLoading(true);
      setError(null);
      await knowledgeService.deleteCollection(collectionToDelete.collection_id);
      success(`Collection "${collectionToDelete.name}" deleted successfully`);
      await fetchCollections();
      
      if (activeCollection?.collection_id === collectionToDelete.collection_id) {
        setActiveCollection(null);
      }
    } catch (err) {
      console.error('Error deleting collection:', err);
      setError('Failed to delete collection. Please try again later.');
      showError('Failed to delete collection');
    } finally {
      setLoading(false);
      setIsDeleteConfirmOpen(false);
      setCollectionToDelete(null);
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
      success('Knowledge item created successfully');
      await fetchCollectionItems(activeCollection.collection_id);
    } catch (err) {
      console.error('Error creating knowledge item:', err);
      setError('Failed to create knowledge item. Please try again later.');
      showError('Failed to create knowledge item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      setError(null);
      await knowledgeService.deleteKnowledgeItem(itemToDelete.item_id);
      success('Knowledge item deleted successfully');
      await fetchCollectionItems(activeCollection.collection_id);
    } catch (err) {
      console.error('Error deleting knowledge item:', err);
      setError('Failed to delete knowledge item. Please try again later.');
      showError('Failed to delete knowledge item');
    } finally {
      setLoading(false);
      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    try {
      setLoading(true);
      await knowledgeService.deleteDocument(documentToDelete.document_id);
      success('Document deleted successfully');
      await fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again later.');
      showError('Failed to delete document');
    } finally {
      setLoading(false);
      setIsDeleteConfirmOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleUploadComplete = async () => {
    setIsUploadModalOpen(false);
    success('Document uploaded successfully');
    await fetchCollections();
    await fetchDocuments();
    
    if (activeCollection) {
      await fetchCollectionItems(activeCollection.collection_id);
    }
  };

  const confirmDeleteCollection = (collection) => {
    setCollectionToDelete(collection);
    setItemToDelete(null);
    setDocumentToDelete(null);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteItem = (item) => {
    setItemToDelete(item);
    setCollectionToDelete(null);
    setDocumentToDelete(null);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteDocument = (document) => {
    setDocumentToDelete(document);
    setItemToDelete(null);
    setCollectionToDelete(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter items based on search query
  const filteredItems = searchQuery
    ? items.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  // Filter documents based on search query
  const filteredDocuments = searchQuery
    ? documents.filter(doc => 
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your knowledge base content and documents
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn btn-outline flex items-center"
            >
              <DocumentIcon className="h-5 w-5 mr-2" />
              Upload Document
            </button>
            <button
              onClick={() => setIsNewCollectionModalOpen(true)}
              className="btn btn-outline flex items-center"
            >
              <FolderIcon className="h-5 w-5 mr-2" />
              New Collection
            </button>
            <button
              onClick={() => setIsNewItemModalOpen(true)}
              disabled={!activeCollection}
              className="btn btn-primary flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Item
            </button>
          </div>
        </div>
      </div>

      {/* View toggle tabs */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`whitespace-nowrap py-4 px-8 border-b-2 font-medium text-sm ${
                view === 'collections' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setView('collections')}
            >
              Collections & Items
            </button>
            <button
              className={`whitespace-nowrap py-4 px-8 border-b-2 font-medium text-sm ${
                view === 'documents' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setView('documents')}
            >
              Documents
            </button>
          </nav>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${view === 'collections' ? 'knowledge items' : 'documents'}...`}
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* View content based on selected tab */}
        {view === 'collections' ? (
          <div className="flex flex-col md:flex-row">
            {/* Collections sidebar */}
            <div className="w-full md:w-64 p-4 border-r border-gray-200 md:min-h-[500px]">
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
                <div className="py-10 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : collections.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
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
                    <li key={collection.collection_id} className="group relative">
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
                      <button
                        onClick={() => confirmDeleteCollection(collection)}
                        className="hidden group-hover:block absolute right-0 top-1/2 transform -translate-y-1/2 mr-1 p-1 text-gray-400 hover:text-red-500 rounded-full"
                        title="Delete collection"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Knowledge items */}
            <div className="flex-1 p-4">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  {activeCollection ? activeCollection.name : 'Select a Collection'}
                </h2>
                {activeCollection && (
                  <p className="mt-1 text-sm text-gray-500">
                    {activeCollection.description || `All items in the ${activeCollection.name} collection.`}
                  </p>
                )}
              </div>

              {loading && activeCollection && filteredItems.length === 0 ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : !activeCollection ? (
                <div className="py-10 text-center text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm">Select a collection to view items</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
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
                  {filteredItems.map((item) => (
                    <li key={item.item_id} className="py-4 group relative">
                      <div className="flex items-start">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-1 mr-3 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center">
                            <h3 className="text-base font-medium text-gray-900 truncate">
                              {item.title}
                            </h3>
                            <div className="hidden group-hover:flex ml-2 space-x-1">
                              <Link 
                                to={`/dashboard/knowledge/${item.item_id}`} 
                                className="text-gray-400 hover:text-indigo-600"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => confirmDeleteItem(item)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.content}</p>
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <span>Updated: {formatDate(item.updated_at)}</span>
                            {item.source_document_id && (
                              <>
                                <span className="mx-1">•</span>
                                <span>From Document</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          // Document list view
          <div className="p-4">
            {loading ? (
              <div className="py-10 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
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
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => (
                  <li key={doc.document_id} className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-150 ease-in-out">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg 
                          ${doc.file_type.includes('pdf') ? 'bg-red-100 text-red-800' : 
                           doc.file_type.includes('doc') ? 'bg-blue-100 text-blue-800' : 
                           'bg-gray-100 text-gray-800'}`}>
                          {doc.file_type.split('/').pop().toUpperCase().slice(0, 3)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate" title={doc.filename}>
                          {doc.filename}
                        </h3>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                            ${doc.status === 'processed' ? 'bg-green-100 text-green-800' : 
                             doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 
                             'bg-red-100 text-red-800'}`}>
                            {doc.status}
                          </span>
                          <span className="ml-2">{formatFileSize(doc.file_size)}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(doc.created_at)}</p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 hidden group-hover:flex space-x-1">
                      <button className="p-1 text-gray-400 hover:text-indigo-600">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button 
                        className="p-1 text-gray-400 hover:text-red-500"
                        onClick={() => confirmDeleteDocument(doc)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

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

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsDeleteConfirmOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {collectionToDelete ? 'Delete Collection' : 
                   itemToDelete ? 'Delete Knowledge Item' : 
                   'Delete Document'}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {collectionToDelete ? 
                      `Are you sure you want to delete the "${collectionToDelete.name}" collection? This will permanently remove all items in this collection.` : 
                     itemToDelete ? 
                      `Are you sure you want to delete the "${itemToDelete.title}" item? This action cannot be undone.` :
                      `Are you sure you want to delete this document? This will also remove any knowledge items created from it.`}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={
                  collectionToDelete ? handleDeleteCollection : 
                  itemToDelete ? handleDeleteItem : 
                  handleDeleteDocument
                }
              >
                Delete
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeListPage;