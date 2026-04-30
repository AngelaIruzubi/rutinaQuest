module.exports = {
  setNotificationHandler: () => {},
  scheduleNotificationAsync: async () => {},
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  cancelAllScheduledNotificationsAsync: async () => {},
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getExpoPushTokenAsync: async () => ({ data: '' }),
};