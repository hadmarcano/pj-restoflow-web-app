# SKILL: Webpack 5 Custom Configuration, Asset Loaders, and Proxy Settings

This developer skill guide provides standard instructions for managing, running, and configuring the React frontend compiler built with Webpack 5 and TypeScript.

---

## 1. Loader Separation: Global CSS vs CSS Modules

To provide full compatibility with utility styles and page/component styles without namespace clashes, the Webpack loader configuration separates styles into two distinct rules inside the [webpack.config.js](file:///c:/Users/hadma/development/PROYECTOS/RESTAURANT_INVENTORY_SALES_APP/frontend/webpack.config.js):

### A. Global Styles (`index.css`)
Global variables, keyframe animations, global page styles, and basic utility classes are bundled normally.
- **File Pattern**: `index.css`
- **Configuration**: Passes through `style-loader` and `css-loader` with modules disabled:
```javascript
{
  test: /index\.css$/,
  use: [
    'style-loader',
    {
      loader: 'css-loader',
      options: { modules: false } // Loaded as standard global styles
    }
  ]
}
```

### B. CSS Modules (`*.module.css`)
Page and component styles are loaded as scoped local classes to prevent styling conflicts across files.
- **File Pattern**: `*.module.css` (e.g., `Dashboard.module.css`, `Billings.module.css`)
- **Configuration**: `css-loader` is configured with `modules: true` to generate scoped class names (e.g. `[name]__[local]--[hash:base64:5]`):
```javascript
{
  test: /\.module\.css$/,
  use: [
    'style-loader',
    {
      loader: 'css-loader',
      options: {
        modules: {
          localIdentName: '[name]__[local]--[hash:base64:5]'
        }
      }
    }
  ]
}
```

### C. Developer Usage Pattern
Inside React components, always import CSS Modules as objects and access styles by property name:
```tsx
import React from 'react';
import styles from './Dashboard.module.css'; // Scoped modules import

export const DashboardCard: React.FC = () => {
  return (
    <div className={styles.cardContainer}>
      <h3 className={styles.cardTitle}>Sales Summary</h3>
    </div>
  );
};
```
*Note: Any class names declared in `index.css` (e.g., `glass-panel`, `glow-input`, `badge`) can be used as simple strings: `className="glass-panel"`.*

---

## 2. Webpack Development Server & API Proxying

To bypass Cross-Origin Resource Sharing (CORS) issues during development and keep client requests clean, the Webpack dev server is configured to act as a proxy.

### A. Proxy Configuration
Any request in the frontend starting with `/api` is intercepted and transparently routed to the NestJS backend running on port 3000:
```javascript
devServer: {
  port: 8080,
  historyApiFallback: true, // Directs all deep-links back to index.html for client-side routing
  hot: true,                // Enables Hot Module Replacement (HMR)
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

### B. Usage in API Client
In the API service, you do not need to prepend a hardcoded server URL. Simple relative paths are used, which adapt naturally between development proxies and production environments:
```typescript
// Fetching the exchange rate list
const response = await fetch('/api/exchange-rates');
```

---

## 3. Environment Variable Injection

Environment variables can be injected during compilation using Webpack's `DefinePlugin`. By default, environmental parameters are bound to `process.env`.

For example, to load custom configurations:
```javascript
const webpack = require('webpack');

module.exports = {
  // ... configuration ...
  plugins: [
    new webpack.DefinePlugin({
      'process.env.APP_NAME': JSON.stringify('Restaurant Inventory & Sales App'),
      'process.env.DEFAULT_CURRENCY': JSON.stringify('VES')
    })
  ]
};
```

---

## 4. Helpful Build & Startup Commands

To run or bundle the React project, execute the following commands in the `/frontend` directory:

- **Start Development Server** (Runs compiler in-memory with HMR at `http://localhost:8080`):
  ```powershell
  npm run start
  ```
- **Compile Production Bundle** (Compiles, minifies, and dumps static HTML/JS assets to `/frontend/dist`):
  ```powershell
  npm run build
  ```
- **Run Type Checker** (Runs compile check without generating bundle to detect TypeScript warnings):
  ```powershell
  npx tsc --noEmit
  ```
