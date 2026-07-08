import * as ImagePicker from "expo-image-picker";

// IMPORTANT: replace with your own Cloudinary cloud name and upload preset.
const CLOUDINARY_CLOUD_NAME = "mademax138";
const CLOUDINARY_UPLOAD_PRESET = "messenger_uploads";

export interface PickedMedia {
  url: string;
  mediaType: "image" | "video";
}

// Opens the phone's photo/video picker, then uploads whatever the user
// picks directly to Cloudinary (no backend server involved in the upload
// itself — Cloudinary's "unsigned upload" feature lets the app upload
// safely using only the public preset name, no secret keys on the phone).
export async function pickAndUploadMedia(): Promise<PickedMedia | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    console.warn("[media] Permission to access photos was denied");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const mediaType: "image" | "video" = asset.type === "video" ? "video" : "image";

  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    type: mediaType === "video" ? "video/mp4" : "image/jpeg",
    name: mediaType === "video" ? "upload.mp4" : "upload.jpg",
  } as any);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const resourceType = mediaType === "video" ? "video" : "image";
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const data = await response.json();
  return { url: data.secure_url, mediaType };
}