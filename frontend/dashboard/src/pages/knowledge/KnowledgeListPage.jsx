// frontend/dashboard/src/pages/knowledge/KnowledgeListPage.jsx
// Fixed version with proper error handling and authentication

import React, { useState, useEffect } from 'react';
import knowledgeService from '../../services/knowledgeService';
import subscriptionService from '../../services/subscriptionService';
import { useToast } from '../../context/ToastContext';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  DocumentIcon,
  GlobeAltIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  ArrowPathIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const KnowledgeListPage = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);
  const [contentType, setContentType] = useState(''); // 'file' or 'url'
  
  // Storage limit states
  const [storageData, setStorageData] = useState(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState(null);
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // URL crawling states
  const [url, setUrl] = useState('https://');
  const [specificPages, setSpecificPages] = useState(['']);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [crawlingProgress, setCrawlingProgress] = useState('');
  const [isProcessingBlocked, setIsProcessingBlocked] = useState(false);
  const [discoveredPages, setDiscoveredPages] = useState([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  
  const { success, error: showError } = useToast();

  useEffect(() => {
    fetchData();
    fetchStorageData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [collectionsData, documentsData] = await Promise.all([
        knowledgeService.getCollections(),
        knowledgeService.getDocuments()
      ]);
      
      setCollections(collectionsData);
      
      // Combine documents and knowledge items into a unified list
      const allItems = [];
      
      // Add documents
      documentsData.forEach(doc => {
        allItems.push({
          id: `doc_${doc.document_id}`,
          type: 'document',
          name: doc.filename,
          size: doc.file_size,
          date: doc.created_at,
          source: 'file',
          collection: doc.collection_name || 'Default',
          status: doc.status || 'processed'
        });
      });
      
      // Add crawled URLs
      try {
        const crawlData = await knowledgeService.getCrawlJobs();
        if (crawlData.jobs) {
          crawlData.jobs.forEach(crawl => {
            allItems.push({
              id: `url_${crawl.job_id}`,
              type: 'url',
              name: crawl.base_url,
              size: crawl.pages_crawled ? `${crawl.pages_crawled} pages` : 'N/A',
              date: crawl.created_at,
              source: 'website',
              collection: 'Default',
              status: crawl.status
            });
          });
        }
      } catch (e) {
        console.log('No crawl data available');
      }
      
      setItems(allItems);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to load knowledge base data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageData = async () => {
    try {
      setStorageLoading(true);
      setStorageError(null);
      
      // ✅ Use the service method instead of direct fetch
      const data = await subscriptionService.getStorageBreakdown();
      
      console.log('✅ Storage data from service:', data);
      setStorageData(data);
      
    } catch (error) {
      console.error('❌ Error fetching storage data:', error);
      setStorageError(error.message);
      
      // Provide fallback data
      setStorageData({
        total_bytes: 0,
        document_bytes: 0,
        knowledge_bytes: 0,
        crawled_content_bytes: 0,
        percentage: 0,
        limit_bytes: 524288, // 500 KB (free plan)
        limit_mb: 0.5,
        used_mb: 0
      });
    } finally {
      setStorageLoading(false);
    }
  };

  const filteredItems = searchQuery
    ? items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.collection.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  const formatFileSize = (size) => {
    if (typeof size === 'string') return size; // For crawled pages
    return formatBytes(size);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const checkStorageBeforeUpload = (file) => {
    if (storageData && !storageError) {
      const fileSizeMB = file.size / (1024 * 1024);
      const remainingMB = storageData.limit_mb - storageData.used_mb;
      
      if (fileSizeMB > remainingMB) {
        showError(`File too large! You have ${remainingMB.toFixed(1)} MB remaining, but this file is ${fileSizeMB.toFixed(1)} MB.`);
        return false;
      }
      
      if (storageData.percentage >= 100) {
        showError('Storage limit reached! Please remove some content or upgrade your plan.');
        return false;
      }
    }
    return true;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        showError('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.');
        return;
      }
      
      if (!checkStorageBeforeUpload(file)) {
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        showError('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.');
        return;
      }
      
      if (!checkStorageBeforeUpload(file)) {
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      showError('Please select a file');
      return;
    }

    if (!checkStorageBeforeUpload(selectedFile)) {
      return;
    }

    setIsUploading(true);
    setIsProcessingBlocked(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const result = await knowledgeService.uploadDocument(selectedFile, selectedCollection || '');
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        success(`Document "${selectedFile.name}" uploaded successfully`);
        setIsAddContentModalOpen(false);
        setContentType('');
        setSelectedFile(null);
        setSelectedCollection('');
        setUploadProgress(0);
        setIsUploading(false);
        setIsProcessingBlocked(false);
        fetchData();
        fetchStorageData(); // Refresh storage after upload
      }, 1000);
      
    } catch (error) {
      console.error('Upload error:', error);
      showError('Failed to upload document');
      setIsUploading(false);
      setIsProcessingBlocked(false);
      setUploadProgress(0);
    }
  };

  const handleUrlCrawl = async () => {
    if (!url || url === 'https://') {
      showError('Please enter a valid URL');
      return;
    }

    // Check storage before crawling
    if (storageData && storageData.percentage >= 95) {
      showError('Storage is nearly full! Please remove some content before crawling new websites.');
      return;
    }

    setIsCrawling(true);
    setIsAnalyzing(true);
    setIsProcessingBlocked(true);
    setCrawlingProgress('Starting analysis...');

    try {
      const result = await knowledgeService.crawlWebsite({
        url: url,
        pages: specificPages.filter(page => page.trim() !== '')
      });

      if (result.success) {
        setTimeout(() => {
          success('Website crawled successfully');
          setIsAddContentModalOpen(false);
          setContentType('');
          setUrl('https://');
          setSpecificPages(['']);
          setIsCrawling(false);
          setIsAnalyzing(false);
          setCrawlingProgress('');
          setIsProcessingBlocked(false);
          setDiscoveredPages([]);
          setAnalysisComplete(false);
          setAnalysisResults(null);
          fetchData();
          fetchStorageData(); // Refresh storage after crawling
        }, 2000);
      } else {
        throw new Error(result.message || 'Crawling failed');
      }
    } catch (error) {
      console.error('Crawling error:', error);
      showError('Failed to crawl website');
      setIsCrawling(false);
      setIsAnalyzing(false);
      setCrawlingProgress('');
      setIsProcessingBlocked(false);
    }
  };

  const handleDeleteItem = async (item) => {
    // Fixed: Use window.confirm instead of confirm
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      if (item.type === 'document') {
        await knowledgeService.deleteDocument(item.id.replace('doc_', ''));
      } else if (item.type === 'url') {
        await knowledgeService.deleteCrawlJob(item.id.replace('url_', ''));
      }
      
      success(`${item.name} deleted successfully`);
      fetchData();
      fetchStorageData(); // Refresh storage after deletion
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete item');
    }
  };

  const addSpecificPage = () => {
    setSpecificPages([...specificPages, '']);
  };

  const updateSpecificPage = (index, value) => {
    const updated = [...specificPages];
    updated[index] = value;
    setSpecificPages(updated);
  };

  const removeSpecificPage = (index) => {
    if (specificPages.length > 1) {
      const updated = specificPages.filter((_, i) => i !== index);
      setSpecificPages(updated);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'processed': { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, text: 'Processed' },
      'processing': { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, text: 'Processing' },
      'failed': { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon, text: 'Failed' },
      'pending': { color: 'bg-gray-100 text-gray-800', icon: ClockIcon, text: 'Pending' }
    };

    const config = statusConfig[status] || statusConfig['pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Processing Overlay */}
      {isProcessingBlocked && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isUploading ? 'Processing Document...' : isAnalyzing ? 'Analyzing Website...' : 'Crawling Website...'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {isUploading 
                  ? 'Please wait while we process your document. Do not navigate away from this page.'
                  : isAnalyzing 
                  ? 'Please wait while we analyze the website structure and discover pages. Do not navigate away from this page.'
                  : crawlingProgress || 'Please wait while we crawl the website. Do not navigate away from this page.'
                }
              </p>
              {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header with Storage Indicator */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Knowledge Base</h1>
        
        {/* Storage Indicator */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          {storageLoading ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-pulse w-4 h-4 bg-gray-300 rounded"></div>
              <span className="text-sm">Loading storage...</span>
            </div>
          ) : storageError ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">Storage: {storageError}</span>
              <button
                onClick={fetchStorageData}
                className="text-xs text-orange-600 hover:text-orange-700 underline"
              >
                Retry
              </button>
            </div>
          ) : storageData ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {storageData.percentage > 80 ? (
                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                  ) : (
                    <ServerIcon className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    Storage: {formatBytes(storageData.total_bytes)} / {storageData.limit_mb} MB
                  </span>
                  
                  {/* Refresh button */}
                  <button
                    onClick={fetchStorageData}
                    disabled={storageLoading}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Refresh storage data"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${storageLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        storageData.percentage > 80 ? 'bg-red-500' : 
                        storageData.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(storageData.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {storageData.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {/* Storage breakdown - desktop only */}
              <div className="hidden lg:flex text-xs text-gray-500 space-x-4">
                <span>Documents: {formatBytes(storageData.document_bytes)}</span>
                <span>Crawled: {formatBytes(storageData.crawled_content_bytes)}</span>
                <span>Knowledge: {formatBytes(storageData.knowledge_bytes)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500">
              <ServerIcon className="w-5 h-5" />
              <span className="text-sm">Storage: Unable to load</span>
            </div>
          )}
        </div>
        
        {/* Storage warning */}
        {storageData && storageData.percentage > 90 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                Storage is {storageData.percentage > 95 ? 'almost full' : 'getting full'}. 
                Consider removing unused content or upgrading your plan.
              </span>
            </div>
          </div>
        )}
        
        {/* Search and Add Content */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents and websites..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddContentModalOpen(true)}
            disabled={storageData && storageData.percentage >= 100}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              storageData && storageData.percentage >= 100
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
            title={storageData && storageData.percentage >= 100 ? 'Storage limit reached' : 'Add new content'}
          >
            <PlusIcon className="h-5 w-5" />
            Add Content
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading knowledge base...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? 'No items match your search criteria.' 
                : 'Start by uploading documents or crawling websites to build your knowledge base.'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsAddContentModalOpen(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                Add Your First Content
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.type === 'document' ? (
                          <DocumentIcon className="h-5 w-5 text-blue-500 mr-3" />
                        ) : (
                          <GlobeAltIcon className="h-5 w-5 text-green-500 mr-3" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.collection}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.type === 'document' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.type === 'document' ? 'Document' : 'Website'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(item.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          className="text-orange-600 hover:text-orange-900"
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Content Modal */}
      {isAddContentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAddContentModalOpen(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Add Content to Knowledge Base
                    </h3>
                    
                    {!contentType ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => setContentType('file')}
                          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <DocumentIcon className="h-6 w-6 text-blue-500 mr-3" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">Upload Document</div>
                            <div className="text-sm text-gray-500">PDF, DOCX, DOC, or TXT files</div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setContentType('url')}
                          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <GlobeAltIcon className="h-6 w-6 text-green-500 mr-3" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">Crawl Website</div>
                            <div className="text-sm text-gray-500">Extract content from web pages</div>
                          </div>
                        </button>
                      </div>
                    ) : contentType === 'file' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Collection (Optional)
                          </label>
                          <select
                            value={selectedCollection}
                            onChange={(e) => setSelectedCollection(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="">Default Collection</option>
                            {collections.map(collection => (
                              <option key={collection.id} value={collection.name}>
                                {collection.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload File
                          </label>
                          <div
                            onDrop={handleFileDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors"
                          >
                            {selectedFile ? (
                              <div className="space-y-2">
                                <DocumentIcon className="h-8 w-8 text-blue-500 mx-auto" />
                                <div className="text-sm font-medium text-gray-900">{selectedFile.name}</div>
                                <div className="text-sm text-gray-500">{formatBytes(selectedFile.size)}</div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto" />
                                <div className="text-sm text-gray-600">
                                  Drop your file here or{' '}
                                  <label className="text-orange-600 hover:text-orange-700 cursor-pointer">
                                    browse
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.docx,.doc,.txt"
                                      onChange={handleFileSelect}
                                    />
                                  </label>
                                </div>
                                <div className="text-xs text-gray-500">PDF, DOCX, DOC, TXT up to 10MB</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Website URL
                          </label>
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Specific Pages (Optional)
                          </label>
                          {specificPages.map((page, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={page}
                                onChange={(e) => updateSpecificPage(index, e.target.value)}
                                placeholder="/page-path"
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                              {specificPages.length > 1 && (
                                <button
                                  onClick={() => removeSpecificPage(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={addSpecificPage}
                            className="text-orange-600 hover:text-orange-700 text-sm"
                          >
                            + Add another page
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {contentType ? (
                  <>
                    <button
                      onClick={contentType === 'file' ? handleFileUpload : handleUrlCrawl}
                      disabled={contentType === 'file' ? !selectedFile : !url || url === 'https://'}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {contentType === 'file' ? 'Upload' : 'Start Crawling'}
                    </button>
                    <button
                      onClick={() => {
                        setContentType('');
                        setSelectedFile(null);
                        setUrl('https://');
                        setSpecificPages(['']);
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Back
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsAddContentModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeListPage;