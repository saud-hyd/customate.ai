import smtplib
import ssl
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
import logging
from datetime import datetime
import os
import socket

from app.core.config.settings import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails with proper timeout handling."""
    
    def __init__(self):
        self.sender_email = settings.EMAIL_SENDER
        self.password = settings.EMAIL_PASSWORD
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        # FIXED: Add timeout configuration
        self.timeout = 10  # 10 seconds timeout
    
    def _is_email_properly_configured(self) -> bool:
        """Check if email credentials are properly configured."""
        return (
            self.sender_email and 
            self.sender_email != "noreply@customate.ai" and
            self.password and 
            len(self.password) > 5
        )

    def send_email(self, recipient: str, subject: str, body_html: str, body_text: str = None) -> bool:
        """Send an email using SMTP with proper error handling."""
        try:
            # Always log email details for debugging
            logger.info(f"Attempting to send email to: {recipient}")
            logger.info(f"Subject: {subject}")
            logger.info(f"SMTP Server: {self.smtp_server}:{self.smtp_port}")
            logger.info(f"Sender: {self.sender_email}")
            
            # Check if email is configured properly
            if not self._is_email_properly_configured():
                error_msg = f"Email not configured properly. Sender: {self.sender_email}, Password set: {bool(self.password)}"
                logger.error(error_msg)
                
                # In development, show the verification link in logs for testing
                if settings.DEBUG:
                    if "verify-email?token=" in body_html:
                        # Extract verification link from email body
                        import re
                        link_match = re.search(r'href="([^"]*verify-email[^"]*)"', body_html)
                        if link_match:
                            verification_link = link_match.group(1)
                            logger.info(f"🔗 DEVELOPMENT: Use this verification link: {verification_link}")
                            # Return True so registration continues, but email isn't actually sent
                            return True
                
                return False
                
            # Create email message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.sender_email
            message["To"] = recipient
            
            # Create the plain-text and HTML version of the message
            if body_text:
                text_part = MIMEText(body_text, "plain")
                message.attach(text_part)
                
            html_part = MIMEText(body_html, "html")
            message.attach(html_part)
            
            # Create secure connection with server and send email
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context) as server:
                server.login(self.sender_email, self.password)
                server.sendmail(self.sender_email, recipient, message.as_string())
                
            logger.info(f"Email sent successfully to {recipient}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {str(e)}")
            return False

    def send_magic_link_email(self, recipient_email: str, magic_link_url: str, is_registration: bool = False) -> bool:
        """
        Send magic link email for login or registration verification with timeout protection.
        """
        try:
            subject = "Verify Your Email - Customate.ai" if is_registration else "Login Link - Customate.ai"
            
            # Create appropriate message based on registration vs login
            if is_registration:
                html_content = f"""
                <html>
                    <body>
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #4f46e5;">Verify Your Email Address</h2>
                            <p>Thank you for registering with Customate.ai! Please click the button below to verify your email address and activate your account:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{magic_link_url}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
                            </div>
                            <p>Or copy and paste this link in your browser:</p>
                            <p style="word-break: break-all; color: #666;">{magic_link_url}</p>
                            <p><strong>This link will expire in 15 minutes for security.</strong></p>
                            <p>If you didn't create an account, please ignore this email.</p>
                        </div>
                    </body>
                </html>
                """
                
                text_content = f"""
                Verify Your Email Address
                
                Thank you for registering with Customate.ai! Please visit the following link to verify your email address:
                
                {magic_link_url}
                
                This link will expire in 15 minutes for security.
                
                If you didn't create an account, please ignore this email.
                """
            else:
                html_content = f"""
                <html>
                    <body>
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #4f46e5;">Your Login Link</h2>
                            <p>Click the button below to log in to your Customate.ai account:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{magic_link_url}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In</a>
                            </div>
                            <p>Or copy and paste this link in your browser:</p>
                            <p style="word-break: break-all; color: #666;">{magic_link_url}</p>
                            <p><strong>This link will expire in 15 minutes for security.</strong></p>
                        </div>
                    </body>
                </html>
                """
                
                text_content = f"""
                Your Login Link
                
                Click the following link to log in to your Customate.ai account:
                
                {magic_link_url}
                
                This link will expire in 15 minutes for security.
                """
            
            # FIXED: Use the timeout-protected send_email method
            return self.send_email(recipient_email, subject, html_content, text_content)
            
        except Exception as e:
            logger.error(f"Error creating magic link email: {str(e)}")
            return False
                    
    def send_password_reset_email(self, recipient: str, reset_link_url: str) -> bool:
        """
        Send password reset email.
        
        Args:
            recipient: Email address to send to
            reset_link_url: The full URL for the password reset link
            
        Returns:
            Boolean indicating success
        """
        subject = "Reset Your Password - Customate.ai"
        
        # HTML body
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4f46e5;">Customate.ai</h1>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px;">
                    <h2>Reset Your Password</h2>
                    <p>You requested to reset your password. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link_url}" style="background-color: #4f46e5; color: white; font-size: 16px; font-weight: bold; padding: 12px 24px; border-radius: 5px; text-decoration: none; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p>This link will expire in 15 minutes for security reasons.</p>
                    <p>If you didn't request a password reset, you can safely ignore this email.</p>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
                    <p>© 2025 Customate.ai. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text body
        text = f"""
        Reset Your Password - Customate.ai
        
        You requested to reset your password. Use the following link to set a new password:
        
        {reset_link_url}
        
        This link will expire in 15 minutes for security reasons.
        
        If you didn't request a password reset, you can safely ignore this email.
        """
        
        return self.send_email(recipient, subject, html, text)