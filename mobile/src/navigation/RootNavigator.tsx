import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import OtpScreen from "../screens/OtpScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import ContactsScreen from "../screens/ContactsScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Otp" component={OtpScreen} options={{ title: "Verify" }} />
          </>
        ) : (
          <>
            <Stack.Screen
              name="ChatList"
              component={ChatListScreen}
              options={({ navigation }) => ({
                title: "Chats",
                headerRight: () => (
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <TouchableOpacity onPress={() => navigation.navigate("Contacts")}>
                      <Text style={{ color: "#128C7E", fontWeight: "600" }}>New chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout}>
                      <Text style={{ color: "#128C7E" }}>Log out</Text>
                    </TouchableOpacity>
                  </View>
                ),
              })}
            />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: "New chat" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
