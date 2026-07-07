import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";
import { connectSocket, disconnectSocket } from "../services/socket";
import { registerForPushNotifications } from "../services/pushNotifications";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  loginWithUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("currentUser");
      const token = await AsyncStorage.getItem("authToken");
      if (stored && token) {
        setUser(JSON.parse(stored));
        await connectSocket();
             await registerForPushNotifications();
      }
      setIsLoading(false);
    })();
  }, []);

async function loginWithUser(newUser: User) {
    setUser(newUser);
    await connectSocket();
    await registerForPushNotifications();

  }

  async function logout() {
    await AsyncStorage.multiRemove(["authToken", "currentUser"]);
    disconnectSocket();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
