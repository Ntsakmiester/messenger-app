import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { verifyOtp } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function OtpScreen({ route, navigation }: any) {
  const { phoneNumber } = route.params;
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginWithUser } = useAuth();

  async function handleVerify() {
    setIsSubmitting(true);
    try {
      const data = await verifyOtp({
        phoneNumber,
        code,
        displayName: displayName || undefined,
        countryCode: "ZA", // TODO: derive from phone number or a picker
      });
      await loginWithUser(data.user);
    } catch (err: any) {
      Alert.alert("Verification failed", err?.response?.data?.error ?? "Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the 6-digit code</Text>
      <Text style={styles.subtitle}>Sent to {phoneNumber}</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        autoFocus
      />
      <Text style={styles.subtitle}>First time here? Pick a display name:</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isSubmitting}>
        <Text style={styles.buttonText}>{isSubmitting ? "Verifying..." : "Verify"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 12 },
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
