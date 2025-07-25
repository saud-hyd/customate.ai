// frontend/dashboard/src/pages/knowledge/EnhancedDocumentListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import knowledgeService from '../../services/knowledgeService';
import EnhancedDocumentUploader from '../../components/knowledge/EnhancedDocumentUploader';
import DocumentPreview from '../../components/knowledge/DocumentPreview';
import { useToast } from '../../context/ToastContext';

// Import icons
import {
  DocumentIcon,
  DocumentArrowUpIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  FolderIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

const EnhancedDocumentListPage = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const { success, error: showError } = useToast();

  // Fetch documents and collections on mount or refresh
  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Apply filters when documents, search query, or filters change
  useEffect(() => {
    applyFilters();
  }, [documents, searchQuery, statusFilter, collectionFilter, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch documents and collections in parallel
      const [documentsData, collectionsData] = await Promise.all([
        knowledgeService.getDocuments(),
        knowledgeService.getCollections()
      ]);
      
      setDocuments(documentsData);
      setCollections(collectionsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load documents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.filename.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }
    
    // Collection filter (this would require modifying the backend to include collection info in documents)
    if (collectionFilter !== 'all' && documents[0]?.collection_id) {
      filtered = filtered.filter(doc => doc.collection_id === collectionFilter);
    }
    
    // Sorting
    switch (sortBy) {
      case 'name-asc':
        filtered.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.filename.localeCompare(a.filename));
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'size-asc':
        filtered.sort((a, b) => a.file_size - b.file_size);
        break;
      case 'size-desc':
        filtered.sort((a, b) => b.file_size - a.file_size);
        break;
      default:
        break;
    }
    
    setFilteredDocuments(filtered);
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await knowledgeService.deleteDocument(documentId);
      success('Document deleted successfully');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again later.');
      showError('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setIsPreviewModalOpen(true);
  };

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    success('Document uploaded successfully');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCollectionFilter('all');
    setSortBy('date-desc');
  };

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

  // Get status badge classes
  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return {
          className: 'bg-green-100 text-green-800',
          icon: <CheckCircleIcon className="h-4 w-4 mr-1" />,
          label: 'Processed'
        };
      case 'processing':
        return {
          className: 'bg-yellow-100 text-yellow-800',
          icon: <ClockIcon className="h-4 w-4 mr-1" />,
          label: 'Processing'
        };
      case 'failed':
        return {
          className: 'bg-red-100 text-red-800',
          icon: <ExclamationTriangleIcon className="h-4 w-4 mr-1" />,
          label: 'Failed'
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800',
          icon: null,
          label: status
        };
    }
  };

  // Get file type icon and color
  const getFileTypeInfo = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return { typeLabel: 'PDF', bgColor: 'bg-red-100', textColor: 'text-red-800' };
      case 'doc':
      case 'docx':
        return { typeLabel: 'DOC', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
      case 'txt':
        return { typeLabel: 'TXT', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
      case 'csv':
        return { typeLabel: 'CSV', bgColor: 'bg-green-100', textColor: 'text-green-800' };
      case 'xls':
      case 'xlsx':
        return { typeLabel: 'XLS', bgColor: 'bg-green-100', textColor: 'text-green-800' };
      case 'md':
        return { typeLabel: 'MD', bgColor: 'bg-purple-100', textColor: 'text-purple-800' };
      default:
        return { typeLabel: extension.toUpperCase(), bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
            <p className="mt-1 text-sm text-gray-500">
              Upload and manage your documents for the knowledge base.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-full text-gray-400 hover:text-gray-500"
              title="Refresh document list"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn btn-primary flex items-center"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-1" />
              Upload Document
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
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
          
          {/* Filter toggle button (mobile) */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex sm:hidden items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          {/* Desktop filters */}
          <div className="hidden sm:flex items-center space-x-2">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="processed">Processed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            
            {/* Collection filter */}
            <select
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Collections</option>
              {collections.map(collection => (
                <option key={collection.collection_id} value={collection.collection_id}>
                  {collection.name}
                </option>
              ))}
            </select>
            
            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="size-desc">Size (Largest First)</option>
              <option value="size-asc">Size (Smallest First)</option>
            </select>
            
            {/* Clear filters button */}
            {(searchQuery || statusFilter !== 'all' || collectionFilter !== 'all' || sortBy !== 'date-desc') && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile filters */}
        {filtersOpen && (
          <div className="mt-4 sm:hidden grid grid-cols-2 gap-2">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="processed">Processed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            
            {/* Collection filter */}
            <select
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Collections</option>
              {collections.map(collection => (
                <option key={collection.collection_id} value={collection.collection_id}>
                  {collection.name}
                </option>
              ))}
            </select>
            
            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="size-desc">Size (Largest First)</option>
              <option value="size-asc">Size (Smallest First)</option>
            </select>
            
            {/* Clear filters button */}
            {(searchQuery || statusFilter !== 'all' || collectionFilter !== 'all' || sortBy !== 'date-desc') && (
              <button
                onClick={clearFilters}
                className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 text-center">
            {documents.length === 0 ? (
              <>
                <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No documents yet</h3>
                <p className="mt-1 text-gray-500">Get started by uploading your first document.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                    Upload Document
                  </button>
                </div>
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No matches found</h3>
                <p className="mt-1 text-gray-500">Try adjusting your search or filter criteria.</p>
                <div className="mt-6">
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Clear Filters
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                Showing {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
                {documents.length !== filteredDocuments.length ? ` (filtered from ${documents.length})` : ''}
              </p>
            </div>
            
            {/* Document cards layout */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => {
                const { typeLabel, bgColor, textColor } = getFileTypeInfo(doc.filename);
                const statusBadge = getStatusBadge(doc.status);
                
                return (
                  <div 
                    key={doc.document_id} 
                    className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
                  >
                    {/* Document header */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
                      <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${bgColor} ${textColor} mr-3`}>
                        {typeLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate" title={doc.filename}>
                          {doc.filename}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Document body */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="flex items-center mb-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      </div>
                      
                      {/* Collection info (if available) */}
                      {doc.collection_name && (
                        <div className="flex items-center text-xs text-gray-500 mb-4">
                          <FolderIcon className="h-4 w-4 mr-1" />
                          {doc.collection_name}
                        </div>
                      )}
                      
                      {/* Action buttons */}
                      <div className="flex space-x-2 mt-auto pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="flex-1 flex items-center justify-center py-2 px-3 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.document_id)}
                          className="flex items-center justify-center py-2 px-3 border border-gray-300 rounded text-sm font-medium text-red-600 bg-white hover:bg-red-50"
                          title="Delete document"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsUploadModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Document</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setIsUploadModalOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <EnhancedDocumentUploader 
              collections={collections} 
              onUploadComplete={handleUploadComplete}
              onCancel={() => setIsUploadModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {isPreviewModalOpen && selectedDocument && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsPreviewModalOpen(false)}></div>
          <div className="relative bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Document Details</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setIsPreviewModalOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <DocumentPreview
              documentId={selectedDocument.document_id}
              onClose={() => setIsPreviewModalOpen(false)}
            />
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setIsPreviewModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDocumentListPage;