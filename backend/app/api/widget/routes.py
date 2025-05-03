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
        console.log('Creating widget with settings:', finalSettings);
        
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
            console.log('Button clicked, current state:', isOpen);
            
            if (!chatFrame) {
                console.log('Creating new chat frame');
                
                // First click - create the iframe
                chatFrame = document.createElement('iframe');
                
                // Set styles all at once for better performance
                Object.assign(chatFrame.style, {
                    width: '350px',
                    height: '500px',
                    border: '1px solid #ccc', // Add a border to make it visible during debugging
                    position: 'fixed', // Use fixed instead of absolute for better positioning
                    bottom: '80px',
                    right: '20px', // Ensure it's visible on the right
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)', // Stronger shadow
                    display: 'block',
                    opacity: '1', // Ensure full opacity
                    visibility: 'visible', // Explicitly set visibility
                    zIndex: '2147483647' // Maximum z-index to ensure it's on top
                });
                
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
                
                // Normalize API URL to avoid duplicate /api
                let apiUrl = finalSettings.apiUrl;
                if (apiUrl.endsWith('/api')) {
                    apiUrl = apiUrl.slice(0, -4);
                }
                
                // IMPORTANT: We pass the API key and additional config to the chat frame
                const chatUrl = `${apiUrl}/api/widget/chat?apiKey=${encodeURIComponent(finalSettings.apiKey)}&config=${configParam}`;
                console.log('Loading iframe from URL:', chatUrl);
                
                // Add load and error handlers
                chatFrame.onload = () => console.log('Chat iframe loaded successfully');
                chatFrame.onerror = (e) => console.error('Error loading chat iframe:', e);
                
                // Set the source after attaching event handlers
                chatFrame.src = chatUrl;
                chatFrame.title = finalSettings.chatbotName || "Chat with Customate AI";
                
                // Append to container and update state
                container.appendChild(chatFrame);
                console.log('Chat frame added to DOM');
                isOpen = true;
            } else {
                // Subsequent clicks - toggle visibility
                isOpen = !isOpen;
                chatFrame.style.display = isOpen ? 'block' : 'none';
                chatFrame.style.opacity = isOpen ? '1' : '0';
                console.log('Toggled chat frame visibility:', isOpen ? 'visible' : 'hidden');
            }
        });

        // Listen for close messages from the iframe
        window.addEventListener('message', function(event) {
            if (event.data === 'closeChat' && chatFrame) {
                chatFrame.style.display = 'none';
                isOpen = false;
                console.log('Chat closed via message from iframe');
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
    """Serve the chat interface HTML that uses the streaming API similar to TestChatbot page."""
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat</title>
    <style>
        body, html { margin: 0; padding: 0; height: 100%; font-family: sans-serif; overflow: hidden; }
        * { box-sizing: border-box; }
        .chat-container { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        .chat-header { padding: 12px 16px; color: white; display: flex; align-items: center; justify-content: space-between; background-color: #4f46e5; }
        .chat-brand { display: flex; align-items: center; }
        .chat-logo { width: 24px; height: 24px; margin-right: 8px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .chat-title { font-size: 16px; font-weight: 600; margin: 0; }
        .chat-subtitle { font-size: 12px; opacity: 0.8; margin: 0; }
        .chat-messages { flex: 1; padding: 16px; overflow-y: auto; background-color: #f9fafb; }
        .message-group { margin-bottom: 16px; }
        .message-group.user { display: flex; justify-content: flex-end; }
        .message-group.assistant { display: flex; justify-content: flex-start; }
        .message-bubble { padding: 12px 16px; border-radius: 18px; max-width: 75%; word-break: break-word; }
        .message-bubble.user { background-color: #4f46e5; color: white; border-bottom-right-radius: 4px; }
        .message-bubble.assistant { background-color: white; border: 1px solid #e5e7eb; color: #1f2937; border-bottom-left-radius: 4px; }
        .message-bubble.error { background-color: #fee2e2; border: 1px solid #fecaca; color: #b91c1c; }
        .message-time { font-size: 11px; margin-top: 4px; text-align: right; opacity: 0.7; }
        .chat-input-container { border-top: 1px solid #e5e7eb; padding: 12px 16px; display: flex; align-items: flex-end; gap: 8px; background-color: white; }
        .chat-input { flex: 1; border: 1px solid #d1d5db; border-radius: 20px; padding: 10px 16px; max-height: 120px; min-height: 40px; resize: none; font-family: inherit; font-size: 14px; outline: none; overflow-y: auto; }
        .chat-input:focus { border-color: #6366f1; }
        .chat-send-btn { width: 40px; height: 40px; border-radius: 50%; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background-color: #4f46e5; flex-shrink: 0; }
        .chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .typing-indicator { display: flex; gap: 4px; padding: 12px 16px; background-color: white; border: 1px solid #e5e7eb; border-radius: 18px; border-bottom-left-radius: 4px; width: fit-content; margin-bottom: 16px; }
        .typing-dot { width: 8px; height: 8px; background-color: #6366f1; border-radius: 50%; opacity: 0.7; animation: typing-dot 1.4s infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing-dot {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-8px); }
        }
        
        /* For handling markdown content in assistant messages */
        .message-content {
            font-size: 14px;
            line-height: 1.5;
        }
        
        .message-content p {
            margin-top: 0;
            margin-bottom: 0.75rem;
        }
        
        .message-content p:last-child {
            margin-bottom: 0;
        }
        
        .message-content ul, 
        .message-content ol {
            margin-top: 0.5rem;
            margin-bottom: 0.75rem;
            padding-left: 1.5rem;
        }
        
        .message-content ul li,
        .message-content ol li {
            margin-bottom: 0.25rem;
        }
        
        .message-content h1,
        .message-content h2,
        .message-content h3,
        .message-content h4 {
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        
        .message-content code {
            background-color: rgba(0, 0, 0, 0.05);
            padding: 0.1rem 0.3rem;
            border-radius: 3px;
            font-family: monospace;
        }
        
        .message-content pre {
            background-color: rgba(0, 0, 0, 0.05);
            padding: 0.75rem;
            border-radius: 3px;
            overflow-x: auto;
            margin: 0.75rem 0;
        }
        
        .message-content blockquote {
            border-left: 3px solid #e0e0e0;
            padding-left: 0.75rem;
            color: #555;
            margin: 0.75rem 0;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header" id="chatHeader">
            <div class="chat-brand">
                <div class="chat-logo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"></path>
                        <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"></path>
                    </svg>
                </div>
                <div>
                    <h3 class="chat-title" id="chatTitle">AI Assistant</h3>
                    <p class="chat-subtitle">Online</p>
                </div>
            </div>
            <button id="closeBtn" style="background: none; border: none; color: white; cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="chat-messages" id="chatMessages"></div>
        
        <div class="chat-input-container">
            <textarea id="chatInput" class="chat-input" placeholder="Type your message..." rows="1"></textarea>
            <button id="sendBtn" class="chat-send-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            </button>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Chat interface initializing...');
            
            // Get parameters from URL
            const urlParams = new URLSearchParams(window.location.search);
            const apiKey = urlParams.get('apiKey');
            let config = {};
            
            try {
                config = JSON.parse(decodeURIComponent(urlParams.get('config') || '{}'));
                console.log('Loaded config:', config);
            } catch (e) {
                console.error('Error parsing config:', e);
            }
            
            // Setup DOM elements
            const chatHeader = document.getElementById('chatHeader');
            const chatTitle = document.getElementById('chatTitle');
            const sendBtn = document.getElementById('sendBtn');
            const chatInput = document.getElementById('chatInput');
            const messagesContainer = document.getElementById('chatMessages');
            const closeBtn = document.getElementById('closeBtn');
            
            // Apply styling
            const primaryColor = config.primaryColor || '#4f46e5';
            chatHeader.style.backgroundColor = primaryColor;
            chatTitle.textContent = config.chatbotName || 'AI Assistant';
            sendBtn.style.backgroundColor = primaryColor;
            
            // Session tracking
            let sessionId = null;
            const messagesEndRef = document.createElement('div');
            messagesContainer.appendChild(messagesEndRef);
            
            // Auto-resize textarea
            chatInput.addEventListener('input', function() {
                // Reset height
                this.style.height = 'auto';
                // Set to scrollHeight (with max height limit)
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
            
            // Scroll to bottom of messages
            function scrollToBottom() {
                messagesEndRef.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Format timestamp
            function formatTimestamp(timestamp) {
                const date = new Date(timestamp);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            
            // Add message to the chat
            function addMessage(content, role, timestamp = new Date().toISOString(), isError = false) {
                const messageGroup = document.createElement('div');
                messageGroup.className = 'message-group ' + role;
                
                const bubble = document.createElement('div');
                bubble.className = 'message-bubble ' + role;
                
                if (isError) {
                    bubble.classList.add('error');
                }
                
                if (role === 'user') {
                    bubble.style.backgroundColor = primaryColor;
                    
                    // Plain text for user messages
                    bubble.textContent = content;
                } else {
                    // Use marked for markdown in assistant messages
                    if (window.marked && window.DOMPurify) {
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'message-content';
                        contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
                        bubble.appendChild(contentDiv);
                    } else {
                        bubble.textContent = content;
                    }
                }
                
                // Add timestamp
                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = formatTimestamp(timestamp);
                bubble.appendChild(timeDiv);
                
                messageGroup.appendChild(bubble);
                messagesContainer.appendChild(messageGroup);
                scrollToBottom();
                
                return { group: messageGroup, bubble: bubble };
            }
            
            // Add typing indicator
            function addTypingIndicator() {
                const typingGroup = document.createElement('div');
                typingGroup.className = 'message-group assistant';
                typingGroup.id = 'typing-indicator';
                
                const indicatorDiv = document.createElement('div');
                indicatorDiv.className = 'typing-indicator';
                
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'typing-dot';
                    indicatorDiv.appendChild(dot);
                }
                
                typingGroup.appendChild(indicatorDiv);
                messagesContainer.appendChild(typingGroup);
                scrollToBottom();
                
                return typingGroup;
            }
            
            // Remove typing indicator
        function removeTypingIndicator() {
                    const indicator = document.getElementById('typing-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                }
                
                // Create or update a streaming message
                function createOrUpdateStreamingMessage(content, messageId, isComplete = false) {
                    // Look for existing message with this ID
                    const existingBubble = document.querySelector(`[data-message-id="${messageId}"]`);
                    
                    if (existingBubble) {
                        // Update existing message
                        const contentDiv = existingBubble.querySelector('.message-content');
                        if (contentDiv) {
                            if (isComplete) {
                                contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
                            } else {
                                contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content + "▋")); // Add cursor
                            }
                        } else {
                            existingBubble.textContent = content;
                        }
                        scrollToBottom();
                        return existingBubble;
                    } else {
                        // Create new streaming message
                        const messageGroup = document.createElement('div');
                        messageGroup.className = 'message-group assistant';
                        
                        const bubble = document.createElement('div');
                        bubble.className = 'message-bubble assistant';
                        bubble.setAttribute('data-message-id', messageId);
                        
                        // Use marked for markdown
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'message-content';
                        contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content + "▋")); // Add cursor
                        bubble.appendChild(contentDiv);
                        
                        // Add timestamp
                        const timeDiv = document.createElement('div');
                        timeDiv.className = 'message-time';
                        timeDiv.textContent = formatTimestamp(new Date());
                        bubble.appendChild(timeDiv);
                        
                        messageGroup.appendChild(bubble);
                        messagesContainer.appendChild(messageGroup);
                        scrollToBottom();
                        
                        return bubble;
                    }
                }
                
                // Send message with streaming response
                async function sendMessage(message) {
                    if (!message.trim()) return;
                    
                    // Add user message to chat
                    addMessage(message, 'user');
                    chatInput.value = '';
                    chatInput.style.height = 'auto';
                    
                    // Disable input while processing
                    chatInput.disabled = true;
                    sendBtn.disabled = true;
                    
                    // Show typing indicator
                    const typingIndicator = addTypingIndicator();
                    
                    try {
                        // Prepare LLM settings if provided
                        let llmSettings = null;
                        if (config.llmProvider) {
                            llmSettings = {
                                llm_provider: config.llmProvider,
                                llm_model: config.llmModel
                            };
                        }
                        
                        // Prepare request data
                        const requestData = {
                            message: message,
                            session_id: sessionId
                        };
                        
                        // Add LLM settings if available
                        if (llmSettings) {
                            requestData.llm_settings = llmSettings;
                        }
                        
                        // Use the streaming API for a more responsive experience
                        const backendUrl = window.location.origin;
                        const apiUrl = `${backendUrl}/api/chatbot/message/stream`;
                        
                        // Create abort controller for potential cancellation
                        const controller = new AbortController();
                        const signal = controller.signal;
                        
                        // Start the fetch request
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': apiKey
                            },
                            body: JSON.stringify(requestData),
                            signal: signal
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        
                        // Process the streaming response
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let buffer = '';
                        let messageId = null;
                        let fullMessage = '';
                        
                        // Remove typing indicator once we start getting chunks
                        removeTypingIndicator();
                        
                        // Process the stream
                        while (true) {
                            const { done, value } = await reader.read();
                            
                            if (done) {
                                // Process any remaining data in buffer
                                if (buffer) {
                                    try {
                                        // Handle any remaining event data
                                        const lines = buffer.split('\\n\\n');
                                        lines.forEach(line => {
                                            if (line.startsWith('data: ')) {
                                                const eventData = line.substring(6);
                                                if (eventData && eventData !== '[DONE]') {
                                                    const data = JSON.parse(eventData);
                                                    
                                                    // Handle different message types
                                                    if (data.type === 'info') {
                                                        sessionId = data.session_id;
                                                    } else if (data.type === 'chunk') {
                                                        if (!messageId) messageId = data.message_id;
                                                        fullMessage += data.content;
                                                        createOrUpdateStreamingMessage(fullMessage, messageId);
                                                    } else if (data.type === 'complete') {
                                                        fullMessage = data.content;
                                                        createOrUpdateStreamingMessage(fullMessage, messageId, true);
                                                    } else if (data.type === 'done') {
                                                        // Final message with complete info
                                                    }
                                                }
                                            }
                                        });
                                    } catch (e) {
                                        console.error('Error parsing final SSE chunk:', e);
                                    }
                                }
                                break;
                            }
                            
                            // Decode the incoming chunk and add to buffer
                            const chunk = decoder.decode(value, { stream: true });
                            buffer += chunk;
                            
                            // Process complete events in buffer
                            const lines = buffer.split('\\n\\n');
                            buffer = lines.pop() || '';
                            
                            // Process each complete SSE event
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const eventData = line.substring(6);
                                    if (eventData && eventData !== '[DONE]') {
                                        try {
                                            const data = JSON.parse(eventData);
                                            
                                            // Handle different message types
                                            if (data.type === 'info') {
                                                sessionId = data.session_id;
                                            } else if (data.type === 'chunk') {
                                                if (!messageId) messageId = data.message_id;
                                                fullMessage += data.content;
                                                createOrUpdateStreamingMessage(fullMessage, messageId);
                                            } else if (data.type === 'complete') {
                                                fullMessage = data.content;
                                                createOrUpdateStreamingMessage(fullMessage, messageId, true);
                                            } else if (data.type === 'done') {
                                                // Message is complete, no need for further updates
                                                if (data.message && data.message.content) {
                                                    createOrUpdateStreamingMessage(data.message.content, messageId || data.message.id, true);
                                                }
                                            } else if (data.type === 'error') {
                                                throw new Error(data.error || 'Unknown error');
                                            }
                                        } catch (e) {
                                            console.error('Error parsing SSE chunk:', e);
                                        }
                                    }
                                }
                            }
                        }
                        
                    } catch (error) {
                        console.error('Error:', error);
                        removeTypingIndicator();
                        addMessage(
                            "I'm sorry, I encountered an error processing your request. Please try again later.",
                            'assistant',
                            new Date().toISOString(),
                            true
                        );
                    } finally {
                        // Re-enable input
                        chatInput.disabled = false;
                        sendBtn.disabled = false;
                        chatInput.focus();
                    }
                }
                
                // Event listeners
                sendBtn.addEventListener('click', () => sendMessage(chatInput.value));
                
                chatInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(chatInput.value);
                    }
                });
                
                closeBtn.addEventListener('click', () => {
                    window.parent.postMessage('closeChat', '*');
                });
                
                // Add welcome message
                addMessage(config.greeting || 'Hello! How can I help you today?', 'assistant');
                
                // Focus the input
                chatInput.focus();
                
                console.log('Chat interface ready');
            });
        </script>
    </body>
</html>
    """
    
    return HTMLResponse(content=html_content)