# Path: backend/app/api/widget/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from fastapi.responses import Response, HTMLResponse

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.client_repository import ClientSettingsRepository

router = APIRouter(prefix="/widget", tags=["widget"])

@router.get("/settings", response_model=Dict[str, Any])
async def get_widget_settings(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, current_client.client_id)
    
    if not settings:
        # Create default settings if they don't exist
        settings = settings_repo.create(db, obj_in={"client_id": current_client.client_id})
    
    custom_settings = settings.custom_settings or {}
    
    return {
        "primary_color": settings.primary_color,
        "logo_url": settings.logo_url,
        "greeting_message": settings.greeting_message,
        "enable_suggestions": settings.enable_suggestions,
        "enable_typing_indicator": settings.enable_typing_indicator,
        "widget_position": settings.widget_position,
        "chatbot_name": settings.chatbot_name,
        "llm_provider": custom_settings.get("llm_provider", "deepseek"),
        "llm_model": custom_settings.get("llm_model"),
        # Return the full custom settings
        "custom_settings": custom_settings
    }
    
@router.put("/settings", response_model=Dict[str, Any])
async def update_widget_settings(
    settings_data: Dict[str, Any],
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Update widget settings for the current client."""
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, current_client.client_id)
    
    # Map incoming settings to database fields
    db_settings = {
        "primary_color": settings_data.get("primary_color", "#4f46e5"),
        "chatbot_name": settings_data.get("chatbot_name", "AI Assistant"),
        "widget_position": settings_data.get("widget_position", "bottom-right"),
        "enable_typing_indicator": settings_data.get("show_typing_indicator", True),
        "enable_suggestions": settings_data.get("enable_suggestions", True),
        "greeting_message": settings_data.get("greeting_message"),
        # Add the custom settings to be saved in the database
        "custom_settings": settings_data.get("custom_settings", {}),
    }
    
    if not settings:
        # Create settings if they don't exist
        db_settings["client_id"] = current_client.client_id
        settings = settings_repo.create(db, obj_in=db_settings)
    else:
        # Update existing settings
        settings = settings_repo.update(db, db_obj=settings, obj_in=db_settings)
    
    # Return the complete updated settings
    return {
        "message": "Widget settings updated successfully",
        "settings": {
            "primary_color": settings.primary_color,
            "chatbot_name": settings.chatbot_name,
            "widget_position": settings.widget_position,
            "show_typing_indicator": settings.enable_typing_indicator,
            "enable_suggestions": settings.enable_suggestions,
            "greeting_message": settings.greeting_message,
            # Include custom settings in the response
            "custom_settings": settings.custom_settings
        }
    }
    
@router.get("/widget.js", include_in_schema=False)
async def serve_widget_js():
    """Serve the widget JavaScript file without authentication."""
    # The file content as a string - an improved version of the widget loader
    widget_js = """
// Improved Customate.ai Widget Loader
(function() {
    // Configuration object to store settings
    const config = window.customateConfig || {};
    
    // Default settings
    const defaults = {
        apiKey: null,
        position: 'bottom-right',
        primaryColor: '#4f46e5',
        apiUrl: 'https://customate-ai-1.onrender.com',
        chatbotName: 'AI Assistant',
        showTypingIndicator: true,
        enableSuggestions: true
    };
    
    // Merge configs
    const settings = {...defaults, ...config};
    
    // Log for debugging
    console.log('Customate Chat: Initializing with settings', 
      JSON.stringify({
        apiKey: settings.apiKey ? '***' : 'not set',
        position: settings.position,
        apiUrl: settings.apiUrl
      })
    );
    
    // Make sure we have an API key
    if (!settings.apiKey) {
        console.error('Customate.ai Widget: API key is required');
        return;
    }
    
    // Create widget container
    const container = document.createElement('div');
    container.id = 'customate-chat-widget';
    container.style.position = 'fixed';
    container.style.zIndex = '9999';
    container.style.overflow = 'hidden';
    
    // Position the widget
    if (settings.position === 'bottom-right') {
        container.style.bottom = '20px';
        container.style.right = '20px';
    } else if (settings.position === 'bottom-left') {
        container.style.bottom = '20px';
        container.style.left = '20px';
    } else if (settings.position === 'top-right') {
        container.style.top = '20px';
        container.style.right = '20px';
    } else if (settings.position === 'top-left') {
        container.style.top = '20px';
        container.style.left = '20px';
    }
    
    document.body.appendChild(container);
    
    // Create toggle button with explicit styling
    const button = document.createElement('button');
    button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/></svg>';
    button.style.width = '60px';
    button.style.height = '60px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = settings.primaryColor;
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    button.style.padding = '0';
    button.style.transition = 'transform 0.2s ease';
    button.setAttribute('aria-label', 'Open chat widget');
    container.appendChild(button);
    
    // Widget state
    let isOpen = false;
    let chatFrame = null;
    
    // Add hover effect
    button.addEventListener('mouseover', function() {
        button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseout', function() {
        button.style.transform = 'scale(1)';
    });
    
    // Toggle widget with explicit debugging
    button.addEventListener('click', function(e) {
        console.log('Customate widget button clicked');
        e.preventDefault();
        
        if (isOpen) {
            // Close widget
            if (chatFrame) {
                chatFrame.style.display = 'none';
            }
            isOpen = false;
            console.log('Customate widget closed');
        } else {
            // Open widget or create it if it doesn't exist
            if (!chatFrame) {
                console.log('Creating chat iframe');
                // Create iframe for the chat interface
                chatFrame = document.createElement('iframe');
                chatFrame.style.width = '350px';
                chatFrame.style.height = '500px';
                chatFrame.style.border = 'none';
                chatFrame.style.borderRadius = '10px';
                chatFrame.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
                chatFrame.style.backgroundColor = 'white';
                chatFrame.style.position = 'absolute';
                chatFrame.style.overflow = 'hidden';
                
                // Position the frame based on the settings
                if (settings.position === 'bottom-right') {
                    chatFrame.style.bottom = '80px';
                    chatFrame.style.right = '0';
                } else if (settings.position === 'bottom-left') {
                    chatFrame.style.bottom = '80px';
                    chatFrame.style.left = '0';
                } else if (settings.position === 'top-right') {
                    chatFrame.style.top = '20px';
                    chatFrame.style.right = '0';
                } else if (settings.position === 'top-left') {
                    chatFrame.style.top = '20px';
                    chatFrame.style.left = '0';
                }
                
                // Set the src to your chat interface URL with API key
                const configString = encodeURIComponent(JSON.stringify(settings));
                const chatUrl = `${settings.apiUrl}/api/widget/chat?apiKey=${encodeURIComponent(settings.apiKey)}&config=${configString}`;
                
                console.log('Loading chat iframe from:', chatUrl);
                chatFrame.src = chatUrl;
                chatFrame.setAttribute('title', 'Customate Chat Widget');
                
                container.appendChild(chatFrame);
                
                // Listen for close messages from the iframe
                window.addEventListener('message', function(event) {
                    if (event.data === 'closeChat') {
                        chatFrame.style.display = 'none';
                        isOpen = false;
                    }
                });
                
            } else {
                console.log('Showing existing chat iframe');
                chatFrame.style.display = 'block';
            }
            isOpen = true;
        }
    });
    
    // Log successful initialization
    console.log('Customate Chat Widget initialized successfully');
})();
"""
    
    return Response(
        content=widget_js,
        media_type="application/javascript"
    )
    
@router.get("/chat", include_in_schema=False)
async def serve_chat_interface(
    apiKey: str = None,
    config: str = None,
    request: Request = None
):
    """Serve the chat interface HTML without authentication."""
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background-color: white;
        }
        
        .chat-header {
            padding: 12px 16px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: #4f46e5;
        }
        
        .chat-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }
        
        .chat-messages {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            background-color: #f9fafb;
        }
        
        .chat-input-container {
            border-top: 1px solid #e5e7eb;
            padding: 12px 16px;
            display: flex;
            align-items: flex-end;
            gap: 8px;
            background-color: white;
        }
        
        .chat-input {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 20px;
            padding: 10px 16px;
            max-height: 120px;
            min-height: 44px;
            resize: none;
            font-family: inherit;
            font-size: 14px;
            outline: none;
        }
        
        .chat-input:focus {
            border-color: #6366f1;
        }
        
        .chat-send-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #4f46e5;
        }
        
        .user-message {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 16px;
        }
        
        .assistant-message {
            display: flex;
            justify-content: flex-start;
            margin-bottom: 16px;
        }
        
        .message-bubble {
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 80%;
            word-break: break-word;
        }
        
        .user-bubble {
            color: white;
            border-bottom-right-radius: 4px;
            background-color: #4f46e5;
        }
        
        .assistant-bubble {
            background-color: white;
            border: 1px solid #e5e7eb;
            color: #1f2937;
            border-bottom-left-radius: 4px;
        }
        
        .error-message {
            background-color: #fee2e2;
            border-color: #fca5a5;
            color: #b91c1c;
        }
        
        .typing-indicator {
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 6px 12px;
            margin-bottom: 16px;
            background-color: white;
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            border-bottom-left-radius: 4px;
            width: fit-content;
        }
        
        .typing-dot {
            width: 8px;
            height: 8px;
            background-color: #6b7280;
            border-radius: 50%;
            opacity: 0.7;
            animation: typing-animation 1.5s infinite;
        }
        
        .typing-dot:nth-child(2) {
            animation-delay: 0.15s;
        }
        
        .typing-dot:nth-child(3) {
            animation-delay: 0.3s;
        }
        
        @keyframes typing-animation {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-8px); }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header" id="chatHeader">
            <h3 class="chat-title" id="chatTitle">AI Assistant</h3>
            <button id="closeBtn" style="background: none; border: none; color: white; cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
            </button>
        </div>
        
        <div class="chat-messages" id="chatMessages"></div>
        
        <div class="chat-input-container">
            <textarea id="chatInput" class="chat-input" placeholder="Type your message..." rows="1"></textarea>
            <button id="sendBtn" class="chat-send-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
                </svg>
            </button>
        </div>
    </div>
    
    <script>
        // Wait for the DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Get API key from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const apiKey = urlParams.get('apiKey');
            
            let configParam = urlParams.get('config');
            let config = {};
            
            if (configParam) {
                try {
                    config = JSON.parse(decodeURIComponent(configParam));
                    console.log('Chat config loaded:', config);
                } catch (e) {
                    console.error('Error parsing config:', e);
                }
            }
            
            // Make sure DOM elements exist before trying to access them
            const headerElement = document.getElementById('chatHeader');
            const titleElement = document.getElementById('chatTitle');
            const sendBtnElement = document.getElementById('sendBtn');
            const chatInput = document.getElementById('chatInput');
            
            if (!headerElement || !titleElement || !sendBtnElement || !chatInput) {
                console.error('Required DOM elements not found');
                return;
            }
            
            // Apply configuration
            const primaryColor = config.primaryColor || '#4f46e5';
            const chatTitle = config.chatbotName || 'AI Assistant';
            
            // Set the header color and title
            headerElement.style.backgroundColor = primaryColor;
            titleElement.textContent = chatTitle;
            sendBtnElement.style.backgroundColor = primaryColor;
            
            // Focus input on load
            chatInput.focus();
            
            // Auto-resize textarea
            chatInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
            
            // Session ID for conversation tracking
            let sessionId = null;
            let isTyping = false;
            let typingIndicator = null;
            
            // Create typing indicator
            function showTypingIndicator() {
                if (isTyping) return;
                
                const messagesContainer = document.getElementById('chatMessages');
                if (!messagesContainer) return;
                
                typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'typing-dot';
                    typingIndicator.appendChild(dot);
                }
                
                messagesContainer.appendChild(typingIndicator);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                isTyping = true;
            }
            
            function hideTypingIndicator() {
                if (!isTyping || !typingIndicator) return;
                
                typingIndicator.remove();
                typingIndicator = null;
                isTyping = false;
            }
            
            // Add message to the chat
            function addMessage(message, isUser, isError = false) {
                hideTypingIndicator();
                
                const messagesContainer = document.getElementById('chatMessages');
                if (!messagesContainer) return;
                
                const messageDiv = document.createElement('div');
                messageDiv.className = isUser ? 'user-message' : 'assistant-message';
                
                const bubble = document.createElement('div');
                bubble.className = `message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`;
                if (isError) {
                    bubble.className += ' error-message';
                }
                
                if (isUser) {
                    bubble.style.backgroundColor = primaryColor;
                }
                
                bubble.textContent = message;
                
                messageDiv.appendChild(bubble);
                messagesContainer.appendChild(messageDiv);
                
                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Get current origin as the API URL
            const currentOrigin = window.location.origin;
            const backendUrl = config.apiUrl || currentOrigin;
            console.log('Using backend URL:', backendUrl);
            
            // Send message to backend
            async function sendMessage(message) {
                if (!message.trim()) return;
                
                // Add user message to chat
                addMessage(message, true);
                
                // Show typing indicator
                showTypingIndicator();
                
                // Disable input while processing
                chatInput.disabled = true;
                sendBtnElement.disabled = true;
                
                try {
                    console.log('Sending message to:', `${backendUrl}/api/chatbot/message`);
                    console.log('With API key:', apiKey ? `${apiKey.substring(0, 5)}...` : 'none');
                    
                    // Send message to backend
                    const response = await fetch(`${backendUrl}/api/chatbot/message`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': apiKey
                        },
                        body: JSON.stringify({
                            message: message,
                            session_id: sessionId,
                            llm_settings: config.customData || {}
                        })
                    });
                    
                    console.log('Response status:', response.status);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API Error:', response.status, errorText);
                        throw new Error(`API Error (${response.status}): ${errorText}`);
                    }
                    
                    const data = await response.json();
                    console.log('Response data:', data);
                    
                    // Update session ID
                    if (data.session_id) {
                        sessionId = data.session_id;
                        console.log('Session ID updated:', sessionId);
                    }
                    
                    // Hide typing indicator
                    hideTypingIndicator();
                    
                    // Add assistant response to chat
                    addMessage(data.message.content, false);
                    
                } catch (error) {
                    console.error('Error sending message:', error);
                    
                    // Hide typing indicator
                    hideTypingIndicator();
                    
                    // Show error message
                    const errorMessage = `Sorry, there was an error processing your request. ${error.message}`;
                    addMessage(errorMessage, false, true);
                } finally {
                    // Re-enable input
                    chatInput.disabled = false;
                    sendBtnElement.disabled = false;
                    chatInput.focus();
                }
            }
            
            // Send message on button click
            sendBtnElement.addEventListener('click', function() {
                const message = chatInput.value;
                chatInput.value = '';
                chatInput.style.height = 'auto';
                sendMessage(message);
            });
            
            // Send message on Enter (but allow Shift+Enter for new line)
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const message = chatInput.value;
                    chatInput.value = '';
                    chatInput.style.height = 'auto';
                    sendMessage(message);
                }
            });
            
            // Close button
            const closeBtnElement = document.getElementById('closeBtn');
            if (closeBtnElement) {
                closeBtnElement.addEventListener('click', function() {
                    // Send a message to the parent window to close the chat
                    window.parent.postMessage('closeChat', '*');
                });
            }
            
            // Add welcome message
            const greeting = config.greeting_message || 'Hello! How can I help you today?';
            addMessage(greeting, false);
        });
    </script>
</body>
</html>
    """
    
    return HTMLResponse(content=html_content)