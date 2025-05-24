# backend/app/api/widget/widget_js.py

from fastapi import APIRouter, Response

router = APIRouter()

@router.get("/widget.js")
async def get_widget_js():
    """Serve the widget JavaScript file with both floating and inline mode support"""
    
    widget_js = """
// Customate.ai Widget v1.0.0
(function() {
    // Get configuration from global variable
    const config = window.customateConfig || {};
    
    // Default configuration with orange theme
    const defaultConfig = {
        apiUrl: 'http://localhost:8000',
        position: 'bottom-right',
        primaryColor: '#ea580c', // Orange-600
        chatbotName: 'AI Assistant',
        greeting: 'Hello! How can I help you today?',
        enableTypingIndicator: true,
        enableSuggestions: true,
        testMode: false,
        container: null
    };
    
    // Merge configurations
    const mergedConfig = {...defaultConfig, ...config};
    
    // Ensure API key is provided
    if (!mergedConfig.apiKey) {
        console.error('Customate Widget Error: API key is required');
        return;
    }
    
    // Simple markdown parser function
    function parseMarkdown(text) {
        if (!text) return '';
        
        // Bold text (e.g., **bold** or __bold__)
        let formattedText = text.replace(/(\*\*|__)(.*?)\\1/g, '<strong>$2</strong>');
        
        // Italic text (e.g., *italic* or _italic_)
        formattedText = formattedText.replace(/(\*|_)(.*?)\\1/g, '<em>$2</em>');
        
        // Line breaks
        formattedText = formattedText.replace(/\\n/g, '<br>');
        
        // Lists
        formattedText = formattedText.replace(/^\\s*-\\s+(.*?)$/gm, '<li>$1</li>');
        formattedText = formattedText.replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>');
        
        // Headers
        formattedText = formattedText.replace(/^##\\s+(.*?)$/gm, '<h2>$1</h2>');
        formattedText = formattedText.replace(/^###\\s+(.*?)$/gm, '<h3>$1</h3>');
        
        // Links [text](url)
        formattedText = formattedText.replace(/\\[(.*?)\\]\\((.*?)\\)/g, '<a href="$2" target="_blank">$1</a>');
        
        return formattedText;
    }

    // Test API connection
    async function testApiConnection() {
        try {
            console.log('Testing API connection to:', `${mergedConfig.apiUrl}/api/widget/test`);
            
            const response = await fetch(`${mergedConfig.apiUrl}/api/widget/test`, {
                method: 'GET',
                headers: {
                    'X-API-Key': mergedConfig.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API test failed: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✓ API connection successful:', result);
            return true;
        } catch (error) {
            console.error('✗ API connection failed:', error);
            return false;
        }
    }

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
            
            console.log('Settings response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Settings API error:', response.status, errorText);
                throw new Error(`Failed to load widget settings: ${response.status} - ${errorText}`);
            }
            
            const settings = await response.json();
            console.log('Widget settings loaded:', settings);
            return {...mergedConfig, ...settings};
        } catch (error) {
            console.warn('Failed to load widget settings:', error);
            console.log('Using default configuration');
            return mergedConfig;
        }
    }

    // CSS Styles for the widget with orange theme
    function injectStyles() {
        // Don't inject styles multiple times
        if (document.getElementById('customate-widget-styles')) {
            return;
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = 'customate-widget-styles';
        styleEl.innerHTML = `
            .customate-widget-container * {
                box-sizing: border-box;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            
            .customate-message-bubble {
                position: relative;
                padding: 12px 16px;
                border-radius: 18px;
                max-width: 85%;
                word-wrap: break-word;
                line-height: 1.5;
                font-size: 14px;
                margin-bottom: 16px;
            }
            
            /* Styles for markdown content */
            .customate-message-bubble strong {
                font-weight: 600;
            }
            
            .customate-message-bubble em {
                font-style: italic;
            }
            
            .customate-message-bubble h2 {
                font-size: 1.2em;
                margin: 0.5em 0;
                font-weight: 600;
            }
            
            .customate-message-bubble h3 {
                font-size: 1.1em;
                margin: 0.4em 0;
                font-weight: 600;
            }
            
            .customate-message-bubble ul {
                margin: 0.5em 0;
                padding-left: 1.5em;
            }
            
            .customate-message-bubble li {
                margin: 0.2em 0;
                list-style-type: disc;
            }
            
            .customate-message-bubble a {
                color: inherit;
                text-decoration: underline;
            }
            
            .customate-message-bubble a:hover {
                text-decoration: none;
            }
            
            /* Animation for typing indicator */
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
            
            /* Message positioning */
            .customate-message.user {
                display: flex;
                justify-content: flex-end;
            }
            
            .customate-message.user .customate-message-bubble {
                border-bottom-right-radius: 4px;
                margin-left: auto;
            }
            
            .customate-message.assistant {
                display: flex;
                justify-content: flex-start;
            }
            
            .customate-message.assistant .customate-message-bubble {
                border-bottom-left-radius: 4px;
                margin-right: auto;
            }
            
            /* Fade-in animation for new messages */
            @keyframes customate-fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .customate-message {
                animation: customate-fade-in 0.3s ease;
            }
            
            /* Orange theme focus styles */
            .customate-widget-container input:focus {
                outline: none;
                border-color: #ea580c;
                box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.1);
            }
            
            /* Spin animation for loading */
            @keyframes customate-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .customate-spin {
                animation: customate-spin 1s linear infinite;
            }
            
            /* Inline mode specific styles */
            .customate-widget-inline {
                position: relative !important;
                width: 100% !important;
                height: 100% !important;
                z-index: auto !important;
            }
            
            .customate-widget-inline .customate-chat-container {
                position: relative !important;
                display: flex !important;
                width: 100% !important;
                height: 100% !important;
            }
            
            /* Scrollbar styling */
            .customate-messages-container::-webkit-scrollbar {
                width: 6px;
            }
            
            .customate-messages-container::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }
            
            .customate-messages-container::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #ea580c, #f97316);
                border-radius: 3px;
            }
            
            .customate-messages-container::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #c2410c, #ea580c);
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Initialize widget with configuration
    async function initWidget() {
        console.log('Initializing Customate.ai widget...');
        console.log('Widget config:', mergedConfig);
        
        // Test API connection first
        const apiConnected = await testApiConnection();
        if (!apiConnected) {
            console.error('Cannot connect to API, widget may not function properly');
        }
        
        const settings = await fetchWidgetSettings();
        console.log('Final widget settings:', settings);
        
        // Inject styles
        injectStyles();
        
        // Determine if this is inline mode (test mode)
        const isInlineMode = settings.position === 'inline' || settings.testMode;
        const targetContainer = settings.container || (isInlineMode ? document.getElementById('customate-test-widget') : document.body);
        
        if (!targetContainer) {
            console.error('Customate Widget: Target container not found');
            if (isInlineMode) {
                // Show error in the expected container
                const errorContainer = document.getElementById('customate-test-widget');
                if (errorContainer) {
                    errorContainer.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center; color: #ef4444;">
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⚠️</div>
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">Widget Container Not Found</div>
                            <div style="font-size: 0.875rem; color: #6b7280;">The widget target container could not be located.</div>
                        </div>
                    `;
                }
            }
            return;
        }
        
        // Create widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.className = `customate-widget-container ${isInlineMode ? 'customate-widget-inline' : ''}`;
        
        if (isInlineMode) {
            // Inline mode styling
            widgetContainer.style.width = '100%';
            widgetContainer.style.height = '100%';
            widgetContainer.style.position = 'relative';
        } else {
            // Floating widget styling
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
        }
        
        widgetContainer.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        
        targetContainer.appendChild(widgetContainer);
        
        // Create toggle button (only for floating mode)
        let toggleButton = null;
        if (!isInlineMode) {
            toggleButton = document.createElement('button');
            toggleButton.className = 'customate-widget-toggle';
            toggleButton.style.width = '60px';
            toggleButton.style.height = '60px';
            toggleButton.style.borderRadius = '50%';
            toggleButton.style.background = settings.primary_color || settings.primaryColor || '#ea580c';
            toggleButton.style.color = '#fff';
            toggleButton.style.border = 'none';
            toggleButton.style.cursor = 'pointer';
            toggleButton.style.boxShadow = '0 2px 12px rgba(234, 88, 12, 0.3)';
            toggleButton.style.transition = 'transform 0.2s, box-shadow 0.2s';
            toggleButton.style.display = 'flex';
            toggleButton.style.alignItems = 'center';
            toggleButton.style.justifyContent = 'center';
            toggleButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path></svg>';
        }
        
        // Create chat container
        const chatContainer = document.createElement('div');
        chatContainer.className = 'customate-chat-container';
        
        if (isInlineMode) {
            // Inline mode - always visible, full size
            chatContainer.style.display = 'flex';
            chatContainer.style.flexDirection = 'column';
            chatContainer.style.width = '100%';
            chatContainer.style.height = '100%';
            chatContainer.style.backgroundColor = '#fff';
            chatContainer.style.borderRadius = '12px';
            chatContainer.style.boxShadow = '0 4px 32px rgba(0, 0, 0, 0.12)';
            chatContainer.style.overflow = 'hidden';
            chatContainer.style.border = '1px solid #e5e7eb';
        } else {
            // Floating mode - initially hidden
            chatContainer.style.display = 'none';
            chatContainer.style.flexDirection = 'column';
            chatContainer.style.width = '350px';
            chatContainer.style.height = '500px';
            chatContainer.style.backgroundColor = '#fff';
            chatContainer.style.borderRadius = '12px';
            chatContainer.style.boxShadow = '0 4px 32px rgba(0, 0, 0, 0.12)';
            chatContainer.style.overflow = 'hidden';
            chatContainer.style.border = '1px solid #e5e7eb';
        }
        
        // Create chat header with orange theme
        const chatHeader = document.createElement('div');
        chatHeader.className = 'customate-chat-header';
        chatHeader.style.padding = '16px 20px';
        chatHeader.style.background = `linear-gradient(135deg, ${settings.primary_color || settings.primaryColor || '#ea580c'}, #f97316)`;
        chatHeader.style.color = '#fff';
        chatHeader.style.display = 'flex';
        chatHeader.style.justifyContent = 'space-between';
        chatHeader.style.alignItems = 'center';
        chatHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        
        const headerContent = document.createElement('div');
        headerContent.style.display = 'flex';
        headerContent.style.alignItems = 'center';
        
        // Bot avatar
        const botAvatar = document.createElement('div');
        botAvatar.style.width = '32px';
        botAvatar.style.height = '32px';
        botAvatar.style.borderRadius = '50%';
        botAvatar.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        botAvatar.style.display = 'flex';
        botAvatar.style.alignItems = 'center';
        botAvatar.style.justifyContent = 'center';
        botAvatar.style.marginRight = '12px';
        botAvatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 18px; height: 18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>';
        
        const headerTitle = document.createElement('div');
        
        const titleText = document.createElement('div');
        titleText.style.fontWeight = '600';
        titleText.style.fontSize = '14px';
        titleText.textContent = settings.chatbot_name || settings.chatbotName;
        
        const statusText = document.createElement('div');
        statusText.style.fontSize = '12px';
        statusText.style.opacity = '0.9';
        statusText.style.display = 'flex';
        statusText.style.alignItems = 'center';
        statusText.innerHTML = '<span style="width: 6px; height: 6px; background: #22c55e; border-radius: 50%; margin-right: 6px;"></span>Online';
        
        headerTitle.appendChild(titleText);
        headerTitle.appendChild(statusText);
        headerContent.appendChild(botAvatar);
        headerContent.appendChild(headerTitle);
        
        // Close button (only for floating mode)
        let closeButton = null;
        if (!isInlineMode) {
            closeButton = document.createElement('button');
            closeButton.style.background = 'transparent';
            closeButton.style.border = 'none';
            closeButton.style.color = '#fff';
            closeButton.style.cursor = 'pointer';
            closeButton.style.padding = '6px';
            closeButton.style.display = 'flex';
            closeButton.style.alignItems = 'center';
            closeButton.style.justifyContent = 'center';
            closeButton.style.borderRadius = '6px';
            closeButton.style.transition = 'background 0.2s';
            closeButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            
            chatHeader.appendChild(headerContent);
            chatHeader.appendChild(closeButton);
        } else {
            // Test mode indicator
            const testIndicator = document.createElement('div');
            testIndicator.style.fontSize = '12px';
            testIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            testIndicator.style.padding = '4px 8px';
            testIndicator.style.borderRadius = '12px';
            testIndicator.textContent = 'Testing Mode';
            
            chatHeader.appendChild(headerContent);
            chatHeader.appendChild(testIndicator);
        }
        
        // Create messages container
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'customate-messages-container';
        messagesContainer.style.flex = '1';
        messagesContainer.style.overflowY = 'auto';
        messagesContainer.style.padding = '20px';
        messagesContainer.style.backgroundColor = '#f8fafc';
        messagesContainer.style.scrollBehavior = 'smooth';
        
        // Add welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'customate-message assistant';
        
        const welcomeMessageBubble = document.createElement('div');
        welcomeMessageBubble.className = 'customate-message-bubble';
        welcomeMessageBubble.style.backgroundColor = '#fff';
        welcomeMessageBubble.style.color = '#1f2937';
        welcomeMessageBubble.style.borderBottomLeftRadius = '4px';
        welcomeMessageBubble.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        welcomeMessageBubble.style.border = '1px solid #e5e7eb';
        
        // Apply markdown to greeting message
        welcomeMessageBubble.innerHTML = parseMarkdown(settings.greeting_message || settings.greeting);
        
        welcomeMessage.appendChild(welcomeMessageBubble);
        messagesContainer.appendChild(welcomeMessage);
        
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'customate-input-container';
        inputContainer.style.display = 'flex';
        inputContainer.style.padding = '16px 20px';
        inputContainer.style.borderTop = '1px solid #e5e7eb';
        inputContainer.style.backgroundColor = '#fff';
        inputContainer.style.alignItems = 'flex-end';
        inputContainer.style.gap = '12px';
        
        const messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.placeholder = 'Type your message...';
        messageInput.style.flex = '1';
        messageInput.style.padding = '12px 16px';
        messageInput.style.border = '1px solid #d1d5db';
        messageInput.style.borderRadius = '22px';
        messageInput.style.outline = 'none';
        messageInput.style.fontSize = '14px';
        messageInput.style.backgroundColor = '#f9fafb';
        messageInput.style.transition = 'all 0.2s';
        
        const sendButton = document.createElement('button');
        sendButton.className = 'customate-send-button';
        sendButton.style.width = '44px';
        sendButton.style.height = '44px';
        sendButton.style.borderRadius = '50%';
        sendButton.style.background = settings.primary_color || settings.primaryColor || '#ea580c';
        sendButton.style.color = '#fff';
        sendButton.style.border = 'none';
        sendButton.style.cursor = 'pointer';
        sendButton.style.display = 'flex';
        sendButton.style.alignItems = 'center';
        sendButton.style.justifyContent = 'center';
        sendButton.style.transition = 'all 0.2s';
        sendButton.style.boxShadow = '0 2px 8px rgba(234, 88, 12, 0.2)';
        sendButton.disabled = true;
        sendButton.style.opacity = '0.6';
        sendButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
        
        inputContainer.appendChild(messageInput);
        inputContainer.appendChild(sendButton);
        
        // Assemble chat container
        chatContainer.appendChild(chatHeader);
        chatContainer.appendChild(messagesContainer);
        chatContainer.appendChild(inputContainer);
        
        // Add elements to widget container
        if (toggleButton) {
            widgetContainer.appendChild(toggleButton);
        }
        widgetContainer.appendChild(chatContainer);
        
        // Session state
        let sessionId = null;
        let cancelStream = null;
        let isSending = false;
        
        // Event handlers
        if (toggleButton && closeButton) {
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
                toggleButton.style.boxShadow = '0 4px 16px rgba(234, 88, 12, 0.4)';
            });
            
            toggleButton.addEventListener('mouseout', () => {
                toggleButton.style.transform = 'scale(1)';
                toggleButton.style.boxShadow = '0 2px 12px rgba(234, 88, 12, 0.3)';
            });
            
            closeButton.addEventListener('mouseover', () => {
                closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            });
            
            closeButton.addEventListener('mouseout', () => {
                closeButton.style.backgroundColor = 'transparent';
            });
        }
        
        // Focus input in inline mode
        if (isInlineMode) {
            setTimeout(() => {
                messageInput.focus();
            }, 100);
        }
        
        // Common event handlers
        sendButton.addEventListener('mouseover', () => {
            if (!sendButton.disabled) {
                sendButton.style.transform = 'scale(1.05)';
                sendButton.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.3)';
            }
        });
        
        sendButton.addEventListener('mouseout', () => {
            sendButton.style.transform = 'scale(1)';
            sendButton.style.boxShadow = '0 2px 8px rgba(234, 88, 12, 0.2)';
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
            messageInput.style.borderColor = '#ea580c';
            messageInput.style.backgroundColor = '#fff';
            messageInput.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.1)';
        });
        
        messageInput.addEventListener('blur', () => {
            messageInput.style.borderColor = '#d1d5db';
            messageInput.style.backgroundColor = '#f9fafb';
            messageInput.style.boxShadow = 'none';
        });
        
        // Create and append a new message
        function appendMessage(content, isUser, isError = false) {
            const messageEl = document.createElement('div');
            messageEl.className = `customate-message ${isUser ? 'user' : 'assistant'}`;
            
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'customate-message-bubble';
            
            if (isUser) {
                bubbleEl.style.backgroundColor = settings.primary_color || settings.primaryColor || '#ea580c';
                bubbleEl.style.color = '#fff';
                bubbleEl.style.borderBottomRightRadius = '4px';
                bubbleEl.style.boxShadow = '0 1px 3px rgba(234, 88, 12, 0.2)';
                bubbleEl.textContent = content;
            } else if (isError) {
                bubbleEl.style.backgroundColor = '#fef2f2';
                bubbleEl.style.color = '#b91c1c';
                bubbleEl.style.borderBottomLeftRadius = '4px';
                bubbleEl.style.border = '1px solid #fecaca';
                bubbleEl.textContent = content;
            } else {
                bubbleEl.style.backgroundColor = '#fff';
                bubbleEl.style.color = '#1f2937';
                bubbleEl.style.borderBottomLeftRadius = '4px';
                bubbleEl.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                bubbleEl.style.border = '1px solid #e5e7eb';
                bubbleEl.innerHTML = parseMarkdown(content);
            }
            
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
            
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'customate-message-bubble';
            bubbleEl.style.backgroundColor = '#fff';
            bubbleEl.style.borderBottomLeftRadius = '4px';
            bubbleEl.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            bubbleEl.style.border = '1px solid #e5e7eb';
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
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            return indicatorEl;
        }
        
        // Send message function with streaming support
        async function sendMessage(text) {
            if (!text.trim() || isSending) return;
            
            isSending = true;
            messageInput.disabled = true;
            sendButton.disabled = true;
            sendButton.innerHTML = '<svg class="customate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 12a4 4 0 11-8 0m8 0H8"/></svg>';
            sendButton.style.opacity = '0.8';
            
            appendMessage(text, true);
            
            const typingIndicator = createTypingIndicator();
            
            if (cancelStream) {
                cancelStream();
                cancelStream = null;
            }
            
            try {
                const controller = new AbortController();
                cancelStream = () => controller.abort();
                
                const response = await fetch(`${mergedConfig.apiUrl}/api/widget/message/stream`, {
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
                let responseContent = '';
                let botMessageEl = null;
                
                async function processStream() {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            
                            if (done) break;
                            
                            buffer += decoder.decode(value, { stream: true });
                            
                            const lines = buffer.split('\\n\\n');
                            buffer = lines.pop() || '';
                            
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    try {
                                        const data = JSON.parse(line.substring(6));
                                        
                                        if (data.type === 'info') {
                                            sessionId = data.session_id;
                                        } else if (data.type === 'chunk') {
                                            if (!botMessageEl) {
                                                if (typingIndicator) {
                                                    messagesContainer.removeChild(typingIndicator);
                                                }
                                                botMessageEl = appendMessage('', false);
                                            }
                                            
                                            responseContent += data.content;
                                            botMessageEl.bubble.innerHTML = parseMarkdown(responseContent);
                                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                        } else if (data.type === 'complete') {
                                            if (botMessageEl) {
                                                responseContent = data.content;
                                                botMessageEl.bubble.innerHTML = parseMarkdown(responseContent);
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
                
                if (typingIndicator && typingIndicator.parentNode) {
                    messagesContainer.removeChild(typingIndicator);
                }
                
                appendMessage('Sorry, I encountered an error while processing your message. Please try again.', false, true);
            } finally {
                isSending = false;
                messageInput.disabled = false;
                messageInput.value = '';
                messageInput.focus();
                sendButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
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
        
        // Expose widget methods for external control (test mode)
        if (isInlineMode) {
            window.customateWidget = {
                reset: () => {
                    messagesContainer.innerHTML = '';
                    messagesContainer.appendChild(welcomeMessage);
                    sessionId = null;
                },
                sendMessage: sendMessage
            };
        }
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