// src/assets/fonts/index.js
// This file serves as a central export point for all custom fonts
// Add your font imports and declarations here

// Import custom fonts
import './Inter/Inter-Regular.woff2';
import './Inter/Inter-Medium.woff2';
import './Inter/Inter-SemiBold.woff2';
import './Inter/Inter-Bold.woff2';

// Font face declarations (if needed for custom fonts)
export const fontFaces = `
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('./Inter/Inter-Regular.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url('./Inter/Inter-Medium.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url('./Inter/Inter-SemiBold.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('./Inter/Inter-Bold.woff2') format('woff2');
  }
`;

// Font utility classes
export const fontClasses = {
  primary: 'font-inter',
  heading: 'font-inter font-bold',
  body: 'font-inter font-normal',
  caption: 'font-inter font-medium text-sm',
  code: 'font-mono'
};

// Export font configurations
export const fontConfig = {
  primary: {
    name: 'Inter',
    fallback: 'system-ui, -apple-system, sans-serif',
    weights: [400, 500, 600, 700],
    styles: ['normal']
  }
};

export default {
  fontFaces,
  fontClasses,
  fontConfig
};

// Note: Actual font files should be placed in the corresponding directories
// This is just the index file to manage font imports and configurations