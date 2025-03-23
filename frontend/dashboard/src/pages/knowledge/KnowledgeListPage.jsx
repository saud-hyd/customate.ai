// frontend/dashboard/src/pages/knowledge/KnowledgeListPage.jsx
import React, { useState, useEffect } from 'react';
import knowledgeService from '../../services/knowledgeService';
import DocumentUploader from '../../components/knowledge/DocumentUploader';
import { useToast } from '../../context/ToastContext';

import {
  DocumentIcon,
  DocumentTextIcon,
  FolderIcon,
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemIds, setExpandedItemIds] = useState({});
  const [expandedDocuments, setExpandedDocuments] = useState({}); // Track expanded document sections
  const [sortOption, setSortOption] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  
  const { success, error: showError } = useToast();

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
      setError('Failed to load knowledge collections');
      if (showError) showError('Failed to load collections');
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
      setExpandedItemIds({});
      setExpandedDocuments({});
    } catch (err) {
      console.error('Error fetching collection items:', err);
      setError('Failed to load knowledge items');
      if (showError) showError('Failed to load items');
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
      setError('Failed to load documents');
      if (showError) showError('Failed to load documents');
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
      if (success) success('Collection created successfully');
    } catch (err) {
      console.error('Error creating collection:', err);
      setError('Failed to create collection');
      if (showError) showError('Failed to create collection');
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
      if (success) success('Knowledge item created successfully');
    } catch (err) {
      console.error('Error creating knowledge item:', err);
      setError('Failed to create knowledge item');
      if (showError) showError('Failed to create item');
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
    
    if (success) success('Document uploaded successfully');
  };
  
  // Toggle document expansion
  const toggleDocumentExpansion = (docName) => {
    setExpandedDocuments(prev => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };
  
  // Toggle item content expansion
  const toggleItemExpansion = (itemId) => {
    setExpandedItemIds(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // Apply search filtering and sorting
  const getFilteredAndSortedItems = () => {
    // First filter by search query
    let filtered = searchQuery 
      ? items.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : items;
    
    // Then sort according to selected option
    switch (sortOption) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
      case 'a-z':
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case 'z-a':
        return filtered.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return filtered;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get document section number from title if available
  const getSectionNumber = (title) => {
    const match = title.match(/section\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  };

  // Organize items by document and section
  const organizeItemsByDocument = () => {
    const documentGroups = {};
    
    const filteredItems = getFilteredAndSortedItems();
    
    filteredItems.forEach(item => {
      const docMatch = item.title.match(/(.*?)\.(pdf|docx?)\s*-\s*section\s*\d+/i);
      
      if (docMatch) {
        const docName = docMatch[1] + '.' + docMatch[2];
        if (!documentGroups[docName]) {
          documentGroups[docName] = [];
        }
        documentGroups[docName].push(item);
      } else {
        // For items not matching the pattern, put in "Other"
        if (!documentGroups['Other']) {
          documentGroups['Other'] = [];
        }
        documentGroups['Other'].push(item);
      }
    });
    
    // Sort sections numerically within each document
    Object.keys(documentGroups).forEach(docName => {
      documentGroups[docName].sort((a, b) => {
        const secA = getSectionNumber(a.title) || 0;
        const secB = getSectionNumber(b.title) || 0;
        return secA - secB;
      });
    });
    
    return documentGroups;
  };

  // Get document section count
  const getDocumentSectionCount = (docItems) => {
    return docItems.length;
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {activeCollection ? activeCollection.name : 'Select a Collection'}
              </h2>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {/* Search box */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search items..."
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                
                {/* Filter toggle on mobile */}
                <button
                  className="md:hidden flex items-center text-gray-700 px-3 py-2 border border-gray-300 rounded-md"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
                  {showFilters ? 'Hide Filters' : 'Filters'}
                </button>
                
                {/* Sort options - visible on larger screens */}
                <div className="hidden md:block">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="py-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="a-z">A-Z</option>
                    <option value="z-a">Z-A</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Mobile filters - only shown when filter button is clicked */}
            {showFilters && (
              <div className="md:hidden flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="w-full py-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="a-z">A-Z</option>
                    <option value="z-a">Z-A</option>
                  </select>
                </div>
              </div>
            )}
            
            {activeCollection && activeCollection.description && (
              <p className="text-sm text-gray-600 mb-4">
                {activeCollection.description}
              </p>
            )}
            
            {loading && activeCollection ? (
              <div className="py-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
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
                <p className="mt-2 text-sm">
                  {searchQuery ? 'No items match your search' : 'No items in this collection'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsNewItemModalOpen(true)}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Add your first item
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(organizeItemsByDocument()).map(([docName, docItems]) => (
                  <div key={docName} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Document Header - Always visible */}
                    <div 
                      className="bg-gray-50 px-4 py-3 font-medium text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => toggleDocumentExpansion(docName)}
                    >
                      <div className="flex items-center">
                        {expandedDocuments[docName] ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-2" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-400 mr-2" />
                        )}
                        <span>{docName}</span>
                      </div>
                      <span className="text-xs text-gray-500">{getDocumentSectionCount(docItems)} sections</span>
                    </div>
                    
                    {/* Document Sections - Only visible when document is expanded */}
                    {expandedDocuments[docName] && (
                      <ul className="divide-y divide-gray-200">
                        {docItems.map((item) => (
                          <li key={item.item_id} className="group">
                            <div 
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer ml-4"
                              onClick={() => toggleItemExpansion(item.item_id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {expandedItemIds[item.item_id] ? (
                                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                  )}
                                  <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    {formatDate(item.updated_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded content - Only visible when section is expanded */}
                            {expandedItemIds[item.item_id] && (
                              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 ml-4">
                                <p className="text-sm text-gray-700 whitespace-pre-line ml-7">{item.content}</p>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.document_id} className="hover:bg-gray-50">
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
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* Delete button removed */}
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