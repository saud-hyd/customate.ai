// Path: frontend/dashboard/src/components/testing/VoicePlayback.jsx
// Usage: Simple voice playback component for test responses with basic controls

import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

const VoicePlayback = ({ 
  audioUrl, 
  autoPlay = false,
  className = "",
  showDuration = true 
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize audio element
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      const audio = audioRef.current;
      
      const handleLoadStart = () => setIsLoading(true);
      const handleCanPlay = () => setIsLoading(false);
      const handleError = () => {
        setError('Failed to load audio');
        setIsLoading(false);
      };
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };
      
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Auto-play if requested
      if (autoPlay) {
        audio.play().catch(() => {
          console.log('Autoplay blocked');
        });
      }

      return () => {
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [audioUrl, autoPlay]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
      setError('Playback failed');
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  if (error) {
    return (
      <div className={`flex items-center space-x-2 p-3 text-red-600 bg-red-50 rounded-lg ${className}`}>
        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className={`flex items-center justify-center p-4 text-gray-400 bg-gray-50 rounded-lg ${className}`}>
        <SpeakerWaveIcon className="w-6 h-6 mr-2" />
        <span className="text-sm">No audio available</span>
      </div>
    );
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center space-x-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className={`
            flex-shrink-0 p-2 rounded-full transition-colors
            ${isLoading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-green-100 text-green-600 hover:bg-green-200'
            }
          `}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : isPlaying ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5" />
          )}
        </button>

        {/* Progress Section */}
        <div className="flex-1 space-y-2">
          {/* Progress Bar */}
          <div 
            className="w-full h-2 bg-gray-200 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Time Display */}
          {showDuration && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          )}
        </div>

        {/* Audio Icon */}
        <div className="flex-shrink-0">
          <SpeakerWaveIcon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default VoicePlayback;