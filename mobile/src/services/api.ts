import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANT: replace with your deployed backend URL.
// For local testing on a physical phone, use your computer's LAN IP,
// not "localhost" (the phone can't reach your computer's localhost).
export const API_BASE_URL = "https://your-backend-domain.example.com";

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function requestOtp(phoneNumber: string) {
  await api.post("/auth/otp/request", { phoneNumber });
}

export async function verifyOtp(params: {
  phoneNumber: string;
  code: string;
  displayName?: string;
  countryCode?: string;
}) {
  const { data } = await api.post("/auth/otp/verify", params);
  await AsyncStorage.setItem("authToken", data.token);
  await AsyncStorage.setItem("currentUser", JSON.stringify(data.user));
  return data;
}

export async function fetchConversations() {
  const { data } = await api.get("/conversations");
  return data;
}

export async function fetchMessages(conversationId: string, cursor?: string) {
  const { data } = await api.get(`/conversations/${conversationId}/messages`, {
    params: cursor ? { cursor } : {},
  });
  return data;
}

export async function startConversation(participantUserIds: string[]) {
  const { data } = await api.post("/conversations", { participantUserIds });
  return data;
}

export async function lookupUserByPhone(phoneNumber: string) {
  const { data } = await api.get("/users/lookup", { params: { phoneNumber } });
  return data;
}
