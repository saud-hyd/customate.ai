// Path: frontend/dashboard/src/components/testing/VoiceTestInterface.jsx
// Usage: Voice testing interface for testing AI voice responses with recording and playback

import React, { useState, useEffect } from 'react';
import { 
  MicrophoneIcon, 
  PhoneIcon, 
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import VoiceRecorder from './VoiceRecorder';
import VoicePlayback from './VoicePlayback';
import telephonyService from '../../services/telephonyService';

const VoiceTestInterface = ({ config, onTestResult }) => {
  const [testMode, setTestMode] = useState('phone'); // 'phone' or 'microphone'
  const [isTestActive, setIsTestActive] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');

  // Load available phone numbers
  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      try {
        const numbers = await telephonyService.getPhoneNumbers();
        setPhoneNumbers(numbers);
        if (numbers.length > 0) {
          setSelectedPhoneNumber(numbers[0].phone_number);
        }
      } catch (err) {
        console.error('Failed to load phone numbers:', err);
        setError('Failed to load available phone numbers');
      }
    };

    fetchPhoneNumbers();
  }, []);

  const handleMicrophoneTest = async (audioBlob, transcript) => {
    setIsTestActive(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('transcript', transcript);
      formData.append('config', JSON.stringify(config));

      const result = await telephonyService.testVoiceInteraction(formData);
      
      const testData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        mode: 'microphone',
        input: transcript,
        response: result.response_text,
        audioUrl: result.response_audio_url,
        duration: result.processing_time_ms,
        success: true
      };

      setTestResult(testData);
      setTestHistory(prev => [testData, ...prev.slice(0, 9)]); // Keep last 10 tests
      
      if (onTestResult) {
        onTestResult(testData);
      }
    } catch (err) {
      console.error('Voice test failed:', err);
      setError('Voice test failed. Please try again.');
      
      const errorData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        mode: 'microphone',
        error: err.message || 'Unknown error',
        success: false
      };
      
      setTestResult(errorData);
      setTestHistory(prev => [errorData, ...prev.slice(0, 9)]);
    } finally {
      setIsTestActive(false);
    }
  };

  const handlePhoneTest = async () => {
    if (!selectedPhoneNumber) {
      setError('Please select a phone number to test');
      return;
    }

    setIsTestActive(true);
    setError(null);

    try {
      const result = await telephonyService.initiateTestCall({
        phone_number: selectedPhoneNumber,
        config: config
      });

      const testData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        mode: 'phone',
        callId: result.call_id,
        phoneNumber: selectedPhoneNumber,
        status: 'initiated',
        success: true
      };

      setTestResult(testData);
      setTestHistory(prev => [testData, ...prev.slice(0, 9)]);
      
      if (onTestResult) {
        onTestResult(testData);
      }
    } catch (err) {
      console.error('Phone test failed:', err);
      setError('Failed to initiate test call. Please try again.');
      
      const errorData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        mode: 'phone',
        error: err.message || 'Unknown error',
        success: false
      };
      
      setTestResult(errorData);
      setTestHistory(prev => [errorData, ...prev.slice(0, 9)]);
    } finally {
      setIsTestActive(false);
    }
  };

  const clearTestHistory = () => {
    setTestHistory([]);
    setTestResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Test Mode Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Testing Mode</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Microphone Test */}
          <div className={`
            p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
            ${testMode === 'microphone' 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-200 hover:border-gray-300'
            }
          `} onClick={() => setTestMode('microphone')}>
            <div className="flex items-center space-x-3">
              <div className={`
                p-2 rounded-lg
                ${testMode === 'microphone' ? 'bg-green-100' : 'bg-gray-100'}
              `}>
                <MicrophoneIcon className={`
                  w-6 h-6
                  ${testMode === 'microphone' ? 'text-green-600' : 'text-gray-600'}
                `} />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Microphone Test</h4>
                <p className="text-sm text-gray-500">Record audio directly in browser</p>
              </div>
            </div>
          </div>

          {/* Phone Test */}
          <div className={`
            p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
            ${testMode === 'phone' 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-200 hover:border-gray-300'
            }
          `} onClick={() => setTestMode('phone')}>
            <div className="flex items-center space-x-3">
              <div className={`
                p-2 rounded-lg
                ${testMode === 'phone' ? 'bg-green-100' : 'bg-gray-100'}
              `}>
                <PhoneIcon className={`
                  w-6 h-6
                  ${testMode === 'phone' ? 'text-green-600' : 'text-gray-600'}
                `} />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Phone Test</h4>
                <p className="text-sm text-gray-500">Test with actual phone calls</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Interface */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {testMode === 'microphone' ? (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Microphone Testing</h4>
            <VoiceRecorder
              onRecordingComplete={handleMicrophoneTest}
              isDisabled={isTestActive}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Phone Testing</h4>
            
            {phoneNumbers.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Phone Number
                  </label>
                  <select
                    value={selectedPhoneNumber}
                    onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    {phoneNumbers.map((number) => (
                      <option key={number.phone_number} value={number.phone_number}>
                        {number.phone_number} {number.friendly_name && `(${number.friendly_name})`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={handlePhoneTest}
                  disabled={isTestActive || !selectedPhoneNumber}
                  className={`
                    w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium
                    ${isTestActive || !selectedPhoneNumber
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                    }
                  `}
                >
                  {isTestActive ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
                      Initiating Call...
                    </>
                  ) : (
                    <>
                      <PhoneIcon className="w-4 h-4 mr-2" />
                      Start Test Call
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <PhoneIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No phone numbers available for testing</p>
                <p className="text-sm">Configure phone numbers in settings</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Latest Test Result */}
      {testResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Latest Test Result</h4>
            <div className="flex items-center space-x-2">
              {testResult.success ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.success ? 'Success' : 'Failed'}
              </span>
            </div>
          </div>

          {testResult.success ? (
            <div className="space-y-3">
              {testResult.mode === 'microphone' && (
                <>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Input: </span>
                    <span className="text-sm text-gray-600">{testResult.input}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Response: </span>
                    <span className="text-sm text-gray-600">{testResult.response}</span>
                  </div>
                  {testResult.audioUrl && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Response Audio:</span>
                      <VoicePlayback audioUrl={testResult.audioUrl} />
                    </div>
                  )}
                </>
              )}
              
              {testResult.mode === 'phone' && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Call ID: </span>
                  <span className="text-sm text-gray-600 font-mono">{testResult.callId}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-red-600">
              {testResult.error}
            </div>
          )}
        </div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Test History</h4>
            <button
              onClick={clearTestHistory}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear History
            </button>
          </div>
          
          <div className="space-y-2">
            {testHistory.slice(0, 5).map((test) => (
              <div key={test.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-2">
                  {test.mode === 'microphone' ? (
                    <MicrophoneIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600">
                    {new Date(test.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {test.success ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceTestInterface;