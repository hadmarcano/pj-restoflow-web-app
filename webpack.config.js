const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/** Read .env at config evaluation time (devServer proxy runs before DotenvPlugin). */
function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeApiUrl(url) {
  const fallback = 'http://localhost:3000';
  if (!url || !String(url).trim()) return fallback;

  const trimmed = String(url).trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withProtocol.replace(/\/$/, '');
}

const fileEnv = loadEnvFile(path.resolve(__dirname, '.env'));
const API_URL = normalizeApiUrl(
  process.env.REACT_APP_API_URL || fileEnv.REACT_APP_API_URL,
);

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';

  return {
    mode,
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.[contenthash].js',
      publicPath: '/',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
        {
          test: /\.module\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: '[name]__[local]--[hash:base64:5]',
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          exclude: /\.module\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
      }),
    ],
    // Expose REACT_APP_* to client code via DefinePlugin (prefix defaults to WEBPACK_)
    dotenv: {
      prefix: 'REACT_APP_',
    },
    devServer: {
      port: 8080,
      historyApiFallback: true,
      hot: true,
      proxy: [
        {
          context: ['/api'],
          target: API_URL,
          changeOrigin: true,
        },
      ],
    },
  };
};
