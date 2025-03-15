import React, { useState } from 'react';
import { XMarkIcon, DocumentArrowDownIcon, TrashIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import chatService from '../../services/chatService';

const ConversationDetailModal = ({ isOpen, onClose, session, onDeleteSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  if (!isOpen || !session) return null;

  const handleExportConversation = () => {
    // Create a text representation of the conversation
    const lines = [];
    
    // Format session ID according to what we have
    const sessionId = session.id || session.session_id || 'unknown';
    
    lines.push(`Session ID: ${sessionId}`);
    lines.push(`User: ${session.user || session.user_id || 'Anonymous'}`);
    lines.push(`Date: ${new Date(session.created_at).toLocaleString()}`);
    lines.push(`Status: ${session.status || 'Unknown'}`);
    lines.push('');
    lines.push('===== Conversation =====');
    
    // Add all messages
    session.messages.forEach(msg => {
      const timestamp = new Date(msg.created_at).toLocaleTimeString();
      const role = msg.role || (msg.message_type === 'user_message' ? 'user' : 'assistant');
      const content = msg.content || msg.message || '';
      lines.push(`[${timestamp}] ${role === 'user' ? 'User' : 'Assistant'}: ${content}`);
    });
    
    // Create and download the file
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      // Call the delete API using the correct session ID format
      const sessionId = session.id || session.session_id;
      await chatService.deleteConversation(sessionId);
      
      // Notify parent component of successful deletion
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setDeleteError('Failed to delete conversation. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format the session data
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Render stars for user satisfaction rating
  const renderStars = (rating = 0) => {
    const maxRating = 5;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} className="h-5 w-5 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <StarIcon className="h-5 w-5 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <StarIcon className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
        )}
        {[...Array(maxRating - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
        ))}
        <span className="ml-1 text-sm text-gray-600">
          ({rating.toFixed(1)}/{maxRating})
        </span>
      </div>
    );
  };

  // Normalize messages to handle different API response formats
  const normalizeMessages = () => {
    if (!session.messages || !Array.isArray(session.messages)) {
      return [];
    }
    
    return session.messages.map(msg => {
      // Create a normalized message object
      return {
        id: msg.id || msg.message_id || `msg-${Math.random().toString(36).substr(2, 9)}`,
        role: msg.role || (msg.message_type === 'user_message' ? 'user' : 'assistant'),
        content: msg.content || msg.message || '',
        created_at: msg.created_at || new Date().toISOString()
      };
    });
  };

  const messages = normalizeMessages();
  
  // Get the correct session identifier
  const sessionId = session.id || session.session_id || 'unknown';
  const userName = session.user || session.user_id || 'Anonymous User';
  const ipAddress = session.ip_address || '';
  const status = session.status || 'unknown';
  const createdAt = session.created_at || new Date().toISOString();
  const durationSeconds = session.duration_seconds || 0;
  const userSatisfaction = session.user_satisfaction || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 py-5 border-b border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Conversation Details
              </h3>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          {/* Conversation metadata */}
          <div className="bg-gray-50 px-4 py-5 sm:p-6 sm:grid sm:grid-cols-2 sm:gap-4">
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Session ID</h4>
                <p className="mt-1 text-sm text-gray-900">#{sessionId}</p>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Date & Time</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <p className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${status === 'completed' ? 'bg-green-100 text-green-800' : 
                      status === 'abandoned' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </p>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">User</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {userName} 
                  {ipAddress && ` (${ipAddress})`}
                </p>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500">Duration</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDuration(durationSeconds)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">User Satisfaction</h4>
                <div className="mt-1">
                  {renderStars(userSatisfaction)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Conversation messages */}
          <div className="bg-white px-4 py-3 sm:px-6 max-h-96 overflow-y-auto">
            {messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-lg rounded-lg px-4 py-2 ${
                      message.role === 'user' 
                        ? 'bg-primary-100 text-primary-800 rounded-br-none' 
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No messages available for this conversation.</p>
            )}
          </div>
          
          {/* Footer with actions */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleExportConversation}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export Conversation
            </button>
            <button
              type="button"
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete Record'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
          
          {deleteError && (
            <div className="bg-red-50 px-4 py-3 border-t border-red-200">
              <p className="text-sm text-red-700">{deleteError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationDetailModal;