# backend/app/api/widget/widget_js.py
from fastapi import APIRouter, Response

router = APIRouter()

@router.get("/widget.js")
async def get_widget_js():
    """Serve the widget JavaScript file with localhost URLs"""
    
    widget_js = """
// Customate.ai Widget v1.0.0 (Development)
(function() {
    // Get configuration from global variable
    const config = window.customateConfig || {};
    
    // Default configuration with localhost URLs
    const defaultConfig = {
        apiUrl: 'http://localhost:8000',
        position: 'bottom-right',
        primaryColor: '#4f46e5',
        chatbotName: 'AI Assistant',
        greeting: 'Hello! How can I help you today?',
        enableTypingIndicator: true,
        enableSuggestions: true
    };
    
    // Merge configurations
    const mergedConfig = {...defaultConfig, ...config};
    
    // Ensure API key is provided
    if (!mergedConfig.apiKey) {
        console.error('Customate Widget Error: API key is required');
        return;
    }
    
    // Log configuration for debugging
    console.log('Widget initialized with config:', mergedConfig);
    
    // Fetch widget settings from server
    async function fetchWidgetSettings() {
        try {
            console.log('Fetching widget settings from:', `${mergedConfig.apiUrl}/api/chatbot/settings`);
            const response = await fetch(`${mergedConfig.apiUrl}/api/chatbot/settings`, {
                method: 'GET',
                headers: {
                    'X-API-Key': mergedConfig.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load widget settings: ${response.status}`);
            }
            
            const settings = await response.json();
            console.log('Widget settings loaded:', settings);
            return {...mergedConfig, ...settings};
        } catch (error) {
            console.warn('Failed to load widget settings:', error);
            return mergedConfig;
        }
    }
    
    // Initialize widget with configuration
    async function initWidget() {
        const settings = await fetchWidgetSettings();
        console.log('Initializing widget with settings:', settings);
        
        // Create widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'customate-widget-container';
        widgetContainer.style.position = 'fixed';
        widgetContainer.style.zIndex = '999999';
        
        // Set position based on configuration
        switch (settings.widget_position || settings.position) {
            case 'bottom-right':
                widgetContainer.style.bottom = '20px';
                widgetContainer.style.right = '20px';
                break;
            case 'bottom-left':
                widgetContainer.style.bottom = '20px';
                widgetContainer.style.left = '20px';
                break;
            case 'top-right':
                widgetContainer.style.top = '20px';
                widgetContainer.style.right = '20px';
                break;
            case 'top-left':
                widgetContainer.style.top = '20px';
                widgetContainer.style.left = '20px';
                break;
            default:
                widgetContainer.style.bottom = '20px';
                widgetContainer.style.right = '20px';
        }
        
        document.body.appendChild(widgetContainer);
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'customate-widget-toggle';
        toggleButton.style.width = '60px';
        toggleButton.style.height = '60px';
        toggleButton.style.borderRadius = '50%';
        toggleButton.style.background = settings.primary_color || settings.primaryColor;
        toggleButton.style.color = '#fff';
        toggleButton.style.border = 'none';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.2)';
        toggleButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        
        // Create chat container (hidden initially)
        const chatContainer = document.createElement('div');
        chatContainer.className = 'customate-chat-container';
        chatContainer.style.display = 'none';
        chatContainer.style.flexDirection = 'column';
        chatContainer.style.width = '350px';
        chatContainer.style.height = '500px';
        chatContainer.style.backgroundColor = '#fff';
        chatContainer.style.borderRadius = '12px';
        chatContainer.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.2)';
        chatContainer.style.overflow = 'hidden';
        
        // Create chat header
        const chatHeader = document.createElement('div');
        chatHeader.className = 'customate-chat-header';
        chatHeader.style.padding = '12px 16px';
        chatHeader.style.background = settings.primary_color || settings.primaryColor;
        chatHeader.style.color = '#fff';
        chatHeader.style.display = 'flex';
        chatHeader.style.justifyContent = 'space-between';
        chatHeader.style.alignItems = 'center';
        
        const headerTitle = document.createElement('span');
        headerTitle.textContent = settings.chatbot_name || settings.chatbotName;
        
        const closeButton = document.createElement('button');
        closeButton.style.background = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = '#fff';
        closeButton.style.cursor = 'pointer';
        closeButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        
        chatHeader.appendChild(headerTitle);
        chatHeader.appendChild(closeButton);
        
        // Create messages container
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'customate-messages-container';
        messagesContainer.style.flex = '1';
        messagesContainer.style.overflowY = 'auto';
        messagesContainer.style.padding = '16px';
        messagesContainer.style.backgroundColor = '#f5f5f5';
        
        // Add welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'customate-message assistant';
        welcomeMessage.style.marginBottom = '12px';
        
        const welcomeMessageBubble = document.createElement('div');
        welcomeMessageBubble.className = 'customate-message-bubble';
        welcomeMessageBubble.style.display = 'inline-block';
        welcomeMessageBubble.style.padding = '10px 14px';
        welcomeMessageBubble.style.borderRadius = '18px';
        welcomeMessageBubble.style.maxWidth = '80%';
        welcomeMessageBubble.style.backgroundColor = '#fff';
        welcomeMessageBubble.style.borderBottomLeftRadius = '4px';
        welcomeMessageBubble.textContent = settings.greeting_message || settings.greeting;
        
        welcomeMessage.appendChild(welcomeMessageBubble);
        messagesContainer.appendChild(welcomeMessage);
        
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'customate-input-container';
        inputContainer.style.display = 'flex';
        inputContainer.style.padding = '12px';
        inputContainer.style.borderTop = '1px solid #e5e7eb';
        
        const messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.placeholder = 'Type your message...';
        messageInput.style.flex = '1';
        messageInput.style.padding = '10px 14px';
        messageInput.style.border = '1px solid #e5e7eb';
        messageInput.style.borderRadius = '20px';
        messageInput.style.outline = 'none';
        
        const sendButton = document.createElement('button');
        sendButton.className = 'customate-send-button';
        sendButton.style.width = '40px';
        sendButton.style.height = '40px';
        sendButton.style.marginLeft = '8px';
        sendButton.style.borderRadius = '50%';
        sendButton.style.background = settings.primary_color || settings.primaryColor;
        sendButton.style.color = '#fff';
        sendButton.style.border = 'none';
        sendButton.style.cursor = 'pointer';
        sendButton.style.display = 'flex';
        sendButton.style.alignItems = 'center';
        sendButton.style.justifyContent = 'center';
        sendButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
        
        inputContainer.appendChild(messageInput);
        inputContainer.appendChild(sendButton);
        
        // Assemble chat container
        chatContainer.appendChild(chatHeader);
        chatContainer.appendChild(messagesContainer);
        chatContainer.appendChild(inputContainer);
        
        // Add elements to widget container
        widgetContainer.appendChild(toggleButton);
        widgetContainer.appendChild(chatContainer);
        
        // Session state
        let sessionId = null;
        const messages = [];
        
        // Event handlers
        toggleButton.addEventListener('click', () => {
            toggleButton.style.display = 'none';
            chatContainer.style.display = 'flex';
            messageInput.focus();
        });
        
        closeButton.addEventListener('click', () => {
            chatContainer.style.display = 'none';
            toggleButton.style.display = 'block';
        });
        
        // Send message function
        async function sendMessage(text) {
            if (!text.trim()) return;
            
            // Add user message to UI
            const userMessage = document.createElement('div');
            userMessage.className = 'customate-message user';
            userMessage.style.marginBottom = '12px';
            userMessage.style.textAlign = 'right';
            
            const userMessageBubble = document.createElement('div');
            userMessageBubble.className = 'customate-message-bubble';
            userMessageBubble.style.display = 'inline-block';
            userMessageBubble.style.padding = '10px 14px';
            userMessageBubble.style.borderRadius = '18px';
            userMessageBubble.style.maxWidth = '80%';
            userMessageBubble.style.backgroundColor = settings.primary_color || settings.primaryColor;
            userMessageBubble.style.color = '#fff';
            userMessageBubble.style.borderBottomRightRadius = '4px';
            userMessageBubble.textContent = text;
            
            userMessage.appendChild(userMessageBubble);
            messagesContainer.appendChild(userMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Show typing indicator if enabled
            let typingIndicator = null;
            if (settings.enable_typing_indicator || settings.enableTypingIndicator) {
                typingIndicator = document.createElement('div');
                typingIndicator.className = 'customate-message assistant typing';
                typingIndicator.style.marginBottom = '12px';
                
                const typingBubble = document.createElement('div');
                typingBubble.className = 'customate-message-bubble typing';
                typingBubble.style.display = 'inline-block';
                typingBubble.style.padding = '10px 14px';
                typingBubble.style.borderRadius = '18px';
                typingBubble.style.backgroundColor = '#fff';
                typingBubble.style.borderBottomLeftRadius = '4px';
                
                const dots = document.createElement('div');
                dots.style.display = 'flex';
                dots.style.alignItems = 'center';
                dots.style.justifyContent = 'center';
                dots.style.gap = '4px';
                
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('div');
                    dot.style.width = '6px';
                    dot.style.height = '6px';
                    dot.style.borderRadius = '50%';
                    dot.style.backgroundColor = '#aaa';
                    dot.style.animation = `customate-dot-pulse 1.5s infinite ${i * 0.2}s`;
                    dots.appendChild(dot);
                }
                
                typingBubble.appendChild(dots);
                typingIndicator.appendChild(typingBubble);
                messagesContainer.appendChild(typingIndicator);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // Add animation style if not already added
                if (!document.getElementById('customate-animations')) {
                    const style = document.createElement('style');
                    style.id = 'customate-animations';
                    style.textContent = `
                        @keyframes customate-dot-pulse {
                            0%, 60%, 100% { transform: translateY(0); }
                            30% { transform: translateY(-4px); }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            
            try {
                // Try chatbot endpoint first (which works for TestChatbot)
                console.log('Sending message to chatbot endpoint');
                const response = await fetch(`${mergedConfig.apiUrl}/api/chatbot/message`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': mergedConfig.apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: text,
                        session_id: sessionId
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to send message: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Update session ID
                if (data.session_id) {
                    sessionId = data.session_id;
                }
                
                // Remove typing indicator if it exists
                if (typingIndicator) {
                    messagesContainer.removeChild(typingIndicator);
                }
                
                // Add assistant message to UI
                const assistantMessage = document.createElement('div');
                assistantMessage.className = 'customate-message assistant';
                assistantMessage.style.marginBottom = '12px';
                
                const assistantMessageBubble = document.createElement('div');
                assistantMessageBubble.className = 'customate-message-bubble';
                assistantMessageBubble.style.display = 'inline-block';
                assistantMessageBubble.style.padding = '10px 14px';
                assistantMessageBubble.style.borderRadius = '18px';
                assistantMessageBubble.style.maxWidth = '80%';
                assistantMessageBubble.style.backgroundColor = '#fff';
                assistantMessageBubble.style.borderBottomLeftRadius = '4px';
                assistantMessageBubble.textContent = data.message.content;
                
                assistantMessage.appendChild(assistantMessageBubble);
                messagesContainer.appendChild(assistantMessage);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // Store messages for context
                messages.push(
                    { role: 'user', content: text },
                    { role: 'assistant', content: data.message.content }
                );
                
            } catch (error) {
                console.error('Error sending message:', error);
                
                // Remove typing indicator if it exists
                if (typingIndicator) {
                    messagesContainer.removeChild(typingIndicator);
                }
                
                // Show error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'customate-message assistant error';
                errorMessage.style.marginBottom = '12px';
                
                const errorMessageBubble = document.createElement('div');
                errorMessageBubble.className = 'customate-message-bubble error';
                errorMessageBubble.style.display = 'inline-block';
                errorMessageBubble.style.padding = '10px 14px';
                errorMessageBubble.style.borderRadius = '18px';
                errorMessageBubble.style.maxWidth = '80%';
                errorMessageBubble.style.backgroundColor = '#fee2e2';
                errorMessageBubble.style.color = '#b91c1c';
                errorMessageBubble.style.borderBottomLeftRadius = '4px';
                errorMessageBubble.textContent = 'Sorry, I encountered an error while processing your message. Please try again.';
                
                errorMessage.appendChild(errorMessageBubble);
                messagesContainer.appendChild(errorMessage);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
        
        // Input event handlers
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = messageInput.value.trim();
                if (text) {
                    sendMessage(text);
                    messageInput.value = '';
                }
            }
        });
        
        sendButton.addEventListener('click', () => {
            const text = messageInput.value.trim();
            if (text) {
                sendMessage(text);
                messageInput.value = '';
            }
        });
    }
    
    // Initialize the widget when the DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();
    """
    
    # Set appropriate headers for JavaScript
    headers = {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache, no-store, must-revalidate"
    }
    
    return Response(content=widget_js, headers=headers)