// frontend/dashboard/src/components/knowledge/StorageLimitAwareUploader.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  XMarkIcon, 
  DocumentArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import knowledgeService from '../../services/knowledgeService';
import subscriptionService from '../../services/subscriptionService';
import { useToast } from '../../context/ToastContext';

const StorageLimitAwareUploader = ({ collections, onUploadComplete, onCancel }) => {
  const [file, setFile] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wouldExceedLimit, setWouldExceedLimit] = useState(false);
  const fileInputRef = useRef(null);

  const { success, error: showError } = useToast();
  
  // Accepted file types for upload
  const acceptedFileTypes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/markdown'
  ];

  // Fetch storage usage info on component mount
  useEffect(() => {
    fetchStorageInfo();
  }, []);

  // Check if storage is at capacity
  const isAtCapacity = () => {
    if (!storageInfo) return false;
    return storageInfo.storage?.percentage >= 100;
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fetch current storage info
  const fetchStorageInfo = async () => {
    try {
      setIsLoading(true);
      const data = await subscriptionService.getSubscriptionLimits();
      setStorageInfo(data);
    } catch (err) {
      console.error('Error fetching storage info:', err);
      setError('Unable to fetch storage information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Storage Status Display Component
  const StorageStatusDisplay = () => {
    if (!storageInfo || !storageInfo.storage) return null;
    
    const { used_bytes, limit_bytes, percentage } = storageInfo.storage;
    const usedMB = (used_bytes / (1024 * 1024)).toFixed(2);
    const limitMB = (limit_bytes / (1024 * 1024)).toFixed(2);
    const remainingMB = ((limit_bytes - used_bytes) / (1024 * 1024)).toFixed(2);
    
    const isNearLimit = percentage >= 80;
    const isAtLimit = percentage >= 100;
    
    return (
      <div className={`p-4 rounded-lg border mb-4 ${
        isAtLimit ? 'bg-red-50 border-red-200' : 
        isNearLimit ? 'bg-yellow-50 border-yellow-200' : 
        'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Storage Usage</span>
          <span className="text-sm text-gray-600">{usedMB}MB / {limitMB}MB</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full ${
              isAtLimit ? 'bg-red-500' : 
              isNearLimit ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-gray-600">
          {isAtLimit ? (
            <span className="text-red-600">⚠️ Storage limit reached. Please delete files or upgrade.</span>
          ) : isNearLimit ? (
            <span className="text-yellow-600">⚠️ Approaching storage limit. {remainingMB}MB remaining.</span>
          ) : (
            <span className="text-green-600">✅ {remainingMB}MB remaining</span>
          )}
        </div>
      </div>
    );
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = async (selectedFile) => {
    // Check if at capacity first
    if (isAtCapacity()) {
      setError(`You have reached your storage limit. Please upgrade your plan or delete some existing documents.`);
      return;
    }
    
    // Check file type
    if (!acceptedFileTypes.includes(selectedFile.type)) {
      setError(`File type not supported. Please upload a PDF, Word document, Excel, CSV, or text file.`);
      return;
    }
    
    // Check file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(`File size exceeds 10MB limit. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB.`);
      return;
    }
    
    // CRITICAL: Check if this file would exceed storage limit
    if (storageInfo && storageInfo.storage) {
      const currentUsageBytes = storageInfo.storage.used_bytes;
      const limitBytes = storageInfo.storage.limit_bytes;
      const newTotalBytes = currentUsageBytes + selectedFile.size;
      
      if (newTotalBytes > limitBytes) {
        const currentUsageMB = (currentUsageBytes / (1024 * 1024)).toFixed(2);
        const limitMB = (limitBytes / (1024 * 1024)).toFixed(2);
        const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
        const remainingMB = ((limitBytes - currentUsageBytes) / (1024 * 1024)).toFixed(2);
        
        setError(
          `This file (${fileSizeMB}MB) would exceed your storage limit. ` +
          `You have ${currentUsageMB}MB used of ${limitMB}MB limit (${remainingMB}MB remaining). ` +
          `Please delete some files or upgrade your plan.`
        );
        setWouldExceedLimit(true);
        setFile(selectedFile); // Still set file to show it in UI
        return;
      }
    }
    
    // File is valid
    setError(null);
    setWouldExceedLimit(false);
    setFile(selectedFile);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Don't allow drops if at capacity
    if (isAtCapacity()) {
      setError(`You have reached your storage limit. Please upgrade your plan or delete some existing documents.`);
      return;
    }
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleCollectionChange = (e) => {
    setSelectedCollection(e.target.value);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!selectedCollection) {
      setError('Please select a collection');
      return;
    }

    // PREVENT upload if it would exceed limit
    if (wouldExceedLimit) {
      setError(`This file would exceed your storage limit. Please delete some files or upgrade your plan.`);
      return;
    }

    // Double-check storage limits before uploading
    if (storageInfo && storageInfo.storage) {
      const currentUsageBytes = storageInfo.storage.used_bytes;
      const limitBytes = storageInfo.storage.limit_bytes;
      const newTotalBytes = currentUsageBytes + file.size;
      
      if (newTotalBytes > limitBytes) {
        setError(`Upload would exceed storage limit. Please delete some files or upgrade your plan.`);
        return;
      }
    }

    try {
      setUploading(true);
      setError(null);
      
      // Set up a function to update progress
      let progressInterval;
      
      // Calculate upload time based on file size (simulated)
      const totalTime = Math.min(Math.max(file.size / 100000, 3000), 10000); // Between 3 and 10 seconds
      const steps = 20;
      const stepTime = totalTime / steps;
      
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // Increase progress gradually but leave room for final steps
          const newProgress = prev + (100 / steps);
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, stepTime);

      // Upload the file
      const result = await knowledgeService.uploadDocument(file, selectedCollection);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(result);
      
      // Refresh storage info
      await fetchStorageInfo();
      
      // Delay completion to show 100% progress
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error uploading document:', err);
      
      // Handle different error types properly
      if (err.response?.status === 402) {
        // Storage limit exceeded
        const errorData = err.response?.data?.detail || err.response?.data;
        
        if (typeof errorData === 'object') {
          // Backend returned object with detailed info
          if (errorData.error === 'storage_limit_exceeded') {
            setError(errorData.message || 'Storage limit exceeded. Please upgrade your plan.');
          } else {
            setError('Storage limit exceeded. Please upgrade your plan or delete some documents.');
          }
        } else if (typeof errorData === 'string') {
          setError(errorData);
        } else {
          setError('Storage limit exceeded. Please upgrade your plan.');
        }
      } else if (err.response?.status === 400) {
        // Bad request (file type, etc.)
        const errorMsg = err.response?.data?.detail || 'Invalid file. Please check file type and size.';
        setError(typeof errorMsg === 'string' ? errorMsg : 'Invalid file. Please check file type and size.');
      } else {
        // Other errors
        const errorMsg = err.response?.data?.detail || err.message || 'Failed to upload document. Please try again.';
        setError(typeof errorMsg === 'string' ? errorMsg : 'Failed to upload document. Please try again.');
      }
      
      showError('Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    switch (fileExtension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
        return '📃';
      case 'csv':
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'md':
        return '📋';
      default:
        return '📎';
    }
  };

  const getFileTypeName = () => {
    if (!file) return '';
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    switch (fileExtension) {
      case 'pdf':
        return 'PDF Document';
      case 'doc':
      case 'docx':
        return 'Word Document';
      case 'txt':
        return 'Text File';
      case 'csv':
        return 'CSV Spreadsheet';
      case 'xls':
      case 'xlsx':
        return 'Excel Spreadsheet';
      case 'md':
        return 'Markdown File';
      default:
        return 'Document';
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
        <p className="ml-3 text-gray-700">Loading storage information...</p>
      </div>
    );
  }

  // Storage limit reached
  if (isAtCapacity()) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Storage Limit Reached</h3>
        <p className="text-red-700 mb-4">
          You have used {storageInfo?.storage?.percentage.toFixed(1)}% of your storage limit
          ({formatBytes(storageInfo?.storage?.used_bytes)} of {formatBytes(storageInfo?.storage?.limit_bytes)}).
        </p>
        <p className="text-gray-700 mb-6">
          To upload more documents, you need to either delete some existing documents or upgrade your subscription plan.
        </p>
        <div className="flex justify-center space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go Back
          </button>
          <a
            href="/dashboard/subscription"
            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
          >
            Upgrade Plan
          </a>
        </div>
      </div>
    );
  }

  // Upload successful
  if (uploadResult) {
    return (
      <div className="text-center py-8">
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Successful!</h3>
        <p className="text-gray-600 mb-6">
          Your document "{uploadResult.filename}" has been uploaded and is being processed.
        </p>
        <button
          onClick={() => onUploadComplete(uploadResult)}
          className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Storage Status Display */}
      <StorageStatusDisplay />

      {/* Upload Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Upload Document</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Collection Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Collection
          </label>
          <select
            value={selectedCollection}
            onChange={handleCollectionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          >
            <option value="">Choose a collection...</option>
            {collections.map((collection) => (
              <option key={collection.collection_id} value={collection.collection_id}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-orange-500 bg-orange-50'
              : wouldExceedLimit
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.md"
            className="hidden"
          />

          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-4xl">{getFileIcon()}</span>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {getFileTypeName()} • {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              {wouldExceedLimit && (
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="text-sm">This file would exceed your storage limit</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                Choose different file
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Click to upload
                </button>
                <span className="text-gray-500"> or drag and drop</span>
              </div>
              <p className="text-xs text-gray-500">
                PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, MD up to 10MB
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm text-gray-500">{uploadProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !selectedCollection || uploading || wouldExceedLimit}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              !file || !selectedCollection || uploading || wouldExceedLimit
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorageLimitAwareUploader;