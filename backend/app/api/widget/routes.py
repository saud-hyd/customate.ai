# Path: backend/app/api/widget/routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from fastapi.responses import Response, HTMLResponse, JSONResponse

from app.core.database.dependencies import get_db
from app.api.auth.dependencies import get_current_client
from app.domain.client.entities import Client
from app.repositories.client_repository import ClientSettingsRepository, ClientRepository

router = APIRouter(prefix="/widget", tags=["widget"])

@router.get("/settings", response_model=Dict[str, Any])
async def get_widget_settings(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get widget settings for the current client."""
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
        "session_timeout": getattr(settings, "session_timeout", 30),
        "reset_on_page_refresh": getattr(settings, "reset_on_page_refresh", True),
        "llm_provider": custom_settings.get("llm_provider", "deepseek"),
        "llm_model": custom_settings.get("llm_model"),
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
        "session_timeout": settings_data.get("session_timeout", 30),
        "reset_on_page_refresh": settings_data.get("reset_on_page_refresh", True),
    }
    
    # Handle LLM settings
    custom_settings = settings.custom_settings if settings else {}
    
    if settings_data.get("llm_provider"):
        if not custom_settings:
            custom_settings = {}
        custom_settings["llm_provider"] = settings_data["llm_provider"]
    
    if settings_data.get("llm_model"):
        if not custom_settings:
            custom_settings = {}
        custom_settings["llm_model"] = settings_data["llm_model"]
    
    # If custom_settings from request exist, use them
    if settings_data.get("custom_settings"):
        # Merge with existing custom settings
        if custom_settings:
            custom_settings.update(settings_data["custom_settings"])
        else:
            custom_settings = settings_data["custom_settings"]
    
    db_settings["custom_settings"] = custom_settings
    
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
            "session_timeout": getattr(settings, "session_timeout", 30),
            "reset_on_page_refresh": getattr(settings, "reset_on_page_refresh", True),
            "custom_settings": settings.custom_settings
        }
    }

@router.get("/client-settings", include_in_schema=False)
async def get_client_settings_by_api_key(
    apiKey: str,
    db: Session = Depends(get_db)
):
    """Get settings for a client by API key (for widget initialization)."""
    # Find client by API key
    client_repo = ClientRepository()
    client = client_repo.get_by_api_key(db, apiKey)
    
    if not client:
        return JSONResponse(
            status_code=404,
            content={"error": "Invalid API key"}
        )
    
    # Get client settings
    settings_repo = ClientSettingsRepository()
    settings = settings_repo.get_by_client_id(db, client.client_id)
    
    if not settings:
        return JSONResponse(content={
            "primaryColor": "#4f46e5",
            "chatbotName": "AI Assistant",
            "widgetPosition": "bottom-right",
            "showTypingIndicator": True,
            "enableSuggestions": True,
            "greetingMessage": "Hello! How can I help you today?",
            "sessionTimeout": 30,
            "resetOnPageRefresh": True,
            "llmProvider": "deepseek",
            "llmModel": "deepseek-chat"
        })
    
    # Get custom settings with LLM provider information
    custom_settings = settings.custom_settings or {}
    
    # Return client-specific settings in camelCase format for frontend
    return JSONResponse(content={
        "primaryColor": settings.primary_color,
        "chatbotName": settings.chatbot_name,
        "widgetPosition": settings.widget_position,
        "showTypingIndicator": settings.enable_typing_indicator,
        "enableSuggestions": settings.enable_suggestions,
        "greetingMessage": settings.greeting_message,
        "sessionTimeout": getattr(settings, "session_timeout", 30),
        "resetOnPageRefresh": getattr(settings, "reset_on_page_refresh", True),
        "llmProvider": custom_settings.get("llm_provider", "deepseek"),
        "llmModel": custom_settings.get("llm_model", "deepseek-chat")
    })

@router.get("/widget.js", include_in_schema=False)
def serve_widget_js():
    """Serve the widget JavaScript file with dynamic settings fetch."""
    widget_js = """
// Customate.ai Widget Loader - Dynamic Configuration
(function() {
    // Configuration object from global variable
    const config = window.customateConfig || {};
    
    // Default settings
    const defaults = {
        apiKey: null,
        position: 'bottom-right',
        primaryColor: '#4f46e5',
        apiUrl: 'https://customate-ai-1.onrender.com'
    };
    
    // Check for development environment
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const defaultApiUrl = isLocalhost ? 'http://localhost:8000' : 'https://customate-ai-1.onrender.com';
    
    // Merge configs with environment-aware defaults
    const settings = {
        ...defaults, 
        apiUrl: defaultApiUrl,
        ...config
    };
    
    // Make sure we have an API key
    if (!settings.apiKey) {
        console.error('Customate.ai Widget: API key is required');
        return;
    }
    
    // Fetch client-specific settings from server
    const fetchSettings = async () => {
        try {
            console.log('Fetching settings from:', settings.apiUrl);
            const response = await fetch(`${settings.apiUrl}/api/widget/client-settings?apiKey=${encodeURIComponent(settings.apiKey)}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load settings: ${response.status}`);
            }
            
            const serverSettings = await response.json();
            console.log('Server settings loaded:', serverSettings);
            
            // Merge server settings with client settings (client settings take precedence)
            const finalSettings = {...serverSettings, ...config};
            
            // Now create and initialize the widget
            createWidget(finalSettings);
        } catch (error) {
            console.warn('Failed to load server settings, using defaults:', error);
            // Create widget with only client settings as fallback
            createWidget(settings);
        }
    };
    
    // Create and initialize the widget 
    function createWidget(finalSettings) {
        // Create widget container
        const container = document.createElement('div');
        container.id = 'customate-chat-widget';
        container.style.position = 'fixed';
        container.style.zIndex = '999999';
        container.style.overflow = 'hidden';
        
        // Position the widget based on settings
        const position = finalSettings.widgetPosition || finalSettings.position || 'bottom-right';
        if (position === 'bottom-right') {
            container.style.bottom = '20px';
            container.style.right = '20px';
        } else if (position === 'bottom-left') {
            container.style.bottom = '20px';
            container.style.left = '20px';
        } else if (position === 'top-right') {
            container.style.top = '20px';
            container.style.right = '20px';
        } else if (position === 'top-left') {
            container.style.top = '20px';
            container.style.left = '20px';
        }
        
        document.body.appendChild(container);
        
        // Create toggle button (chat icon)
        const button = document.createElement('button');
        button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/></svg>';
        button.style.width = '60px';
        button.style.height = '60px';
        button.style.borderRadius = '50%';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        button.style.transition = 'transform 0.2s';
        
        // Apply primary color from settings
        button.style.backgroundColor = finalSettings.primaryColor || '#4f46e5';
        
        // Add hover effects
        button.addEventListener('mouseover', function() {
            button.style.transform = 'scale(1.05)';
        });
        
        button.addEventListener('mouseout', function() {
            button.style.transform = 'scale(1)';
        });
        
        container.appendChild(button);
        
        // Variables to track state
        let isOpen = false;
        let chatFrame = null;
        
        // Toggle chat when button is clicked
        button.addEventListener('click', function() {
            if (!chatFrame) {
                // First click - create the iframe
                chatFrame = document.createElement('iframe');
                chatFrame.style.width = '350px';
                chatFrame.style.height = '500px';
                chatFrame.style.border = 'none';
                chatFrame.style.position = 'absolute';
                chatFrame.style.bottom = '80px';
                chatFrame.style.right = '0';
                chatFrame.style.backgroundColor = 'white';
                chatFrame.style.borderRadius = '10px';
                chatFrame.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
                chatFrame.style.transition = 'opacity 0.3s';
                chatFrame.style.zIndex = '10000';
                
                // Create config param to pass all settings to the chat frame
                const configParam = encodeURIComponent(JSON.stringify({
                    primaryColor: finalSettings.primaryColor,
                    chatbotName: finalSettings.chatbotName,
                    greeting: finalSettings.greetingMessage,
                    widgetPosition: finalSettings.widgetPosition,
                    showTypingIndicator: finalSettings.showTypingIndicator,
                    enableSuggestions: finalSettings.enableSuggestions,
                    sessionTimeout: finalSettings.sessionTimeout,
                    resetOnPageRefresh: finalSettings.resetOnPageRefresh,
                    llmProvider: finalSettings.llmProvider,
                    llmModel: finalSettings.llmModel
                }));
                
                // IMPORTANT: We pass the API key and additional config to the chat frame
                chatFrame.src = `${finalSettings.apiUrl}/api/widget/chat?apiKey=${encodeURIComponent(finalSettings.apiKey)}&config=${configParam}`;
                chatFrame.title = finalSettings.chatbotName || "Chat with Customate AI";
                
                container.appendChild(chatFrame);
                isOpen = true;
            } else {
                // Subsequent clicks - toggle visibility
                if (isOpen) {
                    chatFrame.style.display = 'none';
                    isOpen = false;
                } else {
                    chatFrame.style.display = 'block';
                    isOpen = true;
                }
            }
        });

        // Listen for close messages from the iframe
        window.addEventListener('message', function(event) {
            if (event.data === 'closeChat' && chatFrame) {
                chatFrame.style.display = 'none';
                isOpen = false;
            }
        });
    }
    
    // Start the process - fetch settings and initialize widget
    fetchSettings();
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
        
        /* Suggestions */
        .suggestions-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
            margin-bottom: 16px;
        }
        
        .suggestion-chip {
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            border: 1px solid #4f46e5;
            color: #4f46e5;
            background: white;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .suggestion-chip:hover {
            background-color: rgba(79, 70, 229, 0.1);
        }
        
        /* Markdown rendering styles */
        .markdown-content p {
            margin-bottom: 0.75rem;
        }
        
        .markdown-content p:last-child {
            margin-bottom: 0;
        }
        
        .markdown-content ul, 
        .markdown-content ol {
            margin-top: 0.5rem;
            margin-bottom: 0.75rem;
            padding-left: 1.5rem;
        }
        
        .markdown-content ul li,
        .markdown-content ol li {
            margin-bottom: 0.25rem;
        }
        
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4 {
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        
        .markdown-content code {
            background-color: rgba(0, 0, 0, 0.05);
            padding: 0.1rem 0.3rem;
            border-radius: 3px;
            font-family: monospace;
        }
        
        .markdown-content pre {
            background-color: rgba(0, 0, 0, 0.05);
            padding: 0.75rem;
            border-radius: 3px;
            overflow-x: auto;
            margin: 0.75rem 0;
        }
        
        .markdown-content blockquote {
            border-left: 3px solid #e0e0e0;
            padding-left: 0.75rem;
            color: #555;
            margin: 0.75rem 0;
        }
        
        .markdown-content a {
            color: #4f46e5;
            text-decoration: underline;
        }
    </style>
    
    <!-- Add marked library for Markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked@4.0.0/marked.min.js"></script>
    <!-- Add DOMPurify for sanitizing HTML -->
    <script src="https://cdn.jsdelivr.net/npm/dompurify@2.3.8/dist/purify.min.js"></script>
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
        document.addEventListener('DOMContentLoaded', function() {
            // Get API key and config from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const apiKey = urlParams.get('apiKey');
            
            // Parse config from URL parameter
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
            
            // Check if we're in development mode
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const backendUrl = isLocalhost ? 'http://localhost:8000' : 'https://customate-ai-1.onrender.com';
            
            // Normalized API URL - ensure we don't duplicate /api prefix
            const apiUrl = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`;
            
            // Apply configuration
            const primaryColor = config.primaryColor || '#4f46e5';
            const chatTitle = config.chatbotName || 'AI Assistant';
            const shouldShowTypingIndicator = config.showTypingIndicator !== false;
            const enableSuggestions = config.enableSuggestions !== false; // Default to true
            
            // Set the header color and title
            const headerElement = document.getElementById('chatHeader');
            const titleElement = document.getElementById('chatTitle');
            const sendBtnElement = document.getElementById('sendBtn');
            const chatInput = document.getElementById('chatInput');
            
            if (headerElement) headerElement.style.backgroundColor = primaryColor;
            if (titleElement) titleElement.textContent = chatTitle;
            if (sendBtnElement) sendBtnElement.style.backgroundColor = primaryColor;
            
            // Focus input on load
            if (chatInput) chatInput.focus();
            
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
            
            // Show suggestions
            function showSuggestions(suggestions) {
                const messagesContainer = document.getElementById('chatMessages');
                if (!messagesContainer) return;
                
                const suggestionsContainer = document.createElement('div');
                suggestionsContainer.className = 'suggestions-container';
                
                suggestions.forEach(suggestion => {
                    const chip = document.createElement('button');
                    chip.className = 'suggestion-chip';
                    chip.textContent = suggestion;
                    chip.style.borderColor = primaryColor;
                    chip.style.color = primaryColor;
                    
                    chip.addEventListener('click', () => {
                        chatInput.value = suggestion;
                        sendMessage(suggestion);
                        suggestionsContainer.remove();
                    });
                    
                    suggestionsContainer.appendChild(chip);
                });
                
                messagesContainer.appendChild(suggestionsContainer);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
                    bubble.textContent = message;
                } else {
                    // Apply markdown formatting for assistant messages
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'markdown-content';
                    
                    // Use marked.js to parse markdown and DOMPurify to sanitize
                    contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(message));
                    
                    bubble.appendChild(contentDiv);
                }
                
                messageDiv.appendChild(bubble);
                messagesContainer.appendChild(messageDiv);
                
                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Send message to backend
            async function sendMessage(message) {
                if (!message.trim()) return;
                
                // Add user message to chat
                addMessage(message, true);
                
                // Show typing indicator if enabled
                if (showTypingIndicator) {
                    showTypingIndicator();
                }
                
                // Disable input while processing
                chatInput.disabled = true;
                sendBtnElement.disabled = true;
                
                try {
                    // Build LLM settings object - IMPORTANT: Match TestChatbot format exactly
                    const llmSettings = {};
                    
                    if (config.llmProvider) {
                        llmSettings.llm_provider = config.llmProvider;
                    }
                    
                    if (config.llmModel) {
                        llmSettings.llm_model = config.llmModel;
                    }
                    
                    // Common request data and headers - match TestChatbot format
                    const requestData = {
                        message: message,
                        session_id: sessionId,
                    };
                    
                    // Only add llm_settings if we have values
                    if (Object.keys(llmSettings).length > 0) {
                        requestData.llm_settings = llmSettings;
                    }
                    
const headers = {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    };
                    
                    console.log('Sending request with data:', JSON.stringify(requestData));
                    
                    // First: try the streaming endpoint - ensuring correct URL format
                    const streamEndpoint = `${apiUrl}/chatbot/message/stream`;
                    console.log('Using stream endpoint:', streamEndpoint);
                    
                    try {
                        const response = await fetch(streamEndpoint, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify(requestData)
                        });
                        
                        if (!response.ok) {
                            throw new Error(`API Error (${response.status})`);
                        }
                        
                        // Set up stream reading
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let buffer = '';
                        
                        // Hide typing indicator as we'll show content as it streams
                        hideTypingIndicator();
                        
                        // Create a temporary message that we'll update
                        const tempMessage = document.createElement('div');
                        tempMessage.className = 'assistant-message';
                        
                        const tempBubble = document.createElement('div');
                        tempBubble.className = 'message-bubble assistant-bubble';
                        
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'markdown-content';
                        
                        tempBubble.appendChild(contentDiv);
                        tempMessage.appendChild(tempBubble);
                        
                        const messagesContainer = document.getElementById('chatMessages');
                        messagesContainer.appendChild(tempMessage);
                        
                        // Process the stream
                        let fullResponse = "";
                        
                        while (true) {
                            const { value, done } = await reader.read();
                            if (done) break;
                            
                            buffer += decoder.decode(value, { stream: true });
                            
                            // Process complete events in buffer
                            const lines = buffer.split('\n\n');
                            buffer = lines.pop() || '';
                            
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    try {
                                        const eventData = line.substring(6);
                                        if (eventData && eventData !== '[DONE]') {
                                            const data = JSON.parse(eventData);
                                            
                                            if (data.type === 'info') {
                                                sessionId = data.session_id;
                                                console.log('Session ID:', sessionId);
                                            } else if (data.type === 'chunk') {
                                                fullResponse += data.content || '';
                                                contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullResponse));
                                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                            } else if (data.type === 'complete') {
                                                fullResponse = data.content;
                                                contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullResponse));
                                            } else if (data.type === 'done') {
                                                if (data.message && data.message.content) {
                                                    fullResponse = data.message.content;
                                                    contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullResponse));
                                                }
                                                
                                                if (data.session_id) {
                                                    sessionId = data.session_id;
                                                }
                                                
                                                if (enableSuggestions && data.suggestions && 
                                                    Array.isArray(data.suggestions) && data.suggestions.length > 0) {
                                                    showSuggestions(data.suggestions);
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error parsing streaming data:', e);
                                    }
                                }
                            }
                        }
                    } catch (streamError) {
                        console.warn('Streaming failed, falling back to standard endpoint:', streamError);
                        
                        // Fallback to standard endpoint
                        const standardEndpoint = `${apiUrl}/chatbot/message`;
                        console.log('Falling back to standard endpoint:', standardEndpoint);
                        
                        const response = await fetch(standardEndpoint, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify(requestData)
                        });
                        
                        if (!response.ok) {
                            throw new Error(`API Error (${response.status}): ${await response.text()}`);
                        }
                        
                        const data = await response.json();
                        
                        // Update session ID
                        if (data.session_id) {
                            sessionId = data.session_id;
                        }
                        
                        // Hide typing indicator
                        hideTypingIndicator();
                        
                        // Add assistant response to chat
                        addMessage(data.message.content, false);
                        
                        // Show suggestions if enabled and available
                        if (enableSuggestions && data.suggestions && 
                            Array.isArray(data.suggestions) && data.suggestions.length > 0) {
                            showSuggestions(data.suggestions);
                        }
                    }
                } catch (error) {
                    console.error('Error sending message:', error);
                    hideTypingIndicator();
                    
                    // Show error message
                    const errorMessage = `Sorry, there was an error processing your request. ${error.message}`;
                    addMessage(errorMessage, false, true);
                } finally {
                    // Re-enable input
                    chatInput.disabled = false;
                    sendBtnElement.disabled = false;
                    chatInput.focus();
                    chatInput.value = '';
                }
            }
            
            // Set up event listeners
            if (sendBtnElement) {
                sendBtnElement.addEventListener('click', function() {
                    const message = chatInput.value;
                    chatInput.value = '';
                    chatInput.style.height = 'auto';
                    sendMessage(message);
                });
            }
            
            if (chatInput) {
                // Auto-resize textarea
                chatInput.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
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
            }
            
            // Close button
            const closeBtnElement = document.getElementById('closeBtn');
            if (closeBtnElement) {
                closeBtnElement.addEventListener('click', function() {
                    // Send a message to the parent window to close the chat
                    window.parent.postMessage('closeChat', '*');
                });
            }
            
            // Add welcome message
            const greeting = config.greeting || 'Hello! How can I help you today?';
            addMessage(greeting, false);
        });
    </script>
</body>
</html>
    """
    
    return HTMLResponse(content=html_content)