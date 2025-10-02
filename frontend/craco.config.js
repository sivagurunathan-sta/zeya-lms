const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Remove Node.js polyfills that are not needed
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "fs": false,
        "net": false,
        "tls": false,
        "child_process": false,
        "http": false,
        "https": false,
        "zlib": false,
        "stream": false,
        "util": false,
        "buffer": false,
        "crypto": false,
        "path": false,
        "os": false,
        "vm": false,
        "process": false,
      };

      // Add plugins
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
        })
      );

      return webpackConfig;
    },
  },
};