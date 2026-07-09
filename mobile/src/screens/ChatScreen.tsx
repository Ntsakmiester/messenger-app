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
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { fetchMessages } from "../services/api";
import { getSocket } from "../services/socket";
import { pickAndUploadMedia } from "../services/mediaUpload";
import { encryptMessage, decryptMessage, getStoredPrivateKey } from "../services/encryption";
import { Message } from "../types";
import { useAuth } from "../context/AuthContext";

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, title, otherUserPublicKey } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [myPrivateKey, setMyPrivateKey] = useState<string | null>(null);
  const { user } = useAuth();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getStoredPrivateKey().then(setMyPrivateKey);
  }, []);

  function decryptIncoming(message: Message): Message {
    if (!message.body || !otherUserPublicKey || !myPrivateKey) return message;
    const plaintext = decryptMessage(message.body, otherUserPublicKey, myPrivateKey);
    return { ...message, body: plaintext ?? "🔒 Unable to decrypt message" };
  }

  useEffect(() => {
    navigation.setOptions({ title });
  }, [title]);

  useEffect(() => {
    if (!myPrivateKey) return;

    fetchMessages(conversationId).then((history: Message[]) => {
      setMessages(history.map(decryptIncoming));
    });

    const socket = getSocket();
    if (!socket) return;

    function onNewMessage(message: Message) {
      if (message.conversationId !== conversationId) return;
      const decrypted = decryptIncoming(message);
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== message.clientTempId);
        return [...withoutOptimistic, decrypted];
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
  }, [conversationId, myPrivateKey]);

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const socket = getSocket();
    if (!socket) return;

    const clientTempId = `temp-${Date.now()}`;
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

    let outgoingBody = trimmed;
    if (otherUserPublicKey && myPrivateKey) {
      outgoingBody = encryptMessage(trimmed, otherUserPublicKey, myPrivateKey);
    } else {
      console.warn("[chat] Sending unencrypted — missing keys");
    }

    socket.emit("message:send", { conversationId, body: outgoingBody, clientTempId });
    socket.emit("typing:stop", { conversationId });
  }

  function handleChangeDraft(text: string) {
    setDraft(text);
    const socket = getSocket();
    if (!socket) return;
    socket.emit(text.length > 0 ? "typing:start" : "typing:stop", { conversationId });
  }

  async function handleAttachMedia() {
    try {
      setIsUploading(true);
      const picked = await pickAndUploadMedia();
      if (!picked) return;

      const socket = getSocket();
      if (!socket) return;

      const clientTempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: clientTempId,
        conversationId,
        senderId: user!.id,
        mediaUrl: picked.url,
        mediaType: picked.mediaType,
        status: "sent",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      socket.emit("message:send", {
        conversationId,
        mediaUrl: picked.url,
        mediaType: picked.mediaType,
        clientTempId,
      });
    } catch (err) {
      console.error("[media] upload failed:", err);
      Alert.alert("Upload failed", "Could not send that photo/video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.senderId === user?.id;
      return (
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {item.mediaType === "image" && item.mediaUrl && (
            <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
          )}
          {item.mediaType === "video" && item.mediaUrl && (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderText}>🎥 Video attached</Text>
            </View>
          )}
          {item.body && (
            <Text style={isMine ? styles.textMine : styles.textTheirs}>{item.body}</Text>
          )}
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
      {isUploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color="#128C7E" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.attachButton} onPress={handleAttachMedia} disabled={isUploading}>
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>
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
  uploadingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 4 },
  uploadingText: { marginLeft: 8, color: "#999" },
  mediaImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 6 },
  videoPlaceholder: {
    width: 200,
    height: 120,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholderText: { color: "#fff" },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    alignItems: "flex-end",
  },
  attachButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: 4,
  },
  attachButtonText: { fontSize: 22 },
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