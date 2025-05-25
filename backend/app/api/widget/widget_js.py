# backend/app/api/widget/widget_js.py

from fastapi import APIRouter, Response

router = APIRouter()

@router.get("/widget.js")
async def get_widget_js():
    """Serve the widget JavaScript file with enhanced settings synchronization"""
    
    widget_js = """
// Customate.ai Widget v2.0.0 - Enhanced with Settings Sync
(function() {
    // Get configuration from global variable
    const config = window.customateConfig || {};
    
    // Default configuration with orange theme
    const defaultConfig = {
        apiUrl: 'http://localhost:8000',
        position: 'bottom-right',
        primaryColor: '#ea580c',
        chatbotName: 'AI Assistant',
        greeting: 'Hello! How can I help you today?',
        enableTypingIndicator: true,
        enableSuggestions: true,
        testMode: false,
        container: null,
        settingsSyncInterval: 30000 // 30 seconds
    };
    
    // Merge configurations
    let mergedConfig = {...defaultConfig, ...config};
    let lastSettingsHash = '';
    let settingsSyncTimer = null;
    
    // Ensure API key is provided
    if (!mergedConfig.apiKey) {
        console.error('Customate Widget Error: API key is required');
        return;
    }
    
    // Simple markdown parser function
    function parseMarkdown(text) {
        if (!text) return '';
        
        let formattedText = text
            .replace(/(\*\*|__)(.*?)\\1/g, '<strong>$2</strong>')
            .replace(/(\*|_)(.*?)\\1/g, '<em>$2</em>')
            .replace(/\\n/g, '<br>')
            .replace(/^\\s*-\\s+(.*?)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
            .replace(/^##\\s+(.*?)$/gm, '<h2>$1</h2>')
            .replace(/^###\\s+(.*?)$/gm, '<h3>$1</h3>')
            .replace(/\\[(.*?)\\]\\((.*?)\\)/g, '<a href="$2" target="_blank">$1</a>');
        
        return formattedText;
    }

    // Test API connection
    async function testApiConnection() {
        try {
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
            
            return true;
        } catch (error) {
            console.error('✗ API connection failed:', error);
            return false;
        }
    }

    // Fetch widget settings from server with sync detection
    async function fetchWidgetSettings() {
        try {
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
            
            // Calculate settings hash for change detection
            const settingsHash = JSON.stringify(settings);
            const settingsChanged = lastSettingsHash && lastSettingsHash !== settingsHash;
            lastSettingsHash = settingsHash;
            
            // Merge with current config
            const updatedConfig = {
                ...mergedConfig,
                primaryColor: settings.primary_color || mergedConfig.primaryColor,
                chatbotName: settings.chatbot_name || mergedConfig.chatbotName,
                greeting: settings.greeting_message || mergedConfig.greeting,
                widgetPosition: settings.widget_position || mergedConfig.widgetPosition,
                enableSuggestions: settings.enable_suggestions !== undefined ? settings.enable_suggestions : mergedConfig.enableSuggestions,
                showTypingIndicator: settings.show_typing_indicator !== undefined ? settings.show_typing_indicator : mergedConfig.showTypingIndicator,
                llmProvider: settings.llm_provider || 'deepseek',
                llmModel: settings.llm_model || 'deepseek-chat'
            };
            
            return { settings: updatedConfig, changed: settingsChanged };
        } catch (error) {
            console.warn('Failed to load widget settings:', error);
            return { settings: mergedConfig, changed: false };
        }
    }

    // Start periodic settings sync
    function startSettingsSync() {
        if (settingsSyncTimer) {
            clearInterval(settingsSyncTimer);
        }
        
        settingsSyncTimer = setInterval(async () => {
            try {
                const result = await fetchWidgetSettings();
                if (result.changed) {
                    console.log('🔄 Settings changed, reloading widget...');
                    mergedConfig = result.settings;
                    
                    // Trigger widget reload with new settings
                    if (window.customateWidgetInstance) {
                        window.customateWidgetInstance.updateSettings(result.settings);
                    }
                }
            } catch (error) {
                console.warn('Settings sync error:', error);
            }
        }, mergedConfig.settingsSyncInterval);
    }

    // CSS Styles for the widget with enhanced theming
    function injectStyles() {
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
            
            @keyframes customate-fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .customate-message {
                animation: customate-fade-in 0.3s ease;
            }
            
            .customate-widget-container input:focus {
                outline: none;
                border-color: var(--primary-color, #ea580c);
                box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.1);
            }
            
            @keyframes customate-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .customate-spin {
                animation: customate-spin 1s linear infinite;
            }
            
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
            
            .customate-messages-container::-webkit-scrollbar {
                width: 6px;
            }
            
            .customate-messages-container::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }
            
            .customate-messages-container::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, var(--primary-color, #ea580c), #f97316);
                border-radius: 3px;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Main widget class with settings sync
    class CustomateWidget {
        constructor(settings) {
            this.settings = settings;
            this.sessionId = null;
            this.isInlineMode = settings.position === 'inline' || settings.testMode;
            this.container = null;
            this.chatContainer = null;
            this.messagesContainer = null;
            this.messageInput = null;
            this.sendButton = null;
            this.isSending = false;
        }
        
        async init() {
            console.log('🚀 Initializing Customate Widget v2.0.0...');
            
            // Test API connection
            const apiConnected = await testApiConnection();
            if (!apiConnected) {
                console.error('Cannot connect to API, widget may not function properly');
            }
            
            // Load fresh settings
            const result = await fetchWidgetSettings();
            this.settings = result.settings;
            
            // Inject styles with theme
            this.injectThemedStyles();
            
            // Create widget UI
            this.createWidgetUI();
            
            // Start settings sync
            if (!this.isInlineMode) {
                startSettingsSync();
            }
            
            console.log('✅ Widget initialized successfully');
        }
        
        injectThemedStyles() {
            injectStyles();
            
            // Inject theme-specific CSS variables
            const themeStyle = document.getElementById('customate-theme-vars') || document.createElement('style');
            themeStyle.id = 'customate-theme-vars';
            themeStyle.innerHTML = `
                :root {
                    --primary-color: ${this.settings.primaryColor};
                }
            `;
            if (!document.getElementById('customate-theme-vars')) {
                document.head.appendChild(themeStyle);
            }
        }
        
        createWidgetUI() {
            const targetContainer = this.settings.container || 
                (this.isInlineMode ? document.getElementById('customate-test-widget') : document.body);
            
            if (!targetContainer) {
                console.error('Widget target container not found');
                return;
            }
            
            // Create main container
            this.container = document.createElement('div');
            this.container.className = `customate-widget-container ${this.isInlineMode ? 'customate-widget-inline' : ''}`;
            
            if (this.isInlineMode) {
                this.container.style.cssText = 'width: 100%; height: 100%; position: relative;';
            } else {
                this.container.style.cssText = `
                    position: fixed;
                    z-index: 999999;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    ${this.getPositionStyles()}
                `;
            }
            
            targetContainer.appendChild(this.container);
            
            // Create toggle button (floating mode only)
            if (!this.isInlineMode) {
                this.createToggleButton();
            }
            
            // Create chat container
            this.createChatContainer();
        }
        
        getPositionStyles() {
            const position = this.settings.widgetPosition || this.settings.position || 'bottom-right';
            switch (position) {
                case 'bottom-left': return 'bottom: 20px; left: 20px;';
                case 'top-right': return 'top: 20px; right: 20px;';
                case 'top-left': return 'top: 20px; left: 20px;';
                default: return 'bottom: 20px; right: 20px;';
            }
        }
        
        createToggleButton() {
            const toggleButton = document.createElement('button');
            toggleButton.className = 'customate-widget-toggle';
            toggleButton.style.cssText = `
                width: 60px; height: 60px; border-radius: 50%;
                background: ${this.settings.primaryColor}; color: #fff;
                border: none; cursor: pointer;
                box-shadow: 0 2px 12px rgba(234, 88, 12, 0.3);
                transition: transform 0.2s, box-shadow 0.2s;
                display: flex; align-items: center; justify-content: center;
            `;
            toggleButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path></svg>';
            
            toggleButton.addEventListener('click', () => this.toggleChat());
            this.container.appendChild(toggleButton);
            this.toggleButton = toggleButton;
        }
        
        createChatContainer() {
            this.chatContainer = document.createElement('div');
            this.chatContainer.className = 'customate-chat-container';
            
            const containerStyles = this.isInlineMode ? `
                display: flex; flex-direction: column; width: 100%; height: 100%;
                background-color: #fff; border-radius: 12px; overflow: hidden;
                box-shadow: 0 4px 32px rgba(0, 0, 0, 0.12); border: 1px solid #e5e7eb;
            ` : `
                display: none; flex-direction: column; width: 350px; height: 500px;
                background-color: #fff; border-radius: 12px; overflow: hidden;
                box-shadow: 0 4px 32px rgba(0, 0, 0, 0.12); border: 1px solid #e5e7eb;
            `;
            
            this.chatContainer.style.cssText = containerStyles;
            
            this.createChatHeader();
            this.createMessagesContainer();
            this.createInputContainer();
            
            this.container.appendChild(this.chatContainer);
        }
        
        createChatHeader() {
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 16px 20px; 
                background: linear-gradient(135deg, ${this.settings.primaryColor}, #f97316);
                color: #fff; display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;
            
            const headerContent = document.createElement('div');
            headerContent.style.cssText = 'display: flex; align-items: center;';
            
            // Bot avatar
            const avatar = document.createElement('div');
            avatar.style.cssText = `
                width: 32px; height: 32px; border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.2);
                display: flex; align-items: center; justify-content: center; margin-right: 12px;
            `;
            avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 18px; height: 18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>';
            
            const titleContainer = document.createElement('div');
            const title = document.createElement('div');
            title.style.cssText = 'font-weight: 600; font-size: 14px;';
            title.textContent = this.settings.chatbotName;
            
            const status = document.createElement('div');
            status.style.cssText = 'font-size: 12px; opacity: 0.9; display: flex; align-items: center;';
            status.innerHTML = '<span style="width: 6px; height: 6px; background: #22c55e; border-radius: 50%; margin-right: 6px;"></span>Online';
            
            titleContainer.appendChild(title);
            titleContainer.appendChild(status);
            headerContent.appendChild(avatar);
            headerContent.appendChild(titleContainer);
            
            header.appendChild(headerContent);
            
            // Close button (floating mode only)
            if (!this.isInlineMode) {
                const closeButton = document.createElement('button');
                closeButton.style.cssText = `
                    background: transparent; border: none; color: #fff; cursor: pointer;
                    padding: 6px; display: flex; align-items: center; justify-content: center;
                    border-radius: 6px; transition: background 0.2s;
                `;
                closeButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                closeButton.addEventListener('click', () => this.toggleChat());
                header.appendChild(closeButton);
            } else {
                // Test mode indicator
                const testIndicator = document.createElement('div');
                testIndicator.style.cssText = `
                    font-size: 12px; background-color: rgba(255, 255, 255, 0.2);
                    padding: 4px 8px; border-radius: 12px;
                `;
                testIndicator.textContent = 'Testing Mode';
                header.appendChild(testIndicator);
            }
            
            this.chatContainer.appendChild(header);
        }
        
        createMessagesContainer() {
            this.messagesContainer = document.createElement('div');
            this.messagesContainer.className = 'customate-messages-container';
            this.messagesContainer.style.cssText = `
                flex: 1; overflow-y: auto; padding: 20px; background-color: #f8fafc;
                scroll-behavior: smooth;
            `;
            
            // Add welcome message
            this.addWelcomeMessage();
            
            this.chatContainer.appendChild(this.messagesContainer);
        }
        
        addWelcomeMessage() {
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'customate-message assistant';
            
            const bubble = document.createElement('div');
            bubble.className = 'customate-message-bubble';
            bubble.style.cssText = `
                background-color: #fff; color: #1f2937; border-bottom-left-radius: 4px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;
            `;
            bubble.innerHTML = parseMarkdown(this.settings.greeting);
            
            welcomeMessage.appendChild(bubble);
            this.messagesContainer.appendChild(welcomeMessage);
        }
        
        createInputContainer() {
            const inputContainer = document.createElement('div');
            inputContainer.style.cssText = `
                display: flex; padding: 16px 20px; border-top: 1px solid #e5e7eb;
                background-color: #fff; align-items: flex-end; gap: 12px;
            `;
            
            this.messageInput = document.createElement('input');
            this.messageInput.type = 'text';
            this.messageInput.placeholder = 'Type your message...';
            this.messageInput.style.cssText = `
                flex: 1; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 22px;
                outline: none; font-size: 14px; background-color: #f9fafb; transition: all 0.2s;
            `;
            
            this.sendButton = document.createElement('button');
            this.sendButton.style.cssText = `
                width: 44px; height: 44px; border-radius: 50%; background: ${this.settings.primaryColor};
                color: #fff; border: none; cursor: pointer; display: flex; align-items: center;
                justify-content: center; transition: all 0.2s; box-shadow: 0 2px 8px rgba(234, 88, 12, 0.2);
                opacity: 0.6;
            `;
            this.sendButton.disabled = true;
            this.sendButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
            
            this.setupInputHandlers();
            
            inputContainer.appendChild(this.messageInput);
            inputContainer.appendChild(this.sendButton);
            this.chatContainer.appendChild(inputContainer);
        }
        
        setupInputHandlers() {
            this.messageInput.addEventListener('input', () => {
                const hasText = this.messageInput.value.trim().length > 0;
                this.sendButton.disabled = !hasText || this.isSending;
                this.sendButton.style.opacity = hasText && !this.isSending ? '1' : '0.6';
            });
            
            this.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !this.isSending) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            this.sendButton.addEventListener('click', () => {
                if (!this.isSending) this.sendMessage();
            });
        }
        
        toggleChat() {
            if (this.isInlineMode) return;
            
            const isVisible = this.chatContainer.style.display === 'flex';
            this.chatContainer.style.display = isVisible ? 'none' : 'flex';
            this.toggleButton.style.display = isVisible ? 'block' : 'none';
            
            if (!isVisible) {
                this.messageInput.focus();
            }
        }
        
        async sendMessage() {
            const text = this.messageInput.value.trim();
            if (!text || this.isSending) return;
            
            this.isSending = true;
            this.messageInput.disabled = true;
            this.sendButton.disabled = true;
            this.sendButton.innerHTML = '<svg class="customate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 12a4 4 0 11-8 0m8 0H8"/></svg>';
            
            this.appendMessage(text, true);
            
            const typingIndicator = this.createTypingIndicator();
            
            try {
                const response = await fetch(`${this.settings.apiUrl}/api/widget/message/stream`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': this.settings.apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: text,
                        session_id: this.sessionId
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status}`);
                }
                
                await this.processStreamingResponse(response, typingIndicator);
                
            } catch (error) {
                console.error('Error sending message:', error);
                if (typingIndicator && typingIndicator.parentNode) {
                    this.messagesContainer.removeChild(typingIndicator);
                }
                this.appendMessage('Sorry, I encountered an error. Please try again.', false, true);
            } finally {
                this.resetInputState();
            }
        }
        
        async processStreamingResponse(response, typingIndicator) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let responseContent = '';
            let botMessageEl = null;
            
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
                                this.sessionId = data.session_id;
                            } else if (data.type === 'chunk') {
                                if (!botMessageEl) {
                                    if (typingIndicator) {
                                        this.messagesContainer.removeChild(typingIndicator);
                                    }
                                    botMessageEl = this.appendMessage('', false);
                                }
                                responseContent += data.content;
                                botMessageEl.bubble.innerHTML = parseMarkdown(responseContent);
                                this.scrollToBottom();
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
        }
        
        appendMessage(content, isUser, isError = false) {
            const messageEl = document.createElement('div');
            messageEl.className = `customate-message ${isUser ? 'user' : 'assistant'}`;
            
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'customate-message-bubble';
            
            if (isUser) {
                bubbleEl.style.cssText = `
                    background-color: ${this.settings.primaryColor}; color: #fff;
                    border-bottom-right-radius: 4px; box-shadow: 0 1px 3px rgba(234, 88, 12, 0.2);
                `;
                bubbleEl.textContent = content;
            } else if (isError) {
                bubbleEl.style.cssText = `
                    background-color: #fef2f2; color: #b91c1c; border-bottom-left-radius: 4px;
                    border: 1px solid #fecaca;
                `;
                bubbleEl.textContent = content;
            } else {
                bubbleEl.style.cssText = `
                    background-color: #fff; color: #1f2937; border-bottom-left-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;
                `;
                bubbleEl.innerHTML = parseMarkdown(content);
            }
            
            messageEl.appendChild(bubbleEl);
            this.messagesContainer.appendChild(messageEl);
            this.scrollToBottom();
            
            return { element: messageEl, bubble: bubbleEl };
        }
        
        createTypingIndicator() {
            const indicatorEl = document.createElement('div');
            indicatorEl.className = 'customate-message assistant typing';
            
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'customate-message-bubble';
            bubbleEl.style.cssText = `
                background-color: #fff; border-bottom-left-radius: 4px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;
                display: flex; padding: 14px 16px;
            `;
            
            const indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'customate-typing-indicator';
            
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'customate-typing-dot';
                indicatorContainer.appendChild(dot);
            }
            
            bubbleEl.appendChild(indicatorContainer);
            indicatorEl.appendChild(bubbleEl);
            this.messagesContainer.appendChild(indicatorEl);
            this.scrollToBottom();
            
            return indicatorEl;
        }
        
        scrollToBottom() {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
        
        resetInputState() {
            this.isSending = false;
            this.messageInput.disabled = false;
            this.messageInput.value = '';
            this.messageInput.focus();
            this.sendButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
            this.sendButton.style.opacity = '0.6';
            this.sendButton.disabled = true;
        }
        
        // Method to update settings dynamically
        updateSettings(newSettings) {
            console.log('🔄 Updating widget settings...', newSettings);
            
            // Update internal settings
            this.settings = { ...this.settings, ...newSettings };
            
            // Update theme
            this.injectThemedStyles();
            
            // Update UI elements that reflect settings
            this.updateUIForSettings();
            
            console.log('✅ Widget settings updated');
        }
        
        updateUIForSettings() {
            // Update header colors
            const header = this.chatContainer.querySelector('.customate-chat-header') || 
                         this.chatContainer.children[0];
            if (header) {
                header.style.background = `linear-gradient(135deg, ${this.settings.primaryColor}, #f97316)`;
            }
            
            // Update bot name
            const titleElement = header?.querySelector('div div div');
            if (titleElement) {
                titleElement.textContent = this.settings.chatbotName;
            }
            
            // Update button colors
            if (this.sendButton) {
                this.sendButton.style.background = this.settings.primaryColor;
            }
            
            if (this.toggleButton) {
                this.toggleButton.style.background = this.settings.primaryColor;
            }
            
            // Update existing user message bubbles
            const userBubbles = this.messagesContainer.querySelectorAll('.customate-message.user .customate-message-bubble');
            userBubbles.forEach(bubble => {
                bubble.style.backgroundColor = this.settings.primaryColor;
            });
        }
        
        // Method to reset chat
        reset() {
            this.messagesContainer.innerHTML = '';
            this.addWelcomeMessage();
            this.sessionId = null;
        }
        
        // Method to get session ID
        getSessionId() {
            return this.sessionId;
        }
    }
    
    // Initialize the widget
    async function initWidget() {
        console.log('🚀 Initializing Customate.ai Widget...');
        
        const result = await fetchWidgetSettings();
        const widget = new CustomateWidget(result.settings);
        
        await widget.init();
        
        // Expose widget instance globally for external control
        window.customateWidgetInstance = widget;
        
        // Legacy compatibility
        if (widget.isInlineMode) {
            window.customateWidget = {
                reset: () => widget.reset(),
                sendMessage: (text) => widget.sendMessage(text),
                getSessionId: () => widget.getSessionId(),
                updateSettings: (settings) => widget.updateSettings(settings)
            };
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();
    """
    
    return Response(
        content=widget_js,
        headers={
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )