// frontend/dashboard/src/components/knowledge/EnhancedDocumentUploader.jsx
import React, { useState, useRef } from 'react';
import knowledgeService from '../../services/knowledgeService';
import { XMarkIcon, DocumentArrowUpIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const EnhancedDocumentUploader = ({ collections, onUploadComplete, onCancel }) => {
  const [file, setFile] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
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
    
    setFile(selectedFile);
    setError(null);
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
      
      // Delay completion to show 100% progress
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.response?.data?.detail || 'Failed to upload document. Please try again.');
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {uploadResult ? (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
          <div className="flex">
            <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
            <div>
              <p className="text-base font-medium text-green-800">Document uploaded successfully!</p>
              <p className="text-sm text-green-700 mt-2">
                "{uploadResult.filename}" has been uploaded and is being processed. It will be available in your knowledge base shortly.
              </p>
              <div className="mt-4">
                <button onClick={onCancel} className="btn btn-outline bg-white">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* File Drop Zone */}
          <div
            className={`border-2 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-dashed border-gray-300'} 
                       ${file ? 'border-indigo-500 border-solid' : ''} 
                       ${!uploading ? 'hover:border-indigo-500 hover:bg-gray-50' : ''} 
                       rounded-lg p-8 text-center transition-colors duration-150 ease-in-out`}
            onDrop={!uploading ? handleDrop : undefined}
            onDragOver={!uploading ? handleDragOver : undefined}
            onDragEnter={!uploading ? handleDragEnter : undefined}
            onDragLeave={!uploading ? handleDragLeave : undefined}
            onClick={!uploading && !file ? () => fileInputRef.current.click() : undefined}
          >
            <input
              ref={fileInputRef}
              id="fileInput"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.txt,.csv,.xls,.xlsx,.md"
              disabled={uploading}
            />
            
            {file ? (
              <div className="flex flex-col items-center justify-center">
                <div className="text-4xl mb-3">{getFileIcon()}</div>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-900 break-all max-w-full">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {getFileTypeName()} • {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    className="mt-4 flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Remove file
                  </button>
                )}
              </div>
            ) : (
              <div>
                <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-4 text-sm font-medium text-gray-900">
                  {isDragging ? 'Drop your file here' : 'Drag and drop your file here or click to browse'}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOCX, DOC, TXT, CSV, XLS, XLSX, MD (Max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Collection Selector */}
          <div>
            <label htmlFor="collection" className="block text-sm font-medium text-gray-700 mb-1">
              Select Collection
            </label>
            <select
              id="collection"
              className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedCollection}
              onChange={handleCollectionChange}
              disabled={uploading}
            >
              <option value="">Select a collection</option>
              {collections.map((collection) => (
                <option key={collection.collection_id} value={collection.collection_id}>
                  {collection.name}
                </option>
              ))}
            </select>
            {!collections.length && (
              <p className="mt-1 text-xs text-yellow-600">
                No collections available. Create a collection first.
              </p>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-700">
                <span className="font-medium">
                  {uploadProgress < 100 ? 'Uploading document...' : 'Processing document...'}
                </span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    uploadProgress < 100 ? 'bg-indigo-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 italic">
                {uploadProgress < 100 
                  ? 'Uploading your document to the server...' 
                  : 'Processing your document for the knowledge base...'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || !selectedCollection || uploading}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${(!file || !selectedCollection || uploading) 
                  ? 'bg-indigo-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedDocumentUploader;