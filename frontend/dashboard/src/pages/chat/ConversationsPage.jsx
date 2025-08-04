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
  // Fetch conversations on mount and when refresh/pagination changes
  useEffect(() => {
    fetchConversations(1); // Always start from page 1 when itemsPerPage changes
    setCurrentPage(1);
  }, [refreshTrigger, itemsPerPage]);

  // Fetch conversations when page changes
  useEffect(() => {
    fetchConversations(currentPage);
  }, [currentPage]);

  const fetchConversations = async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use new paginated API
      const result = await chatService.getConversations(page, itemsPerPage);
      
      // Handle new response format with pagination
      if (result.data && result.pagination) {
        setConversations(result.data);
        setTotalPages(result.pagination.total_pages);
        setCurrentPage(result.pagination.current_page);
      } else {
        // Fallback for old format
        setConversations(result);
        setTotalPages(Math.ceil(result.length / itemsPerPage));
      }
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
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // fetchConversations will be called by useEffect
    }
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
    // useEffect will handle the reset to page 1 and refetch
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

  // Search is now handled by backend pagination, so we use conversations directly
  const currentConversations = conversations;
  const filteredConversations = conversations; // For backward compatibility

  // Calculate display indices for pagination info
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
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
        </div>
      </div>
          

      {/* Bulk actions */}
      {selectedConversations.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 text-orange-500 mr-2" />
              <p className="text-sm text-orange-700">
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
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      onChange={handleSelectAll}
                      checked={selectAll}
                      disabled={loading}
                    />
                  </div>
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
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
                    <tr key={sessionId} className={`hover:bg-gray-50 ${isSelected ? 'bg-orange-50' : ''}`}>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
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
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, conversations.length)} of {totalPages * itemsPerPage} conversations
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