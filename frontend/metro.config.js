const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(process.cwd());

// Enable ES modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
config.transformer.experimentalImportSupport = true;

module.exports = config; 