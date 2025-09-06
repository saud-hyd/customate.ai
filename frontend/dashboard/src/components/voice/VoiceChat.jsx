// frontend/src/components/VoiceChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

const VoiceChat = ({ apiKey, isActive, onClose }) => {
  const [room, setRoom] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const audioElementsRef = useRef(new Set());

  // Helper function to cleanup audio elements
  const cleanupAudioElements = () => {
    console.log(`Cleaning up ${audioElementsRef.current.size} audio elements`);
    audioElementsRef.current.forEach(el => {
      try {
        if (el.parentNode) {
          el.pause();
          el.currentTime = 0;
          el.parentNode.removeChild(el);
        }
      } catch (e) {
        console.warn('Error cleaning up audio element:', e);
      }
    });
    audioElementsRef.current.clear();
  };

  const startVoiceSession = async () => {
    setIsConnecting(true);
    
    try {
      // Get voice session token from backend
      const response = await fetch('/api/voice/session/create', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      // Connect to LiveKit room
      const newRoom = new Room();
      await newRoom.connect(data.url, data.token);
      
      // CRITICAL: Handle incoming audio tracks from agent
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio && !participant.isLocal) {
          console.log('Received audio track from agent:', participant.identity);
          
          // Clean up any existing audio elements first
          cleanupAudioElements();
          
          // Create new audio element
          const audioElement = track.attach();
          audioElement.autoplay = true;
          audioElement.style.display = 'none';
          audioElement.volume = 1.0; // Ensure full volume
          
          // Add better audio element properties for quality
          audioElement.crossOrigin = 'anonymous';
          audioElement.preload = 'auto';
          
          document.body.appendChild(audioElement);
          audioElementsRef.current.add(audioElement);
          
          console.log(`Added audio element, total: ${audioElementsRef.current.size}`);
          
          // Handle audio element events
          audioElement.addEventListener('ended', () => {
            console.log('Audio playback ended');
          });
          
          audioElement.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
          });
          
          // Start playback
          audioElement.play().catch(e => console.log('Audio play failed:', e));
        }
      });
      
      // Handle track unsubscription for cleanup
      newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio && !participant.isLocal) {
          console.log('Audio track unsubscribed from agent:', participant.identity);
          // Audio elements will be cleaned up when new tracks arrive or session ends
        }
      });
      
      setRoom(newRoom);
      setIsConnected(true);
      setIsConnecting(false);
      
      // Enable microphone
      await newRoom.localParticipant.setMicrophoneEnabled(true);
      
    } catch (error) {
      console.error('Failed to start voice session:', error);
      setIsConnecting(false);
    }
  };

  const stopVoiceSession = async () => {
    console.log('Stopping voice session...');
    
    if (room) {
      await room.disconnect();
      setRoom(null);
      setIsConnected(false);
    }
    
    // Clean up audio elements
    cleanupAudioElements();
    
    console.log('Voice session stopped and cleaned up');
  };

  useEffect(() => {
    if (isActive && !isConnected && !isConnecting) {
      startVoiceSession();
    } else if (!isActive && isConnected) {
      stopVoiceSession();
    }
  }, [isActive]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      console.log('VoiceChat component unmounting, cleaning up...');
      cleanupAudioElements();
      if (room) {
        room.disconnect();
      }
    };
  }, []);

  if (!isActive) return null;

  return (
    <div className="voice-chat-container">
      <div className="voice-status">
        {isConnecting && <span>🎤 Connecting...</span>}
        {isConnected && <span>🎙️ Voice Active - Speak now!</span>}
      </div>
    </div>
  );
};

export default VoiceChat;