# Customate.ai Chat Widget

This is the embeddable chat widget for the Customate.ai platform. The widget can be easily integrated into any website, allowing clients to deploy their custom AI chatbots with minimal setup.

## Features

- Embeddable JavaScript widget for any website
- Customizable appearance (colors, position, themes)
- Real-time messaging with the Customate.ai chatbot
- Support for suggested responses
- Mobile-responsive design
- Session persistence
- Analytics tracking

## Quick Start

To integrate the widget into your website, add the following code to your HTML:

```html
<script src="https://widget.customate.ai/widget.js"></script>
<script>
  CustomateWidget.init({
    apiKey: 'YOUR_API_KEY',
    primaryColor: '#4f46e5',
    position: 'bottom-right'
  });
</script>
```

## Configuration Options

The widget can be customized with the following configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | - | **Required.** Your Customate.ai API key |
| `apiUrl` | string | 'https://api.customate.ai' | API endpoint for the Customate.ai backend |
| `position` | string | 'bottom-right' | Position of the widget ('bottom-right', 'bottom-left', 'top-right', 'top-left') |
| `primaryColor` | string | '#4f46e5' | Primary color for the widget |
| `greeting` | string | 'Hello! How can I help you today?' | Initial greeting message |
| `title` | string | 'Chat with us' | Widget header title |
| `enableTypingIndicator` | boolean | true | Show typing indicator when bot is responding |
| `enableSuggestions` | boolean | true | Show suggested responses/questions |
| `showInitiallyOpen` | boolean | false | Open the widget automatically on page load |
| `height` | string | '500px' | Height of the widget |
| `width` | string | '350px' | Width of the widget |
| `maxWidth` | string | '420px' | Maximum width of the widget |
| `hideOnMobile` | boolean | false | Hide the widget on mobile devices |
| `mobileBreakpoint` | number | 768 | Mobile breakpoint in pixels |
| `zIndex` | number | 999999 | CSS z-index for the widget |
| `theme` | string | 'default' | Theme name ('default', 'dark', 'minimal', 'rounded', 'corporate') |
| `disableAnimations` | boolean | false | Disable animations |
| `userId` | string | null | User ID for tracking and personalization |
| `customData` | object | {} | Custom data to pass with messages |

## JavaScript API

The widget exposes several methods for controlling it programmatically:

```javascript
// Initialize with configuration
CustomateWidget.init({
  apiKey: 'YOUR_API_KEY',
  // other configuration options
});

// Open the widget
CustomateWidget.open();

// Close the widget
CustomateWidget.close();

// Update configuration
CustomateWidget.updateConfig({
  primaryColor: '#ff0000',
  greeting: 'New greeting message'
});

// Destroy the widget and remove it from DOM
CustomateWidget.destroy();
```

## Development

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Build for production:
   ```
   npm run build
   ```

### Project Structure

```
widget/
├── src/                            # Source code
│   ├── components/                 # Widget components
│   ├── styles/                     # Widget styles
│   ├── utils/                      # Widget utilities
│   ├── config.js                   # Widget configuration
│   └── index.js                    # Widget entry point
├── public/                         # Public assets
├── dist/                           # Built widget files
├── webpack.config.js               # Webpack configuration
└── package.json                    # Package dependencies
```

## Deployment

The built widget files are located in the `dist` directory after running the build command. To deploy:

1. Upload the `widget.js` and `widget.css` files to your CDN or hosting service
2. Include the script tag pointing to your hosted version
3. Initialize the widget with your API key

## License

This widget is proprietary software of Customate.ai and is not to be redistributed.

Copyright © 2025 Customate.ai. All rights reserved.