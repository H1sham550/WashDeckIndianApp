const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude native build and source directories from the Metro file watcher and resolver.
// We block root-level android/ios directories and native build subdirectories inside node_modules
// to prevent ENOENT errors during compilation on Linux.
const blockList = [
  /android\/.*/,
  /ios\/.*/,
  /.*\/node_modules\/.*\/android\/\.cxx\/.*/,
  /.*\/node_modules\/.*\/android\/build\/.*/,
];

if (!config.resolver) {
  config.resolver = {};
}
config.resolver.blockList = blockList.concat(config.resolver.blockList || []);

module.exports = config;
