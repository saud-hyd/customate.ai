import React, { useState } from 'react';
import knowledgeService from '../../services/knowledgeService';

const DocumentUploader = ({ collections, onUploadComplete, onCancel }) => {
  const [file, setFile] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 300);

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
      }, 500);
      
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.response?.data?.detail || 'Failed to upload document. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {uploadResult ? (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Document uploaded successfully</p>
              <p className="text-sm text-green-700 mt-1">
                Document "{uploadResult.filename}" has been uploaded and is being processed.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center
              ${file ? 'border-orange-500' : 'border-gray-300'}
              ${!uploading ? 'hover:border-orange-500 hover:bg-gray-50 cursor-pointer' : ''}`}
            onDrop={!uploading ? handleDrop : undefined}
            onDragOver={!uploading ? handleDragOver : undefined}
            onClick={!uploading && !file ? () => document.getElementById('fileInput').click() : undefined}
          >
            <input
              id="fileInput"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.txt"
              disabled={uploading}
            />
            
            {file ? (
              <div className="flex items-center justify-center">
                <i className="fas fa-file-upload text-orange-500 text-2xl mr-3"></i>
                <div className="ml-4 text-left">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    className="ml-4 text-gray-400 hover:text-gray-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            ) : (
              <div>
                <i className="fas fa-file-upload text-gray-400 text-3xl mb-2"></i>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Drag and drop your file here or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Supported formats: PDF, DOCX, DOC, TXT
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
              className="input w-full"
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
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-700">
                <span>Uploading document...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-orange-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={uploading}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || !selectedCollection || uploading}
              className="btn btn-primary"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentUploader;