// Path: frontend/dashboard/src/components/testing/VoiceRecorder.jsx
// Usage: Browser-based voice recorder with real-time visualization and transcript generation

import React, { useState, useRef, useEffect } from 'react';
import { 
  MicrophoneIcon, 
  StopIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const VoiceRecorder = ({ 
  onRecordingComplete, 
  isDisabled = false,
  maxDuration = 300, // 5 minutes
  autoTranscribe = true 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissions, setPermissions] = useState('prompt'); // 'granted', 'denied', 'prompt'

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioPlaybackRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const animationRef = useRef(null);

  // Check microphone permissions on mount
  useEffect(() => {
    checkMicrophonePermissions();
    return () => {
      cleanup();
    };
  }, []);

  const checkMicrophonePermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      setPermissions(result.state);
      
      result.addEventListener('change', () => {
        setPermissions(result.state);
      });
    } catch (err) {
      console.warn('Permissions API not supported');
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const setupAudioVisualization = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255); // Normalize to 0-1
          animationRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (err) {
      console.warn('Audio visualization setup failed:', err);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        if (autoTranscribe) {
          transcribeAudio(blob);
        }
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
      
      setupAudioVisualization(stream);
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setPermissions('denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const transcribeAudio = async (blob) => {
    if (!blob) return;
    
    try {
      setIsTranscribing(true);
      
      // For demo purposes, we'll use a mock transcription
      // In real implementation, you'd send this to your backend
      const formData = new FormData();
      formData.append('audio', blob);
      
      // Mock transcription delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock transcript - replace with actual API call
      const mockTranscript = "This is a sample transcription of the recorded audio.";
      setTranscript(mockTranscript);
      
    } catch (err) {
      console.error('Transcription failed:', err);
      setTranscript('Transcription failed. You can still submit the audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const playAudio = () => {
    if (audioPlaybackRef.current && audioUrl) {
      audioPlaybackRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript('');
    setRecordingTime(0);
    setIsPlaying(false);
    setError(null);
  };

  const submitRecording = () => {
    if (audioBlob && onRecordingComplete) {
      onRecordingComplete(audioBlob, transcript);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVisualizationBars = () => {
    const bars = [];
    const numBars = 20;
    
    for (let i = 0; i < numBars; i++) {
      const height = isRecording ? 
        Math.random() * audioLevel * 40 + 10 : 
        10;
      
      bars.push(
        <div
          key={i}
          className={`w-1 bg-green-500 rounded-full transition-all duration-150 ${
            isRecording ? 'opacity-100' : 'opacity-30'
          }`}
          style={{ height: `${height}px` }}
        />
      );
    }
    
    return bars;
  };

  if (permissions === 'denied') {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Microphone Access Required</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please enable microphone access in your browser settings to use voice recording.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="text-center">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            disabled={isDisabled}
            className={`
              inline-flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200
              ${isDisabled 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-green-100 text-green-600 hover:bg-green-200 hover:scale-105'
              }
            `}
          >
            <MicrophoneIcon className="w-8 h-8" />
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 hover:bg-red-200 rounded-full transition-all duration-200 hover:scale-105"
          >
            <StopIcon className="w-8 h-8" />
          </button>
        )}

        {audioBlob && !isRecording && (
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-full transition-all duration-200"
            >
              {isPlaying ? (
                <PauseIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6" />
              )}
            </button>
            
            <button
              onClick={deleteRecording}
              className="inline-flex items-center justify-center w-12 h-12 bg-red-100 text-red-600 hover:bg-red-200 rounded-full transition-all duration-200"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Recording Status */}
      <div className="text-center">
        {isRecording && (
          <div className="space-y-2">
            <div className="text-2xl font-mono text-green-600">
              {formatTime(recordingTime)}
            </div>
            <div className="text-sm text-gray-500">
              Recording... (max {formatTime(maxDuration)})
            </div>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="text-sm text-gray-600">
            Recorded {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {/* Audio Visualization */}
      <div className="flex items-end justify-center space-x-1 h-16">
        {getVisualizationBars()}
      </div>

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioPlaybackRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Transcript */}
      {(transcript || isTranscribing) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Transcript</h4>
          {isTranscribing ? (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
              <span>Transcribing audio...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-600">{transcript}</p>
          )}
        </div>
      )}

      {/* Submit Button */}
      {audioBlob && !isRecording && (
        <div className="text-center">
          <button
            onClick={submitRecording}
            disabled={isDisabled || isTranscribing}
            className={`
              inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md
              ${isDisabled || isTranscribing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              }
            `}
          >
            {isTranscribing ? 'Processing...' : 'Test Voice Response'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;