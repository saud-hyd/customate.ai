// Path: frontend/dashboard/src/components/conversations/VoiceConversationItem.jsx
// Usage: Displays individual voice conversation entries in the conversations list with playback controls

import React, { useState } from 'react';
import { 
  PhoneIcon, 
  PlayIcon, 
  PauseIcon, 
  ClockIcon,
  SignalIcon,
  UserIcon 
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import VoicePlaybackControls from './VoicePlaybackControls';

const VoiceConversationItem = ({ 
  conversation, 
  isUnread = false, 
  onClick, 
  isSelected = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayback, setShowPlayback] = useState(false);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'missed': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePlaybackToggle = (e) => {
    e.stopPropagation();
    setShowPlayback(!showPlayback);
  };

  const handleItemClick = () => {
    if (onClick) {
      onClick(conversation);
    }
  };

  return (
    <div className={`
      relative p-4 border-l-4 transition-all duration-200 cursor-pointer
      ${isSelected ? 'bg-green-50 border-l-green-500' : 'bg-white border-l-transparent'}
      ${isUnread ? 'bg-green-25 border-l-green-300' : ''}
      hover:bg-green-25 hover:shadow-sm
    `}>
      <div onClick={handleItemClick}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
              <PhoneIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                {conversation.caller_number || 'Unknown Caller'}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <ClockIcon className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(conversation.started_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
            {conversation.status}
          </span>
        </div>

        {/* Call Details */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <ClockIcon className="w-4 h-4" />
              <span>{formatDuration(conversation.duration_seconds || 0)}</span>
            </div>
            
            {conversation.call_quality && (
              <div className="flex items-center space-x-1">
                <SignalIcon className={`w-4 h-4 ${getQualityColor(conversation.call_quality)}`} />
                <span className={getQualityColor(conversation.call_quality)}>
                  {conversation.call_quality}
                </span>
              </div>
            )}
          </div>

          {/* Playback Button */}
          {conversation.audio_url && (
            <button
              onClick={handlePlaybackToggle}
              className="flex items-center space-x-1 px-2 py-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
            >
              {isPlaying ? (
                <PauseIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              <span className="text-xs">Listen</span>
            </button>
          )}
        </div>

        {/* Transcript Preview */}
        {conversation.transcript_preview && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-md p-2 mb-2">
            <p className="line-clamp-2">"{conversation.transcript_preview}"</p>
          </div>
        )}

        {/* Unread Indicator */}
        {isUnread && (
          <div className="absolute top-4 right-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        )}
      </div>

      {/* Expandable Playback Controls */}
      {showPlayback && conversation.audio_url && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <VoicePlaybackControls
            audioUrl={conversation.audio_url}
            duration={conversation.duration_seconds}
            onPlayStateChange={setIsPlaying}
          />
        </div>
      )}
    </div>
  );
};

export default VoiceConversationItem;