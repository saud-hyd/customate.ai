# backend/app/api/widget/widget_js.py
from fastapi import APIRouter, Response

# Create router without prefix - we'll add the prefix when including it
router = APIRouter()

# Change route to match the expected path in the request
@router.get("/widget.js")
async def get_widget_js():
    """Serve the widget JavaScript file with improved implementation"""
    
    widget_js = """
// Customate.ai Widget v1.0.0
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
            console.log('Fetching widget settings from:', `${mergedConfig.apiUrl}/api/widget/settings`);
            const response = await fetch(`${mergedConfig.apiUrl}/api/widget/settings`, {
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

    // CSS Styles for the widget
    function injectStyles() {
        const styleEl = document.createElement('style');
        styleEl.id = 'customate-widget-styles';
        styleEl.innerHTML = `
            @keyframes customate-bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            
            .customate-typing-indicator {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .customate-typing-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #aaa;
                animation: customate-bounce 1.4s infinite ease-in-out both;
            }
            
            .customate-typing-dot:nth-child(1) { animation-delay: 0s; }
            .customate-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .customate-typing-dot:nth-child(3) { animation-delay: 0.4s; }
            
            .customate-widget-container * {
                box-sizing: border-box;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            
            .customate-message-bubble {
                position: relative;
                padding: 12px 16px;
                border-radius: 18px;
                max-width: 100%;
                word-wrap: break-word;
                line-height: 1.5;
                font-size: 14px;
            }
            
            .customate-message.user .customate-message-bubble {
                border-bottom-right-radius: 4px;
            }
            
            .customate-message.assistant .customate-message-bubble {
                border-bottom-left-radius: 4px;
            }
            
            /* Fade-in animation for new messages */
            @keyframes customate-fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .customate-message {
                animation: customate-fade-in 0.3s ease;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Initialize widget with configuration
    async function initWidget() {
        const settings = await fetchWidgetSettings();
        console.log('Initializing widget with settings:', settings);
        
        // Inject styles
        injectStyles();
        
        // Create widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'customate-widget-container';
        widgetContainer.style.position = 'fixed';
        widgetContainer.style.zIndex = '999999';
        widgetContainer.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        
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
        toggleButton.style.transition = 'transform 0.2s';
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
        chatContainer.style.boxShadow = '0 2px 24px rgba(0, 0, 0, 0.15)';
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
        headerTitle.style.fontWeight = '500';
        headerTitle.textContent = settings.chatbot_name || settings.chatbotName;
        
        const closeButton = document.createElement('button');
        closeButton.style.background = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = '#fff';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '4px';
        closeButton.style.display = 'flex';
        closeButton.style.alignItems = 'center';
        closeButton.style.justifyContent = 'center';
        closeButton.style.borderRadius = '4px';
        closeButton.style.transition = 'background 0.2s';
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
        messagesContainer.style.scrollBehavior = 'smooth';
        
        // Add welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'customate-message assistant';
        welcomeMessage.style.marginBottom = '16px';
        welcomeMessage.style.display = 'flex';
        welcomeMessage.style.justifyContent = 'flex-start';
        
        const welcomeMessageBubble = document.createElement('div');
        welcomeMessageBubble.className = 'customate-message-bubble';
        welcomeMessageBubble.style.backgroundColor = '#fff';
        welcomeMessageBubble.style.color = '#333';
        welcomeMessageBubble.style.borderBottomLeftRadius = '4px';
        welcomeMessageBubble.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
        welcomeMessageBubble.textContent = settings.greeting_message || settings.greeting;
        
        welcomeMessage.appendChild(welcomeMessageBubble);
        messagesContainer.appendChild(welcomeMessage);
        
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'customate-input-container';
        inputContainer.style.display = 'flex';
        inputContainer.style.padding = '12px 16px';
        inputContainer.style.borderTop = '1px solid #e5e7eb';
        inputContainer.style.backgroundColor = '#fff';
        
        const messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.placeholder = 'Type your message...';
        messageInput.style.flex = '1';
        messageInput.style.padding = '12px 16px';
        messageInput.style.border = '1px solid #e5e7eb';
        messageInput.style.borderRadius = '20px';
        messageInput.style.outline = 'none';
        messageInput.style.fontSize = '14px';
        messageInput.style.transition = 'border-color 0.2s';
        
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
        sendButton.style.transition = 'opacity 0.2s';
        sendButton.disabled = true;
        sendButton.style.opacity = '0.6';
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
        let cancelStream = null;
        let isSending = false;
        
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
        
        // Add hover effects
        toggleButton.addEventListener('mouseover', () => {
            toggleButton.style.transform = 'scale(1.05)';
        });
        
        toggleButton.addEventListener('mouseout', () => {
            toggleButton.style.transform = 'scale(1)';
        });
        
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
        
        // Handle input changes
        messageInput.addEventListener('input', () => {
            if (messageInput.value.trim()) {
                sendButton.disabled = false;
                sendButton.style.opacity = '1';
            } else {
                sendButton.disabled = true;
                sendButton.style.opacity = '0.6';
            }
        });
        
        messageInput.addEventListener('focus', () => {
            messageInput.style.borderColor = settings.primary_color || settings.primaryColor;
        });
        
        messageInput.addEventListener('blur', () => {
            messageInput.style.borderColor = '#e5e7eb';
        });
        
        // Create and append a new message
        function appendMessage(content, isUser, isError = false) {
            const messageEl = document.createElement('div');
            messageEl.className = `customate-message ${isUser ? 'user' : 'assistant'}`;
            messageEl.style.marginBottom = '16px';
            messageEl.style.display = 'flex';
            messageEl.style.justifyContent = isUser ? 'flex-end' : 'flex-start';
            
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'customate-message-bubble';
            
            if (isUser) {
                bubbleEl.style.backgroundColor = settings.primary_color || settings.primaryColor;
                bubbleEl.style.color = '#fff';
                bubbleEl.style.borderBottomRightRadius = '4px';
            } else if (isError) {
                bubbleEl.style.backgroundColor = '#fee2e2';
                bubbleEl.style.color = '#b91c1c';
                bubbleEl.style.borderBottomLeftRadius = '4px';
            } else {
                bubbleEl.style.backgroundColor = '#fff';
                bubbleEl.style.color = '#333';
                bubbleEl.style.borderBottomLeftRadius = '4px';
                bubbleEl.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
            }
            
            bubbleEl.textContent = content;
            messageEl.appendChild(bubbleEl);
            messagesContainer.appendChild(messageEl);
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            return {
                element: messageEl,
                bubble: bubbleEl
            };
        }
        
        // Create typing indicator
        function createTypingIndicator() {
            const indicatorEl = document.createElement('div');
            indicatorEl.className = 'customate-message assistant typing';
            indicatorEl.style.marginBottom = '16px';
            indicatorEl.style.display = 'flex';
            indicatorEl.style.justifyContent = 'flex-start';
            
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'customate-message-bubble';
            bubbleEl.style.backgroundColor = '#fff';
            bubbleEl.style.borderBottomLeftRadius = '4px';
            bubbleEl.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
            bubbleEl.style.display = 'flex';
            bubbleEl.style.padding = '14px 16px';
            
            const indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'customate-typing-indicator';
            
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'customate-typing-dot';
                indicatorContainer.appendChild(dot);
            }
            
            bubbleEl.appendChild(indicatorContainer);
            indicatorEl.appendChild(bubbleEl);
            messagesContainer.appendChild(indicatorEl);
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            return indicatorEl;
        }
        
        // Send message function - improved with streaming
        async function sendMessage(text) {
            if (!text.trim() || isSending) return;
            
            // Set sending state
            isSending = true;
            messageInput.disabled = true;
            sendButton.disabled = true;
            sendButton.innerHTML = '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 12a4 4 0 11-8 0m8 0H8"/></svg>';
            sendButton.style.opacity = '0.7';
            
            // Add user message
            appendMessage(text, true);
            
            // Create typing indicator
            const typingIndicator = createTypingIndicator();
            
            // Cancel previous stream if it exists
            if (cancelStream) {
                cancelStream();
                cancelStream = null;
            }
            
            try {
                // Stream response using fetch and ReadableStream
                const controller = new AbortController();
                cancelStream = () => controller.abort();
                
                const response = await fetch(`${mergedConfig.apiUrl}/api/chatbot/message/stream`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': mergedConfig.apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: text,
                        session_id: sessionId
                    }),
                    signal: controller.signal
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status}`);
                }
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                let buffer = '';
                let tempMessageId = null;
                let responseContent = '';
                let botMessageEl = null;
                
                // Process the stream
                async function processStream() {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            
                            if (done) {
                                break;
                            }
                            
                            // Decode chunk and add to buffer
                            buffer += decoder.decode(value, { stream: true });
                            
                            // Process events in buffer
                            const lines = buffer.split('\\n\\n');
                            buffer = lines.pop() || '';
                            
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    try {
                                        const data = JSON.parse(line.substring(6));
                                        
                                        // Handle different message types
                                        if (data.type === 'info') {
                                            sessionId = data.session_id;
                                        } else if (data.type === 'chunk') {
                                            // Remove typing indicator on first chunk
                                            if (!botMessageEl) {
                                                if (typingIndicator) {
                                                    messagesContainer.removeChild(typingIndicator);
                                                }
                                                botMessageEl = appendMessage('', false);
                                                tempMessageId = data.message_id;
                                            }
                                            
                                            responseContent += data.content;
                                            botMessageEl.bubble.textContent = responseContent;
                                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                        } else if (data.type === 'complete') {
                                            // Update with complete response
                                            if (botMessageEl) {
                                                responseContent = data.content;
                                                botMessageEl.bubble.textContent = responseContent;
                                            }
                                        } else if (data.type === 'error') {
                                            throw new Error(data.error || 'Unknown error');
                                        }
                                    } catch (e) {
                                        console.error('Error parsing stream data:', e);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        if (e.name !== 'AbortError') {
                            console.error('Error processing stream:', e);
                            throw e;
                        }
                    }
                }
                
                await processStream();
                
            } catch (error) {
                console.error('Error sending message:', error);
                
                // Remove typing indicator
                if (typingIndicator && typingIndicator.parentNode) {
                    messagesContainer.removeChild(typingIndicator);
                }
                
                // Show error message
                appendMessage('Sorry, I encountered an error while processing your message. Please try again.', false, true);
            } finally {
                // Reset UI state
                isSending = false;
                messageInput.disabled = false;
                messageInput.value = '';
                messageInput.focus();
                sendButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
                sendButton.style.opacity = '0.6';
                sendButton.disabled = true;
            }
        }
        
        // Input event handlers
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = messageInput.value.trim();
                if (text) {
                    sendMessage(text);
                }
            }
        });
        
        sendButton.addEventListener('click', () => {
            const text = messageInput.value.trim();
            if (text) {
                sendMessage(text);
            }
        });
        
        // Add spin animation style
        const spinStyle = document.createElement('style');
        spinStyle.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .customate-send-button svg.spin {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(spinStyle);
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