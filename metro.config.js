const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Excluir archivos .wasm para web (expo-sqlite los necesita solo en nativo)
config.resolver = config.resolver || {};
config.resolver.assetExts = config.resolver.assetExts || [];
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

module.exports = config;
