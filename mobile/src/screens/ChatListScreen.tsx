import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchConversations } from "../services/api";
import { Conversation } from "../types";
import { useAuth } from "../context/AuthContext";

export default function ChatListScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const load = useCallback(async () => {
    const data = await fetchConversations();
    setConversations(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function renderItem({ item }: { item: Conversation }) {
    const otherParticipant = item.participants.find((p) => p.userId !== user?.id);
    const title = item.isGroup ? item.title : otherParticipant?.user.displayName ?? "Unknown";
    const lastMessage = item.messages?.[0];

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          navigation.navigate("Chat", { conversationId: item.id, title })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{title?.[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{title}</Text>
          <Text style={styles.preview} numberOfLines={1}>
            {lastMessage?.body ?? "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No conversations yet. Start one from Contacts.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#128C7E", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  name: { fontSize: 16, fontWeight: "600" },
  preview: { fontSize: 14, color: "#777", marginTop: 2 },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
});
