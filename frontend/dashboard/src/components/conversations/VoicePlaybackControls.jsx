// Path: frontend/dashboard/src/components/conversations/VoicePlaybackControls.jsx
// Usage: Audio playback controls for voice conversations with seek, volume, and speed controls

import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ForwardIcon,
  BackwardIcon
} from '@heroicons/react/24/outline';

const VoicePlaybackControls = ({ 
  audioUrl, 
  duration = 0, 
  onPlayStateChange,
  autoPlay = false 
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

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
      
      audio.addEventListener('loadstart', () => setIsLoading(true));
      audio.addEventListener('canplay', () => setIsLoading(false));
      audio.addEventListener('error', () => {
        setError('Failed to load audio');
        setIsLoading(false);
      });
      
      // Auto-play if requested
      if (autoPlay) {
        audio.play().catch(() => {
          // Autoplay might be blocked by browser
          console.log('Autoplay blocked');
        });
      }
    }
  }, [audioUrl, autoPlay]);

  // Update play state
  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying);
    }
  }, [isPlaying, onPlayStateChange]);

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
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * (duration || audioRef.current.duration);
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const changePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const skipSeconds = (seconds) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 text-red-600 bg-red-50 rounded-lg">
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Main Controls */}
      <div className="flex items-center space-x-4">
        {/* Skip Back */}
        <button
          onClick={() => skipSeconds(-10)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <BackwardIcon className="w-5 h-5" />
        </button>

        {/* Play/Pause */}
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

        {/* Skip Forward */}
        <button
          onClick={() => skipSeconds(10)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <ForwardIcon className="w-5 h-5" />
        </button>

        {/* Time Display */}
        <div className="flex-1 flex items-center space-x-2 text-sm text-gray-600">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration || 0)}</span>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <button onClick={toggleMute} className="text-gray-400 hover:text-gray-600 transition-colors">
            {isMuted || volume === 0 ? (
              <SpeakerXMarkIcon className="w-5 h-5" />
            ) : (
              <SpeakerWaveIcon className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div 
          className="w-full h-2 bg-gray-200 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-green-500 rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Playback Speed Controls */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <span>Speed:</span>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
              <button
                key={rate}
                onClick={() => changePlaybackRate(rate)}
                className={`
                  px-2 py-1 rounded transition-colors
                  ${playbackRate === rate 
                    ? 'bg-green-100 text-green-700' 
                    : 'hover:bg-gray-100'
                  }
                `}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoicePlaybackControls;