# Dashboard Internationalization (i18n) Guide

## Overview

The dashboard now supports multiple languages using `react-i18next`. This guide explains how to implement and maintain internationalization throughout the application.

## Supported Languages

- **English (en)** - Default language
- **Spanish (es)** - Español
- **German (de)** - Deutsch

## Architecture

### File Structure
```
src/
├── i18n/
│   ├── index.js                 # i18n configuration
│   └── locales/
│       ├── en/                  # English translations
│       │   ├── common.json
│       │   ├── dashboard.json
│       │   ├── settings.json
│       │   ├── auth.json
│       │   ├── chat.json
│       │   ├── knowledge.json
│       │   ├── analytics.json
│       │   ├── integrations.json
│       │   ├── subscription.json
│       │   └── channels.json
│       ├── es/                  # Spanish translations
│       └── de/                  # German translations
├── context/
│   └── LanguageContext.jsx     # Language context provider
└── components/
    └── settings/
        └── LanguageSettings.jsx # Language selector component
```

### Namespace Organization

- **common**: Shared UI elements (buttons, status, navigation, messages)
- **auth**: Authentication flows (login, register, password reset)
- **dashboard**: Main dashboard content (metrics, charts, quick actions)
- **settings**: Settings page (profile, billing, team, language)
- **chat**: Chat interface and conversations
- **knowledge**: Knowledge base management
- **analytics**: Analytics dashboard and reporting
- **integrations**: Third-party integrations
- **subscription**: Subscription plans and billing
- **channels**: Communication channels setup

## Usage in Components

### 1. Basic Usage

```jsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation(['namespace1', 'namespace2']);

  return (
    <div>
      <h1>{t('namespace1:title')}</h1>
      <p>{t('namespace2:description')}</p>
      {/* Fallback to common namespace */}
      <button>{t('actions.save')}</button>
    </div>
  );
};
```

### 2. Using Variables

```jsx
const { t } = useTranslation(['common']);

// With interpolation
<p>{t('messages.welcome', { name: user.name })}</p>

// With count (pluralization)
<span>{t('messages.itemCount', { count: items.length })}</span>
```

### 3. Language Context

```jsx
import { useLanguage } from '../context/LanguageContext';

const MyComponent = () => {
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  return (
    <div>
      <p>Current: {currentLanguage}</p>
      <button onClick={() => changeLanguage('es')}>
        Cambiar a Español
      </button>
    </div>
  );
};
```

## Adding New Translations

### 1. Add to Translation Files

Add the new key-value pairs to all language files:

**English (en/common.json)**:
```json
{
  "newSection": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

**Spanish (es/common.json)**:
```json
{
  "newSection": {
    "title": "Nueva Funcionalidad",
    "description": "Esta es una nueva funcionalidad"
  }
}
```

**German (de/common.json)**:
```json
{
  "newSection": {
    "title": "Neue Funktion",
    "description": "Das ist eine neue Funktion"
  }
}
```

### 2. Use in Components

```jsx
const { t } = useTranslation(['common']);

return (
  <div>
    <h2>{t('newSection.title')}</h2>
    <p>{t('newSection.description')}</p>
  </div>
);
```

## Adding New Languages

### 1. Create Translation Files

Create a new directory in `src/i18n/locales/` (e.g., `fr/` for French) and copy all JSON files from the English directory, then translate the values.

### 2. Update i18n Configuration

In `src/i18n/index.js`, add the imports and resources:

```javascript
// Add imports
import frCommon from './locales/fr/common.json';
// ... other fr imports

// Add to resources object
const resources = {
  // ... existing languages
  fr: {
    common: frCommon,
    // ... other fr namespaces
  }
};
```

### 3. Update Language Context

In `src/context/LanguageContext.jsx`, add the new language to the languages array:

```javascript
const languages = [
  // ... existing languages
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
];
```

## Best Practices

### 1. Consistent Naming

- Use descriptive keys: `user.profile.updateSuccess` instead of `msg1`
- Group related translations: `auth.login.title`, `auth.login.subtitle`
- Use camelCase for keys: `firstName`, `lastName`

### 2. Default Namespace

Common UI elements should use the `common` namespace without prefix:
```jsx
// Good
{t('actions.save')}  // Uses common namespace by default

// Avoid
{t('common:actions.save')}  // Unnecessary prefix
```

### 3. Fallback Values

Always provide fallback values for development:
```jsx
{t('newFeature.title', 'Default Title')}
```

### 4. Context-Aware Translations

Use different translations for the same concept in different contexts:
```json
{
  "settings": {
    "profile": "Profile Settings"
  },
  "navigation": {
    "profile": "Profile"
  }
}
```

## Language Switching

Users can change language through:
1. **Settings Page**: Go to Settings → Language tab
2. **Programmatic**: Use the `useLanguage` hook's `changeLanguage` function

The selected language is persisted in localStorage and applied on next visit.

## Development Workflow

### 1. Component Development
1. Import `useTranslation` hook
2. Define required namespaces
3. Use `t()` function for all user-facing text
4. Test with different languages

### 2. Adding New Features
1. Add English translations first
2. Use descriptive key names
3. Group related translations logically
4. Add Spanish and German translations
5. Test language switching

### 3. Maintenance
- Regularly check for missing translations
- Update translations when features change
- Keep translation files in sync across languages

## Technical Notes

- **Bundle Size**: Translation files are code-split and loaded on demand
- **Performance**: Translations are cached after first load
- **SEO**: HTML `lang` attribute is updated when language changes
- **Accessibility**: Language changes are announced to screen readers
- **Fallback**: If translation key is missing, it falls back to English

## Migration Guide

To add i18n to existing components:

1. Import the hook: `import { useTranslation } from 'react-i18next';`
2. Add the hook: `const { t } = useTranslation(['namespace']);`
3. Replace hardcoded strings: `"Save"` → `{t('actions.save')}`
4. Add translations to JSON files
5. Test in all supported languages

## Troubleshooting

### Translation Not Found
- Check if key exists in translation files
- Verify namespace is imported in component
- Ensure JSON syntax is correct

### Language Not Changing
- Check if language code matches those in `LanguageContext`
- Verify localStorage is accessible
- Check browser console for errors

### Performance Issues
- Consider lazy-loading heavy components
- Use namespace splitting for large translation files
- Monitor bundle size with new translations

For questions or issues, refer to the [react-i18next documentation](https://react.i18next.com/) or contact the development team.