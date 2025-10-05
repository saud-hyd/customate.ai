# Maintenance Mode

The marketing site is currently displaying a "We'll be right back" page.

## What Changed

- Created `src/pages/ComingSoonPage.jsx` - The maintenance page component
- Modified `src/App.js` - Simplified to show only the Coming Soon page
- Backed up the original `src/App.js` to `src/App.js.backup`

## To Restore the Full Site

When you're ready to launch, simply restore the original App.js:

```bash
# Option 1: Use the backup file
cd frontend/marketing
cp src/App.js.backup src/App.js

# Option 2: Restore from git
git checkout src/App.js

# Option 3: Delete the backup and coming soon page after restoring
rm src/App.js.backup
rm src/pages/ComingSoonPage.jsx
```

## Current Page Features

The Coming Soon page includes:
- Professional dark gradient background
- Customate.ai branding
- "We'll Be Right Back" message
- Animated loading dots
- Contact email (info@customate.ai)
- Copyright footer

## Testing Locally

```bash
cd frontend/marketing
npm start
```

Visit http://localhost:3000 to see the maintenance page.

## Deployment

The build was tested and works correctly. Deploy as usual:

```bash
npm run build
```

The optimized build will be in the `build/` directory.
