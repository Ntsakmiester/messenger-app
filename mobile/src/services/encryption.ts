import "react-native-get-random-values";
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

const PRIVATE_KEY_STORAGE_KEY = "e2e_private_key";
const PUBLIC_KEY_STORAGE_KEY = "e2e_public_key";

// Generates a new public/private keypair for this device if one doesn't
// already exist, stores the private key in the phone's secure hardware
// storage (never leaves the device), and uploads only the public key to
// the backend so other users can encrypt messages for this person.
export async function ensureKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const existingPrivate = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
  const existingPublic = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);

  if (existingPrivate && existingPublic) {
    return { publicKey: existingPublic, privateKey: existingPrivate };
  }

  const keyPair = nacl.box.keyPair();
  const publicKey = encodeBase64(keyPair.publicKey);
  const privateKey = encodeBase64(keyPair.secretKey);

  await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKey);
  await SecureStore.setItemAsync(PUBLIC_KEY_STORAGE_KEY, publicKey);

  try {
    await api.post("/users/public-key", { publicKey });
  } catch (err) {
    console.error("[encryption] Failed to upload public key:", err);
  }

  return { publicKey, privateKey };
}

export async function getStoredPrivateKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
}

// Encrypts plaintext so that only the holder of `recipientPublicKey` can
// read it. Returns a single string combining the nonce + ciphertext,
// safe to store in the message's `body` field and send over the wire.
export function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  myPrivateKeyB64: string
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const recipientPublicKey = decodeBase64(recipientPublicKeyB64);
  const myPrivateKey = decodeBase64(myPrivateKeyB64);
  const messageBytes = decodeUTF8(plaintext);

  const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, myPrivateKey);

  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return encodeBase64(combined);
}

// Reverses encryptMessage. Returns null if decryption fails (wrong keys,
// corrupted data, or a message from before encryption was added).
export function decryptMessage(
  payloadB64: string,
  senderPublicKeyB64: string,
  myPrivateKeyB64: string
): string | null {
  try {
    const combined = decodeBase64(payloadB64);
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const ciphertext = combined.slice(nacl.box.nonceLength);
    const senderPublicKey = decodeBase64(senderPublicKeyB64);
    const myPrivateKey = decodeBase64(myPrivateKeyB64);

    const decrypted = nacl.box.open(ciphertext, nonce, senderPublicKey, myPrivateKey);
    if (!decrypted) return null;

    return encodeUTF8(decrypted);
  } catch (err) {
    console.error("[encryption] Failed to decrypt message:", err);
    return null;
  }
}