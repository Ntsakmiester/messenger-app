import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

// Controls how notifications are shown while the app is open and in the
// foreground (by default, iOS/Android hide them since you're already
// looking at the app — this makes them show anyway, which is nicer for
// a chat app where you still want to know a message arrived).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
        shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Asks the user for permission, gets this device's unique Expo push token,
// and saves it on the backend so the server knows where to send
// notifications for this user. Call this once after login.
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn("[push] Must use a physical device for push notifications");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[push] Permission not granted for push notifications");
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  // Android requires a "notification channel" to be set up, otherwise
  // notifications may not appear or may appear without sound.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    await api.post("/users/push-token", { pushToken });
    console.log("[push] Registered token with backend");
  } catch (err) {
    console.error("[push] Failed to register token:", err);
  }
}