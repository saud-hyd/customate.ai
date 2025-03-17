// frontend/dashboard/src/components/knowledge/DocumentPreview.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import knowledgeService from '../../services/knowledgeService';
import { 
  DocumentTextIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  ClockIcon,
  TagIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const DocumentPreview = ({ documentId, onClose }) => {
  const [document, setDocument] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    fetchDocumentData();
  }, [documentId]);

  const fetchDocumentData = async () => {
    try {
      setLoading(true);
      
      // Fetch document details
      const docData = await knowledgeService.getDocument(documentId);
      setDocument(docData);
      
      // Fetch document sections (knowledge items)
      const sectionsData = await knowledgeService.getDocumentSections(documentId);
      setSections(sectionsData);
    } catch (err) {
      console.error('Error fetching document details:', err);
      setError('Failed to load document details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = () => {
    if (!document) return null;
    
    const fileExtension = document.filename.split('.').pop().toLowerCase();
    
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading document details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="flex">
          <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
          <div>
            <p className="text-base font-medium text-red-800">Error loading document</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <div className="flex">
          <ExclamationCircleIcon className="h-6 w-6 text-yellow-500 mr-2" />
          <div>
            <p className="text-base font-medium text-yellow-800">Document not found</p>
            <p className="text-sm text-yellow-700 mt-1">The requested document could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-4xl mr-4">{getFileIcon()}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{document.filename}</h2>
            <div className="mt-2 flex flex-wrap gap-4">
              <div className="flex items-center text-sm text-gray-500">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>Uploaded: {formatDate(document.created_at)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <TagIcon className="h-4 w-4 mr-1" />
                <span>Size: {Math.round(document.file_size / 1024)} KB</span>
              </div>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                  {document.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Sections */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Document Sections ({sections.length})
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The document has been processed into the following sections in your knowledge base.
          </p>
        </div>
        
        {document.status === 'processing' ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Document is still being processed. Sections will appear here once processing is complete.</p>
          </div>
        ) : document.status === 'failed' ? (
          <div className="p-6 text-center">
            <ExclamationCircleIcon className="h-8 w-8 text-red-500 mx-auto" />
            <p className="mt-2 text-red-600">Document processing failed. Please try uploading the document again.</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="p-6 text-center">
            <DocumentDuplicateIcon className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="mt-2 text-gray-600">No sections found for this document.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sections.map((section) => {
              const isExpanded = expandedSections[section.item_id] || false;
              
              return (
                <div key={section.item_id} className="hover:bg-gray-50">
                  <div 
                    className="px-6 py-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection(section.item_id)}
                  >
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <h4 className="text-base font-medium text-gray-900">{section.title}</h4>
                        <p className="mt-1 text-sm text-gray-500">
                          {isExpanded ? 'Click to collapse' : 'Click to view content'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Link 
                        to={`/dashboard/knowledge/${section.item_id}`}
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Edit this section"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                      </Link>
                      {isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-6 pb-4">
                      <div className="bg-gray-50 p-4 rounded border border-gray-200">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {section.content}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;