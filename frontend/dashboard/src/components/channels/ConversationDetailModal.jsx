// frontend/dashboard/src/components/channels/ConversationDetailModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { HiOutlineX, HiOutlineUser, HiOutlinePaperAirplane, HiOutlineExclamation } from 'react-icons/hi';
import channelService from '../../services/channelService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

const ConversationDetailModal = ({ isOpen, onClose, conversation, channelId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen && conversation) {
      fetchMessages();
    }
  }, [isOpen, conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await channelService.getMessages(
        channelId, 
        conversation.conversation_id
      );
      // Sort and reverse messages to show oldest first
      const sortedMessages = [...(response.data || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setMessages(sortedMessages);
      setError(null);
    } catch (err) {
      setError('Failed to load messages. Please try again.');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      const messageData = {
        conversation_id: conversation.conversation_id,
        message_type: 'text',
        content: newMessage
      };
      
      await channelService.sendMessage(channelId, messageData);
      setNewMessage('');
      
      // Refresh messages to include the new one
      fetchMessages();
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatHeaderDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, just show "Today"
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show the date
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      formattedDate: formatHeaderDate(date),
      messages
    }));
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 overflow-hidden z-10" onClose={onClose}>
        <div className="absolute inset-0 overflow-hidden">
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>
          
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-300"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <div className="relative w-screen max-w-md">
                <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                  <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="px-4 py-6 bg-indigo-700 sm:px-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          {conversation.user_profile_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover border-2 border-white"
                              src={conversation.user_profile_url}
                              alt={conversation.user_name || "User"}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-white">
                              <HiOutlineUser className="h-6 w-6 text-white" />
                            </div>
                          )}
                          <div className="ml-3">
                            <Dialog.Title className="text-lg font-medium text-white">
                              {conversation.user_name || conversation.platform_user_id || "Unknown User"}
                            </Dialog.Title>
                            <p className="text-sm text-indigo-200">
                              {conversation.platform_user_id}
                            </p>
                          </div>
                        </div>
                        <div className="ml-3 h-7 flex items-center">
                          <button
                            type="button"
                            className="bg-indigo-700 rounded-md text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            onClick={onClose}
                          >
                            <span className="sr-only">Close panel</span>
                            <HiOutlineX className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Message content */}
                    <div ref={scrollContainerRef} className="p-4 flex-1 overflow-y-auto bg-gray-100 min-h-[400px]">
                      {loading ? (
                        <div className="flex justify-center items-center h-64">
                          <LoadingSpinner />
                        </div>
                      ) : error ? (
                        <ErrorAlert message={error} />
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <div className="rounded-full bg-indigo-100 p-3">
                            <HiOutlineExclamation className="h-6 w-6 text-indigo-600" />
                          </div>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            This conversation doesn't have any messages yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {groupMessagesByDate().map((group) => (
                            <div key={group.date} className="space-y-4">
                              <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                  <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center">
                                  <span className="px-2 bg-gray-100 text-sm text-gray-500">
                                    {group.formattedDate}
                                  </span>
                                </div>
                              </div>
                              
                              {group.messages.map((message) => (
                                <div
                                  key={message.message_id}
                                  className={`flex ${
                                    message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                                  }`}
                                >
                                  {message.direction === 'inbound' && (
                                    <div className="mr-2 flex-shrink-0 self-end mb-1">
                                      {conversation.user_profile_url ? (
                                        <img
                                          className="h-8 w-8 rounded-full object-cover"
                                          src={conversation.user_profile_url}
                                          alt={conversation.user_name || "User"}
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                          <HiOutlineUser className="h-5 w-5 text-indigo-600" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div
                                    className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${
                                      message.direction === 'outbound'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-900'
                                    }`}
                                  >
                                    {message.content}
                                    <div 
                                      className={`text-xs mt-1 ${
                                        message.direction === 'outbound' ? 'text-indigo-300' : 'text-gray-500'
                                      }`}
                                    >
                                      {formatMessageDate(message.created_at)}
                                    </div>
                                  </div>
                                  
                                  {message.direction === 'outbound' && (
                                    <div className="ml-2 flex-shrink-0 self-end mb-1">
                                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <svg className="h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Message input */}
                  <div className="p-4 border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="relative">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          disabled={sending}
                          className="block w-full py-2 pl-4 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={sending || !newMessage.trim()}
                          className={`absolute right-2 p-1 rounded-full text-white ${
                            sending || !newMessage.trim()
                              ? 'bg-gray-400'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          <HiOutlinePaperAirplane className="h-5 w-5 transform rotate-90" />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ConversationDetailModal;