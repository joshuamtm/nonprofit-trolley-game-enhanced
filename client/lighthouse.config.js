module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run build && npx serve -s build -p 3000',
      url: [
        'http://localhost:3000',
        'http://localhost:3000/facilitator',
        'http://localhost:3000/participant'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        onlyCategories: ['accessibility', 'performance', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.8}],
        // Accessibility specific audits
        'color-contrast': 'error',
        'heading-order': 'error',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'image-alt': 'error',
        'label': 'error',
        'landmark-one-main': 'error',
        'link-name': 'error',
        'skip-link': 'error',
        // Performance audits
        'first-contentful-paint': ['error', {maxNumericValue: 3000}],
        'interactive': ['error', {maxNumericValue: 5000}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};