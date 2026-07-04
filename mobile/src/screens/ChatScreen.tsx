import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { fetchMessages } from "../services/api";
import { getSocket } from "../services/socket";
import { Message } from "../types";
import { useAuth } from "../context/AuthContext";

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, title } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const { user } = useAuth();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [title]);

  useEffect(() => {
    fetchMessages(conversationId).then(setMessages);

    const socket = getSocket();
    if (!socket) return;

    function onNewMessage(message: Message) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        // Replace optimistic message if this is our own echoed back, else append.
        const withoutOptimistic = prev.filter((m) => m.id !== message.clientTempId);
        return [...withoutOptimistic, message];
      });
    }

    function onTypingUpdate(payload: { conversationId: string; isTyping: boolean }) {
      if (payload.conversationId !== conversationId) return;
      setPeerTyping(payload.isTyping);
    }

    socket.on("message:new", onNewMessage);
    socket.on("typing:update", onTypingUpdate);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("typing:update", onTypingUpdate);
    };
  }, [conversationId]);

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const socket = getSocket();
    if (!socket) return;

    const clientTempId = `temp-${Date.now()}`;
    // Optimistic UI: show the message immediately, then reconcile when the
    // server echoes it back via "message:new".
    const optimisticMessage: Message = {
      id: clientTempId,
      conversationId,
      senderId: user!.id,
      body: trimmed,
      status: "sent",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setDraft("");

    socket.emit("message:send", { conversationId, body: trimmed, clientTempId });
    socket.emit("typing:stop", { conversationId });
  }

  function handleChangeDraft(text: string) {
    setDraft(text);
    const socket = getSocket();
    if (!socket) return;
    socket.emit(text.length > 0 ? "typing:start" : "typing:stop", { conversationId });
  }

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.senderId === user?.id;
      return (
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={isMine ? styles.textMine : styles.textTheirs}>{item.body}</Text>
        </View>
      );
    },
    [user]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      {peerTyping && <Text style={styles.typing}>typing...</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={handleChangeDraft}
          placeholder="Message"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "80%", padding: 10, borderRadius: 12, marginBottom: 8 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: "#f0f0f0" },
  textMine: { color: "#000" },
  textTheirs: { color: "#000" },
  typing: { paddingHorizontal: 14, color: "#999", fontStyle: "italic" },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: { backgroundColor: "#128C7E", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendButtonText: { color: "#fff", fontWeight: "600" },
});
