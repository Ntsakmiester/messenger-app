import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { requestOtp } from "../services/api";

export default function LoginScreen({ navigation }: any) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    if (phoneNumber.trim().length < 8) {
      Alert.alert("Enter a valid phone number, including country code (e.g. +27...)");
      return;
    }
    setIsSubmitting(true);
    try {
      await requestOtp(phoneNumber);
      navigation.navigate("Otp", { phoneNumber });
    } catch (err) {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your phone number</Text>
      <Text style={styles.subtitle}>
        Include your country code, e.g. +27 for South Africa, +1 for the US.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="+27 82 123 4567"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        autoFocus
      />
      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={isSubmitting}>
        <Text style={styles.buttonText}>{isSubmitting ? "Sending..." : "Continue"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  button: { backgroundColor: "#128C7E", borderRadius: 8, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
