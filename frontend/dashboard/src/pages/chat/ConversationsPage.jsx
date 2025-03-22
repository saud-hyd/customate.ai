// frontend/dashboard/src/pages/chat/ConversationsPage.jsx
import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, EyeIcon, ArrowDownTrayIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import chatService from '../../services/chatService';
import ConversationDetailModal from '../../components/chat/ConversationDetailModal';
import { useToast } from '../../context/ToastContext';

const ConversationsPage = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { success, error: showError } = useToast();
  
  // Fetch conversations on mount and when refresh is triggered
  useEffect(() => {
    fetchConversations();
  }, [refreshTrigger, itemsPerPage]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data);
      
      // Calculate total pages
      setTotalPages(Math.ceil(data.length / itemsPerPage));
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversation history. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to first page when searching
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedConversations([]);
    setSelectAll(false);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewDetail = async (sessionId) => {
    try {
      setLoading(true);
      // Fetch conversation messages from the API
      const messages = await chatService.getMessages(sessionId);
      
      // Find the session data
      const session = conversations.find(c => c.id === sessionId || c.session_id === sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Set selected session with messages
      setSelectedSession({
        ...session,
        id: session.id || session.session_id, // Handle both formats
        messages
      });
      
      // Open detail modal
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error('Error fetching conversation details:', err);
      setError('Failed to load conversation details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuccess = () => {
    // Refresh the conversation list after deletion
    handleRefresh();
    // Close the modal
    setIsDetailModalOpen(false);
  };

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSelectConversation = (sessionId) => {
    setSelectedConversations(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedConversations([]);
    } else {
      const currentPageIds = currentConversations.map(conv => 
        conv.id || conv.session_id
      );
      setSelectedConversations(currentPageIds);
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedConversations.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedConversations.length} selected conversation(s)?`)) {
      return;
    }
    
    try {
      setLoading(true);
      let successCount = 0;
      
      // Delete each selected conversation
      for (const sessionId of selectedConversations) {
        try {
          await chatService.deleteConversation(sessionId);
          successCount++;
        } catch (err) {
          console.error(`Error deleting conversation ${sessionId}:`, err);
        }
      }
      
      if (successCount > 0) {
        success(`Successfully deleted ${successCount} conversation(s)`);
        handleRefresh();
      } else {
        showError('Failed to delete conversations');
      }
    } catch (err) {
      console.error('Error in bulk delete:', err);
      showError('Failed to delete conversations');
    } finally {
      setLoading(false);
      setSelectedConversations([]);
      setSelectAll(false);
    }
  };

  // Filter conversations based on search query
  const filteredConversations = searchQuery 
    ? conversations.filter(c => {
        const sessionId = c.id || c.session_id || '';
        const userId = c.user || c.user_id || '';
        const ipAddress = c.ip_address || '';
        
        return sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
               userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
               ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  // Get current page data (pagination)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentConversations = filteredConversations.slice(indexOfFirstItem, indexOfLastItem);

  const formatDuration = (seconds) => {
    if (!seconds) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Helper to get a consistent session ID from different API formats
  const getSessionId = (conversation) => {
    return conversation.id || conversation.session_id;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conversation History</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and analyze past conversations with your chatbot.
            </p>
          </div>
          
          {/* Search form */}
          <div className="w-full max-w-xs">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={handleRefresh}
              className="btn btn-outline flex items-center"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-1 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button 
              onClick={() => window.location.href = '/dashboard/chat'}
              className="btn btn-primary"
            >
              New Conversation
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

      {/* Bulk actions */}
      {selectedConversations.length > 0 && (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 text-indigo-500 mr-2" />
              <p className="text-sm text-indigo-700">
                {selectedConversations.length} conversation(s) selected
              </p>
            </div>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
              disabled={loading}
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Conversations table */}
      <div className="bg-white shadow-sm overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      onChange={handleSelectAll}
                      checked={selectAll}
                      disabled={loading}
                    />
                  </div>
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && conversations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="spinner mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading conversations...</p>
                  </td>
                </tr>
              ) : currentConversations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No conversations found.
                  </td>
                </tr>
              ) : (
                currentConversations.map((conversation) => {
                  const sessionId = getSessionId(conversation);
                  const createdAt = conversation.created_at || new Date().toISOString();
                  const messageCount = conversation.message_count || conversation.messages?.length || 0;
                  const durationSeconds = conversation.duration_seconds || 0;
                  const status = conversation.status || 'completed';
                  const isSelected = selectedConversations.includes(sessionId);
                  
                  return (
                    <tr key={sessionId} className={`hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            checked={isSelected}
                            onChange={() => handleSelectConversation(sessionId)}
                            disabled={loading}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{typeof sessionId === 'string' ? sessionId.substring(0, 6).toUpperCase() : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {conversation.user || conversation.user_id ? (
                          <div>
                            <div className="font-medium">{conversation.user || conversation.user_id}</div>
                            {conversation.ip_address && (
                              <div className="text-xs text-gray-400">IP: {conversation.ip_address}</div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">Anonymous User</div>
                            {conversation.ip_address && (
                              <div className="text-xs text-gray-400">IP: {conversation.ip_address}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {messageCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDuration(durationSeconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${status === 'completed' ? 'bg-green-100 text-green-800' : 
                            status === 'abandoned' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetail(sessionId)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          title="View conversation details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="Export conversation"
                          onClick={() => handleViewDetail(sessionId)} // First view, then export
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-sm text-gray-500 mr-2">Show</span>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="rounded border-gray-300 text-sm"
                disabled={loading}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={75}>75</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-500 ml-2">items per page</span>
            </div>
            
            <div className="flex items-center justify-between md:justify-end w-full md:w-auto">
              <div className="text-sm text-gray-500 mr-4">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredConversations.length)} of {filteredConversations.length} conversations
              </div>
              {totalPages > 1 && (
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${
                        currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <span>←</span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${
                        currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <span>→</span>
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Detail Modal */}
      {selectedSession && (
        <ConversationDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          session={selectedSession}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default ConversationsPage;