import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DAILY_REMINDER_KEY = 'daily_reminder';

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function isExpoGoOnAndroid() {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission() {
  if (isExpoGoOnAndroid()) {
    throw new Error('Notifications require a development build on Android.');
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' || status === 'provisional';
}

export async function scheduleDailyReminder() {
  if (isExpoGoOnAndroid()) {
    throw new Error('Notifications require a development build on Android.');
  }
  await ensureNotificationChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = scheduled.some(
    (notification) => notification.content?.data?.key === DAILY_REMINDER_KEY
  );
  if (alreadyScheduled) {
    return;
  }
  const trigger: Notifications.NotificationTriggerInput = {
    type: 'daily',
    hour: 9,
    minute: 0,
    repeats: true,
    ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
  };
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'KudiBase reminder',
      body: "Review today's sales and debts.",
      data: { key: DAILY_REMINDER_KEY },
    },
    trigger,
  });
}

export async function cancelDailyReminder() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const targets = scheduled.filter(
    (notification) => notification.content?.data?.key === DAILY_REMINDER_KEY
  );
  await Promise.all(
    targets.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );
}
