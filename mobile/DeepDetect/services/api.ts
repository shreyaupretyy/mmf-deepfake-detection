import { Platform } from "react-native";
import { AnalysisResponse } from "../types";

// Change this to your server's address.
// For local dev with Expo Go on a physical device, use your machine's LAN IP.
// For emulator: Android uses 10.0.2.2, iOS uses localhost.
const API_BASE = "http://192.168.1.12:8000";

export async function analyzeMedia(
  fileUri: string,
  filename: string,
  mimeType: string
): Promise<AnalysisResponse> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    // Web: convert the blob/data URI to a proper File object
    const res = await fetch(fileUri);
    const blob = await res.blob();
    formData.append("file", new File([blob], filename, { type: mimeType }));
  } else {
    // React Native: uses the { uri, name, type } convention
    formData.append("file", {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);
  }

  // Do NOT set Content-Type manually — fetch auto-sets it with the
  // correct multipart boundary when body is FormData
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
