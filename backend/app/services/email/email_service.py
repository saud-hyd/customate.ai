import smtplib
import ssl
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
import logging

from app.core.config.settings import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails."""
    
    def __init__(self):
        self.sender_email = settings.EMAIL_SENDER
        self.password = settings.EMAIL_PASSWORD
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
    
    def generate_otp(self, length=6) -> str:
        """Generate a random OTP."""
        return ''.join(random.choices(string.digits, k=length))
    
    def send_email(self, recipient: str, subject: str, body_html: str, body_text: str = None) -> bool:
        """Send an email using SMTP."""
        try:
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
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def send_otp_email(self, recipient: str, otp: str) -> bool:
        """Send OTP verification email."""
        subject = "Verify Your Account - Customate.ai"
        
        # HTML body
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4f46e5;">Customate.ai</h1>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px;">
                    <h2>Verify Your Email Address</h2>
                    <p>Thank you for registering with Customate.ai. Use the following verification code to complete your registration:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background-color: #4f46e5; color: white; font-size: 24px; font-weight: bold; padding: 15px; border-radius: 5px; letter-spacing: 5px;">
                            {otp}
                        </div>
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
                    <p>© {2025} Customate.ai. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text body
        text = f"""
        Verify Your Email Address
        
        Thank you for registering with Customate.ai. Use the following verification code to complete your registration:
        
        {otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this verification, please ignore this email.
        """
        
        return self.send_email(recipient, subject, html, text)