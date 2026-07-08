import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// IMPORTANT: this whole function is wrapped in try/catch. Push
// notifications are a "nice to have" — if anything here fails (missing
// config, unsupported device, denied permission), we log a warning and
// let the rest of the app keep working normally, rather than crashing
// the entire app on startup.
export async function registerForPushNotifications() {
  try {
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

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn("[push] No EAS projectId found, skipping push token registration");
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    await api.post("/users/push-token", { pushToken });
    console.log("[push] Registered token with backend");
  } catch (err) {
    console.error("[push] Failed to register for push notifications:", err);
  }
}