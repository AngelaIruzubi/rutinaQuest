const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const WEB_MOCKS = {
  'expo-notifications': path.resolve(__dirname, 'mocks/expo-notifications.js'),
  'expo-sqlite':        path.resolve(__dirname, 'mocks/expo-sqlite.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_MOCKS[moduleName]) {
    return {
      filePath: WEB_MOCKS[moduleName],
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;