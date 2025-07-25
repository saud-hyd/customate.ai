import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import knowledgeService from '../../services/knowledgeService';

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const KnowledgeDetailPage = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  // Fetch item data on component mount
  useEffect(() => {
    fetchItemData();
  }, [id]);

  // Fetch item and collection data
  const fetchItemData = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real app, we would have an API endpoint to get a single item
      // For now, we'll simulate it by getting all items from the collection
      const collections = await knowledgeService.getCollections();
      
      // Find which collection contains this item
      let foundItem = null;
      let foundCollection = null;
      
      for (const col of collections) {
        const items = await knowledgeService.getCollectionItems(col.collection_id);
        const item = items.find(i => i.item_id === id);
        
        if (item) {
          foundItem = item;
          foundCollection = col;
          break;
        }
      }
      
      if (foundItem && foundCollection) {
        setItem(foundItem);
        setCollection(foundCollection);
        setEditForm({
          title: foundItem.title,
          content: foundItem.content
        });
      } else {
        setError('Knowledge item not found');
      }
    } catch (err) {
      console.error('Error fetching knowledge item:', err);
      setError('Failed to load knowledge item. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm({
      ...editForm,
      [name]: value
    });
  };

  // Handle form submission for editing
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // In a real app, we would have an API endpoint to update an item
    // For now, we'll just update the local state
    setItem({
      ...item,
      title: editForm.title,
      content: editForm.content,
      updated_at: new Date().toISOString()
    });
    
    setIsEditing(false);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-3 text-gray-700">Loading knowledge item...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <p className="mt-2">
              <Link to="/dashboard/knowledge" className="text-red-700 underline">
                Return to Knowledge Base
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/dashboard/knowledge" className="mr-4">
              <ArrowLeftIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{item?.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                From the <span className="font-medium">{collection?.name}</span> collection
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={fetchItemData}
              className="p-2 rounded-full text-gray-400 hover:text-gray-500"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn btn-outline flex items-center"
            >
              {isEditing ? (
                <>
                  <XMarkIcon className="h-5 w-5 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <PencilIcon className="h-5 w-5 mr-1" />
                  Edit
                </>
              )}
            </button>
            <button
              className="btn btn-outline flex items-center text-red-600 hover:text-red-800 hover:border-red-800"
            >
              <TrashIcon className="h-5 w-5 mr-1" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={editForm.title}
                onChange={handleInputChange}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                id="content"
                name="content"
                rows="12"
                value={editForm.content}
                onChange={handleInputChange}
                className="input w-full"
                required
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex items-center"
              >
                <CheckIcon className="h-5 w-5 mr-1" />
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start">
              <DocumentTextIcon className="h-6 w-6 text-gray-400 flex-shrink-0 mt-1" />
              <div className="ml-3 flex-1">
                <h2 className="text-xl font-medium text-gray-900">{item?.title}</h2>
                <div className="mt-2 text-sm text-gray-600">
                  <p className="whitespace-pre-line">{item?.content}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 border-t border-gray-200 pt-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(item?.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(item?.updated_at)}</dd>
                </div>
                {item?.source_document_id && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Source Document</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {item.source_document_id}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeDetailPage;