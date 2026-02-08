import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DAILY_REMINDER_KEY = 'daily_reminder';
const DEBT_REMINDER_KEY = 'debt_reminder';

// Lazy import to avoid crashes in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
  if (Notifications) {
    return Notifications;
  }
  if (isExpoGo()) {
    return null;
  }
  try {
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

export function canUseNotifications() {
  return !isExpoGo();
}

export async function configureNotifications() {
  const notif = await getNotifications();
  if (!notif) {
    return;
  }
  notif.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }
  const notif = await getNotifications();
  if (!notif) {
    return;
  }
  await notif.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: notif.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission() {
  const notif = await getNotifications();
  if (!notif) {
    console.warn('Notifications not available in Expo Go');
    return false;
  }
  const { status } = await notif.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder() {
  const notif = await getNotifications();
  if (!notif) {
    console.warn('Notifications not available in Expo Go');
    return;
  }
  await ensureNotificationChannel();
  const scheduled = await notif.getAllScheduledNotificationsAsync();
  const alreadyScheduled = scheduled.some(
    (notification) => notification.content?.data?.key === DAILY_REMINDER_KEY
  );
  if (alreadyScheduled) {
    return;
  }
  await notif.scheduleNotificationAsync({
    content: {
      title: 'KudiBase reminder',
      body: "Review today's sales and debts.",
      data: { key: DAILY_REMINDER_KEY },
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
    },
  });
}

export async function cancelDailyReminder() {
  const notif = await getNotifications();
  if (!notif) {
    return;
  }
  const scheduled = await notif.getAllScheduledNotificationsAsync();
  const targets = scheduled.filter(
    (notification) => notification.content?.data?.key === DAILY_REMINDER_KEY
  );
  await Promise.all(
    targets.map((notification) =>
      notif.cancelScheduledNotificationAsync(notification.identifier)
    )
  );
}

export async function scheduleDebtReminder(params: {
  saleId: string;
  customerName: string;
  amount: string;
  dueDate: Date;
}): Promise<string | null> {
  const notif = await getNotifications();
  if (!notif) {
    console.warn('Notifications not available in Expo Go');
    return null;
  }
  await ensureNotificationChannel();
  const dueDate = new Date(params.dueDate);
  dueDate.setHours(9, 0, 0, 0);
  if (dueDate.getTime() <= Date.now()) {
    return null;
  }
  return notif.scheduleNotificationAsync({
    content: {
      title: 'Payment reminder',
      body: `${params.customerName} owes ${params.amount}.`,
      data: { key: DEBT_REMINDER_KEY, saleId: params.saleId },
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.DATE,
      date: dueDate,
      ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
    },
  });
}

export async function cancelDebtReminder(notificationId?: string | null) {
  if (!notificationId) {
    return;
  }
  const notif = await getNotifications();
  if (!notif) {
    return;
  }
  await notif.cancelScheduledNotificationAsync(notificationId);
}
