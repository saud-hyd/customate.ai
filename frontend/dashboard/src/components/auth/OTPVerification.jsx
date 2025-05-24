import React, { useState, useEffect } from 'react';

const OTPVerification = ({ email, otp, setOtp, onVerify, resendOTP }) => {
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resending OTP
  useEffect(() => {
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (timer === 0 && !canResend) {
      setCanResend(true);
    }
  }, [timer, canResend]);

  const handleResend = () => {
    resendOTP(email);
    setCanResend(false);
    setTimer(60);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Verify your email</h3>
          <p className="mt-1 text-sm text-gray-600">
            We've sent a verification code to <span className="font-medium">{email}</span>
          </p>
        </div>
        
        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
          Verification Code
        </label>
        <input
          id="otp"
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Enter 6-digit code"
          maxLength={6}
          required
        />
      </div>
      
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend}
          className="text-sm text-orange-600 hover:text-orange-500 disabled:text-gray-400"
        >
          {canResend ? 'Resend code' : `Resend in ${timer}s`}
        </button>
        
        <button
          type="button"
          onClick={onVerify}
          disabled={otp.length !== 6}
          className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-400"
        >
          Verify
        </button>
      </div>
    </div>
  );
};

export default OTPVerification;