#!/bin/bash

echo "íº€ Setting up iframe-based widget architecture..."

# Create widget-app directory structure
echo "í³ Creating widget-app directory structure..."
mkdir -p frontend/widget-app/src/{components,hooks,services,styles}
mkdir -p frontend/widget-app/public
mkdir -p backend/app/api/widget

# Create package.json for widget-app
echo "í³¦ Creating widget-app package.json..."
cat > frontend/widget-app/package.json << 'PACKAGEEOF'
{
  "name": "customate-widget-app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "@babel/preset-react": "^7.22.0",
    "babel-loader": "^9.1.0",
    "css-loader": "^6.8.0",
    "html-webpack-plugin": "^5.5.0",
    "style-loader": "^3.3.0",
    "webpack": "^5.88.0",
    "webpack-cli": "^5.1.0",
    "webpack-dev-server": "^4.15.0"
  },
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "build:dev": "webpack --mode development"
  }
}
PACKAGEEOF

# Create webpack config
echo "âš™ï¸ Creating webpack config..."
cat > frontend/widget-app/webpack.config.js << 'WEBPACKEOF'
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'widget.[contenthash].js' : 'widget.js',
      clean: true,
      publicPath: '/api/widget/app/'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react']
            }
          }
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        inject: true
      })
    ],
    resolve: {
      extensions: ['.js', '.jsx']
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist')
      },
      port: 3001,
      hot: true,
      historyApiFallback: true
    },
    optimization: {
      splitChunks: false
    }
  };
};
WEBPACKEOF

# Create HTML template
echo "í¼ Creating HTML template..."
cat > frontend/widget-app/public/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Customate Widget</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            height: 100vh;
            overflow: hidden;
        }
        #root {
            height: 100vh;
            width: 100vw;
        }
    </style>
</head>
<body>
    <div id="root"></div>
</body>
</html>
HTMLEOF

# Create index.js
echo "âš›ï¸ Creating React entry point..."
cat > frontend/widget-app/src/index.js << 'INDEXEOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import WidgetApp from './WidgetApp';
import './styles/widget.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<WidgetApp />);
INDEXEOF

echo "âœ… Basic widget app structure created!"
echo ""
echo "í³‹ What was created:"
echo "  âœ“ frontend/widget-app/ directory structure"
echo "  âœ“ package.json with dependencies"
echo "  âœ“ webpack.config.js"
echo "  âœ“ public/index.html"
echo "  âœ“ src/index.js"
echo ""
echo "í´§ Next steps:"
echo "1. Install dependencies: cd frontend/widget-app && npm install"
echo "2. I'll provide the remaining React components"
echo ""
echo "Ready for next batch of files!"
