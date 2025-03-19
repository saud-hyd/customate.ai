# Customate.ai Marketing Website

This is the marketing website for Customate.ai, a multi-tenant chatbot platform that enables businesses to create, customize, and deploy AI-powered chatbots with industry-specific behaviors and custom knowledge bases.

## Project Overview

The marketing website is built with:

- React
- React Router for navigation
- Tailwind CSS for styling
- Framer Motion for animations
- Axios for API requests

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the marketing directory:

```bash
cd frontend/marketing
```

3. Install dependencies:

```bash
npm install
# or
yarn install
```

4. Start the development server:

```bash
npm start
# or
yarn start
```

The site will be available at http://localhost:3000

## Project Structure

- `/src/components/` - React components
  - `/layout/` - Layout components (Header, Footer)
  - `/sections/` - Page sections (Hero, Features, etc.)
  - `/ui/` - UI components (Button, etc.)
- `/src/pages/` - Page components
- `/src/services/` - API services
- `/src/assets/` - Static assets

## Available Scripts

- `npm start` - Start the development server
- `npm run build` - Build the production-ready site
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Deployment

The production site is built using the following command:

```bash
npm run build
```

This creates a `build` directory with optimized production files that can be deployed to any static hosting service.

## Integration with Main Application

The marketing site is designed to work seamlessly with the main Customate.ai dashboard application:

- Authentication is handled by redirecting to the main app's login/registration pages
- API calls use the same endpoints as the main application
- Styling and branding are consistent between the two applications

## Adding Content

### Images

Place images in the `/public/images/` directory and reference them in components with paths like:

```jsx
<img src="/images/example.jpg" alt="Example" />
```

### Page Sections

New page sections should be added as components in the `/src/components/sections/` directory.

### Pages

New pages should be added as components in the `/src/pages/` directory and registered in the routes in `App.jsx`.