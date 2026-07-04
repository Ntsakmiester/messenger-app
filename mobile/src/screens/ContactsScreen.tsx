import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { lookupUserByPhone, startConversation } from "../services/api";

export default function ContactsScreen({ navigation }: any) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function handleStartChat() {
    setIsSearching(true);
    try {
      const foundUser = await lookupUserByPhone(phoneNumber);
      const conversation = await startConversation([foundUser.id]);
      navigation.navigate("Chat", {
        conversationId: conversation.id,
        title: foundUser.displayName,
      });
    } catch (err: any) {
      Alert.alert(
        "Couldn't find that user",
        "Make sure they've signed up with that exact phone number, including country code."
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start a new chat</Text>
      <Text style={styles.subtitle}>
        Enter a phone number (with country code) to find someone anywhere in the world.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="+1 555 123 4567"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TouchableOpacity style={styles.button} onPress={handleStartChat} disabled={isSearching}>
        <Text style={styles.buttonText}>{isSearching ? "Searching..." : "Find & chat"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: { backgroundColor: "#128C7E", borderRadius: 8, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
