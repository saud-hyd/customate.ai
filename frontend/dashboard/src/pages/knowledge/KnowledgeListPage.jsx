import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import knowledgeService from '../../services/knowledgeService';

// Import icons
import {
  FolderIcon,
  DocumentIcon,
  PlusIcon,
  ArrowPathIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// Import components
import DocumentUploader from '../../components/knowledge/DocumentUploader';

const KnowledgeListPage = () => {
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [items, setItems] = useState([]);
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

  // Fetch all collections
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

  // Fetch items for a collection
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

  // Create new collection
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

  // Create new knowledge item
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

  // Handle file upload completion
  const handleUploadComplete = async () => {
    setIsUploadModalOpen(false);
    await fetchCollections();
    
    if (activeCollection) {
      await fetchCollectionItems(activeCollection.collection_id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your knowledge collections and content.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setIsNewCollectionModalOpen(true)}
              className="btn btn-outline flex items-center"
            >
              <FolderPlusIcon className="h-5 w-5 mr-1" />
              New Collection
            </button>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="btn btn-outline flex items-center"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-1" />
              Upload Document
            </button>
            <button
              type="button"
              onClick={() => setIsNewItemModalOpen(true)}
              disabled={!activeCollection}
              className="btn btn-primary flex items-center"
            >
              <DocumentPlusIcon className="h-5 w-5 mr-1" />
              New Item
            </button>
          </div>
        </div>
      </div>

      {/* Main content with sidebar layout */}
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
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {loading && collections.length === 0 ? (
            <div className="py-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-sm">Loading collections...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <FolderIcon className="mx-auto h-12 w-12" />
              <p className="mt-2 text-sm">No collections yet</p>
              <button
                onClick={() => setIsNewCollectionModalOpen(true)}
                className="mt-2 text-sm text-primary-600 hover:text-primary-500"
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
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FolderIcon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{collection.name}</span>
                    <span className="ml-auto text-xs text-gray-500">{collection.item_count}</span>
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
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search items..."
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-sm">Loading items...</p>
            </div>
          ) : !activeCollection ? (
            <div className="py-8 text-center text-gray-500">
              <DocumentIcon className="mx-auto h-12 w-12" />
              <p className="mt-2 text-sm">Select a collection to view items</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <DocumentIcon className="mx-auto h-12 w-12" />
              <p className="mt-2 text-sm">No items in this collection</p>
              <button
                onClick={() => setIsNewItemModalOpen(true)}
                className="mt-2 text-sm text-primary-600 hover:text-primary-500"
              >
                Add your first item
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.item_id} className="py-4">
                  <div className="flex items-start">
                    <DocumentIcon className="h-6 w-6 text-gray-400 flex-shrink-0 mt-1" />
                    <div className="ml-3 flex-1">
                      <h3 className="text-base font-medium text-gray-900">{item.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.content}</p>
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                        <span className="mx-2">•</span>
                        <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">Edit</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
    </div>
  );
};

export default KnowledgeListPage;