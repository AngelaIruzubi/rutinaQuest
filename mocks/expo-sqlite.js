module.exports = {
  openDatabaseAsync: async () => ({
    execAsync: async () => {},
    runAsync: async () => {},
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
    closeAsync: async () => {},
  }),
  openDatabaseSync: () => ({
    execSync: () => {},
    runSync: () => {},
    getFirstSync: () => null,
    getAllSync: () => [],
    closeSync: () => {},
  }),
};