import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import chatService from '../../services/chatService';
import ConversationDetailModal from '../../components/chat/ConversationDetailModal';

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
  
  // Items per page
  const ITEMS_PER_PAGE = 10;
  
  // Fetch conversations on mount and when refresh is triggered
  useEffect(() => {
    fetchConversations();
  }, [refreshTrigger]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data);
      
      // Calculate total pages
      setTotalPages(Math.ceil(data.length / ITEMS_PER_PAGE));
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
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
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

      {/* Conversations table */}
      <div className="bg-white shadow-sm overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
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
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="spinner mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading conversations...</p>
                  </td>
                </tr>
              ) : currentConversations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
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
                  
                  return (
                    <tr key={sessionId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
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