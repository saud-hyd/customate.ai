// frontend/dashboard/src/pages/knowledge/KnowledgeListPage.jsx
// REPLACE ENTIRE FILE CONTENT with this unified implementation

import React, { useState, useEffect } from 'react';
import knowledgeService from '../../services/knowledgeService';
import DocumentUploader from '../../components/knowledge/DocumentUploader';
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const KnowledgeListPage = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);
  const [contentType, setContentType] = useState(''); // 'file' or 'url'
  
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
              collection: 'Default', // You might want to add collection info to crawl jobs
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

  const filteredItems = searchQuery
    ? items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.collection.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        showError('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.');
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
      
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      showError('Please select a file');
      return;
    }

    setIsUploading(true);
    setIsProcessingBlocked(true);
    setUploadProgress(0);

    try {
      // Simulate progress
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
        fetchData(); // Refresh the list
      }, 1000);
      
    } catch (error) {
      console.error('Upload error:', error);
      showError('Failed to upload document');
      setIsUploading(false);
      setIsProcessingBlocked(false);
      setUploadProgress(0);
    }
  };

  const handleAnalyzeWebsite = async () => {
    if (!url || url === 'https://' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      showError('Please enter a valid URL');
      return;
    }

    setIsAnalyzing(true);
    setIsProcessingBlocked(true);
    setCrawlingProgress('Analyzing website structure...');

    try {
      console.log('Starting website analysis for:', url);
      const analysis = await knowledgeService.analyzeWebsite(url);
      console.log('Analysis result:', analysis);
      
      // Ensure we have at least the main URL if no pages were discovered
      let pages = analysis.discovered_pages || [];
      if (pages.length === 0) {
        pages = [{
          url: url,
          title: url,
          priority: "CRITICAL",
          estimated_size: 5000,
          page_type: "homepage",
          selected: true
        }];
      }
      
      setAnalysisResults(analysis);
      setDiscoveredPages(pages);
      setAnalysisComplete(true);
      setIsProcessingBlocked(false);
      setIsAnalyzing(false);
      setCrawlingProgress('');
      
      success(`Found ${pages.length} pages to crawl!`);
    } catch (error) {
      console.error('Analysis error:', error);
      console.error('Error details:', error.response?.data);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to analyze website';
      showError(`Analysis failed: ${errorMessage}`);
      
      setIsAnalyzing(false);
      setIsProcessingBlocked(false);
      setCrawlingProgress('');
    }
  };

  const handleUrlCrawl = async () => {
    const selectedPages = (discoveredPages || []).filter(page => page.selected);
    
    if (selectedPages.length === 0) {
      showError('Please select at least one page to crawl');
      return;
    }

    setIsCrawling(true);
    setIsProcessingBlocked(true);
    setCrawlingProgress('Starting intelligent crawl...');

    try {
      console.log('Starting crawl with selected pages:', selectedPages.map(p => p.url));
      
      const crawlData = {
        url,
        intelligent_mode: true,
        specific_pages: selectedPages.map(page => page.url),
        max_pages: selectedPages.length
      };

      console.log('Crawl data:', crawlData);

      // Start crawling with progress updates
      setCrawlingProgress(`Crawling ${selectedPages.length} selected pages...`);
      
      setTimeout(() => setCrawlingProgress('Processing content...'), 2000);
      setTimeout(() => setCrawlingProgress('Creating knowledge items...'), 4000);
      setTimeout(() => setCrawlingProgress('Finalizing...'), 6000);

      const result = await knowledgeService.createCrawlJob(crawlData);
      console.log('Crawl result:', result);
      
      setCrawlingProgress('Crawl completed successfully!');
      
      setTimeout(() => {
        success(`Successfully crawled ${selectedPages.length} pages from ${url}`);
        setIsAddContentModalOpen(false);
        setContentType('');
        setUrl('https://');
        setSpecificPages(['']);
        setSelectedCollection('');
        setDiscoveredPages([]);
        setAnalysisComplete(false);
        setAnalysisResults(null);
        setIsCrawling(false);
        setIsProcessingBlocked(false);
        setCrawlingProgress('');
        fetchData(); // Refresh the list
      }, 1500);
      
    } catch (error) {
      console.error('Crawl error:', error);
      console.error('Crawl error details:', error.response?.data);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to crawl website';
      showError(`Crawl failed: ${errorMessage}`);
      
      setIsCrawling(false);
      setIsProcessingBlocked(false);
      setCrawlingProgress('');
    }
  };

  const togglePageSelection = (index, selected) => {
    if (!discoveredPages || index < 0 || index >= discoveredPages.length) {
      return;
    }
    const updatedPages = [...discoveredPages];
    updatedPages[index].selected = selected;
    setDiscoveredPages(updatedPages);
  };

  const selectAllPages = () => {
    const updatedPages = (discoveredPages || []).map(page => ({ ...page, selected: true }));
    setDiscoveredPages(updatedPages);
  };

  const deselectAllPages = () => {
    const updatedPages = (discoveredPages || []).map(page => ({ ...page, selected: false }));
    setDiscoveredPages(updatedPages);
  };

  const resetAnalysis = () => {
    setAnalysisComplete(false);
    setAnalysisResults(null);
    setDiscoveredPages([]);
  };

  const addSpecificPage = () => {
    setSpecificPages([...specificPages, '']);
  };

  const removeSpecificPage = (index) => {
    if (specificPages.length > 1) {
      setSpecificPages(specificPages.filter((_, i) => i !== index));
    } else {
      setSpecificPages(['']);
    }
  };

  const updateSpecificPage = (index, value) => {
    const newPages = [...specificPages];
    newPages[index] = value;
    setSpecificPages(newPages);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      if (item.type === 'document') {
        await knowledgeService.deleteDocument(item.id.replace('doc_', ''));
      } else if (item.type === 'url') {
        await knowledgeService.cancelCrawlJob(item.id.replace('url_', ''));
      }
      
      success('Item deleted successfully');
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete item');
    }
  };

  const formatFileSize = (size) => {
    if (typeof size === 'string') return size;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Loading knowledge base...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Processing Overlay */}
      {isProcessingBlocked && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
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

      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Knowledge Base</h1>
        
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
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Content
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first document or website</p>
            <button
              onClick={() => setIsAddContentModalOpen(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              Add Content
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                      {item.type === 'document' ? (
                        <DocumentIcon className="h-8 w-8 text-blue-500" />
                      ) : (
                        <GlobeAltIcon className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(item.size)} • {formatDate(item.date)} • {item.collection}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.status === 'processed' || item.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'processing' || item.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status || 'processed'}
                    </span>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Content Modal */}
      {isAddContentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Add Content</h3>
              <button
                onClick={() => {
                  setIsAddContentModalOpen(false);
                  setContentType('');
                  setSelectedFile(null);
                  setUrl('https://');
                  setSpecificPages(['']);
                  setSelectedCollection('');
                  setAnalysisComplete(false);
                  setAnalysisResults(null);
                  setDiscoveredPages([]);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {!contentType ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">Choose how you want to add content:</p>
                <button
                  onClick={() => setContentType('file')}
                  className="w-full p-4 border border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <DocumentIcon className="h-8 w-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-gray-900">Upload File</h4>
                      <p className="text-sm text-gray-600">Upload PDF, DOCX, DOC, or TXT files</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setContentType('url')}
                  className="w-full p-4 border border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <GlobeAltIcon className="h-8 w-8 text-green-500" />
                    <div>
                      <h4 className="font-medium text-gray-900">Add Website</h4>
                      <p className="text-sm text-gray-600">Crawl and extract content from websites</p>
                    </div>
                  </div>
                </button>
              </div>
            ) : contentType === 'file' ? (
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300'
                    }`}
                    onDrop={handleFileDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById('fileInput').click()}
                  >
                    <input
                      id="fileInput"
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.doc,.txt"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Drop your file here or click to browse
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOCX, DOC, TXT
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setContentType('')}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || isUploading}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {!analysisComplete ? (
                  // Step 1: URL Analysis
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">Intelligent Website Analysis</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            We'll analyze your website to discover all available pages, check sitemaps, and prioritize content automatically. You can then choose which pages to crawl.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setContentType('')}
                        className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleAnalyzeWebsite}
                        disabled={!url || url === 'https://' || isAnalyzing}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Analyze Website
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  // Step 2: Page Selection and Crawling
                  <>
                    {/* Analysis Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        <h4 className="text-sm font-medium text-green-900">Analysis Complete</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-green-700">Pages Found:</span>
                          <span className="font-medium text-green-900 ml-1">{analysisResults?.total_pages_found || 0}</span>
                        </div>
                        <div>
                          <span className="text-green-700">Sitemap:</span>
                          <span className="font-medium text-green-900 ml-1">
                            {analysisResults?.has_sitemap ? 'Found' : 'Not found'}
                          </span>
                        </div>
                        <div>
                          <span className="text-green-700">Est. Size:</span>
                          <span className="font-medium text-green-900 ml-1">
                            {Math.round((analysisResults?.estimated_total_size || 0) / 1024)} KB
                          </span>
                        </div>
                        <div>
                          <span className="text-green-700">Est. Time:</span>
                          <span className="font-medium text-green-900 ml-1">
                            {analysisResults?.analysis_summary?.estimated_crawl_time || '~30 seconds'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Page Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Select Pages to Crawl ({(discoveredPages || []).filter(p => p.selected).length} selected)
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllPages}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Select All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={deselectAllPages}
                            className="text-xs text-gray-600 hover:text-gray-700"
                          >
                            Deselect All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={resetAnalysis}
                            className="text-xs text-gray-600 hover:text-gray-700"
                          >
                            Reanalyze
                          </button>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                        {discoveredPages && discoveredPages.length > 0 ? discoveredPages.map((page, index) => (
                          <div key={index} className="flex items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={page.selected}
                              onChange={(e) => togglePageSelection(index, e.target.checked)}
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {page.title || page.url.split('/').pop() || page.url}
                                </p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  page.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                  page.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  page.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {page.priority}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{page.url}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="p-4 text-center text-gray-500">
                            <p className="text-sm">No pages discovered. Please try a different URL.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={resetAnalysis}
                        className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Back to Analysis
                      </button>
                      <button
                        onClick={handleUrlCrawl}
                        disabled={(discoveredPages || []).filter(p => p.selected).length === 0 || isCrawling}
                        className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isCrawling ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Crawling...
                          </>
                        ) : (
                          <>
                            <GlobeAltIcon className="h-4 w-4" />
                            Crawl {(discoveredPages || []).filter(p => p.selected).length} Pages
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeListPage;