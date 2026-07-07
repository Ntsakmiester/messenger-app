import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

interface PushPayload {
  pushToken: string | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Sends a push notification to a single device via Expo's push service.
// Expo handles the actual delivery to Apple (APNs) and Google (FCM) for us,
// so we don't need separate integrations for iOS and Android.
export async function sendPushNotification({ pushToken, title, body, data }: PushPayload) {
  if (!pushToken) return; // user hasn't registered a device for push yet

  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn(`[push] Invalid Expo push token, skipping: ${pushToken}`);
    return;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: "default",
    title,
    body,
    data: data ?? {},
  };

  try {
    const receipts = await expo.sendPushNotificationsAsync([message]);
    console.log("[push] sent:", receipts);
  } catch (err) {
    console.error("[push] failed to send:", err);
  }
}