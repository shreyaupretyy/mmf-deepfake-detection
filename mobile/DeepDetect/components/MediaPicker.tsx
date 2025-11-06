import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface Props {
  selectedUri: string | null;
  onSelect: (asset: ImagePicker.ImagePickerAsset, fromCamera: boolean) => void;
  isLoading: boolean;
}

type PermissionType = "camera" | "gallery";

export default function MediaPicker({
  selectedUri,
  onSelect,
  isLoading,
}: Props) {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionType, setPermissionType] = useState<PermissionType>("gallery");
  const pickMedia = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          setPermissionType("camera");
          setShowPermissionModal(true);
          return;
        }
      }

      launchPicker(useCamera);
    } catch {
      setPermissionType(useCamera ? "camera" : "gallery");
      setShowPermissionModal(true);
    }
  };

  const launchPicker = async (useCamera: boolean) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images", "videos"],
        quality: 1.0,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        onSelect(result.assets[0], useCamera);
      }
    } catch (e) {
      console.log("Picker error:", e);
    }
  };

  const openSettings = () => {
    setShowPermissionModal(false);
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const permissionInfo = {
    camera: {
      icon: "camera" as const,
      title: "Camera Access Required",
      description:
        "DeepDetect needs access to your camera to take photos for analysis. Your photos are only used for deepfake detection and are never stored on our servers.",
    },
    gallery: {
      icon: "images" as const,
      title: "Photo Library Access Required",
      description:
        "DeepDetect needs access to your photo library to select images and videos for analysis. Your media is only used for deepfake detection and is never stored on our servers.",
    },
  };

  const pInfo = permissionInfo[permissionType];

  return (
    <View>
      {/* ── Permission Denied Modal ── */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 340,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#EEF2FF",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Ionicons name={pInfo.icon} size={28} color="#6366F1" />
            </View>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#1E293B",
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              {pInfo.title}
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: "#64748B",
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 24,
              }}
            >
              {pInfo.description}
            </Text>

            <TouchableOpacity
              onPress={openSettings}
              activeOpacity={0.85}
              style={{
                backgroundColor: "#6366F1",
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 24,
                width: "100%",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
                Open Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPermissionModal(false)}
              activeOpacity={0.7}
              style={{
                paddingVertical: 10,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#94A3B8", fontSize: 14, fontWeight: "600" }}>
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Selected image preview ── */}
      {selectedUri ? (
        <View>
          <View
            className="overflow-hidden rounded-2xl"
            style={{
              backgroundColor: "#FFFFFF",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <Image
              source={{ uri: selectedUri }}
              className="w-full"
              style={{ height: 280 }}
              resizeMode="cover"
            />
            <TouchableOpacity
              className="absolute bottom-3 right-3 flex-row items-center rounded-full px-4 py-2.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.95)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => pickMedia(false)}
              disabled={isLoading}
            >
              <Ionicons name="image-outline" size={15} color="#6366F1" />
              <Text
                className="ml-1.5 text-xs font-semibold"
                style={{ color: "#6366F1" }}
              >
                Change
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="mt-4 flex-row items-center justify-center py-2"
            onPress={() => pickMedia(true)}
            disabled={isLoading}
            activeOpacity={0.6}
          >
            <Ionicons name="camera-outline" size={16} color="#94A3B8" />
            <Text className="ml-1.5 text-sm text-ink-muted">
              Or take a photo
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Gallery picker */}
          <TouchableOpacity
            className="items-center justify-center rounded-2xl"
            style={{
              backgroundColor: "#FFFFFF",
              paddingVertical: 40,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 1,
            }}
            onPress={() => pickMedia(false)}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <View
              className="mb-5 h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "#EEF2FF" }}
            >
              <Ionicons name="image-outline" size={28} color="#6366F1" />
            </View>
            <Text
              className="text-base font-semibold text-ink-dark"
              style={{ letterSpacing: -0.2 }}
            >
              Choose from gallery
            </Text>
            <Text className="mt-1.5 text-sm text-ink-muted">
              Photos and videos supported
            </Text>
          </TouchableOpacity>

          {/* Camera button */}
          <TouchableOpacity
            className="mt-4 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: "#FFFFFF",
              paddingVertical: 20,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
            onPress={() => pickMedia(true)}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <View className="flex-row items-center">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "#EEF2FF" }}
              >
                <Ionicons name="camera" size={20} color="#6366F1" />
              </View>
              <View>
                <Text className="text-sm font-semibold text-ink-dark">
                  Take a photo
                </Text>
                <Text className="text-xs text-ink-muted">
                  Use your camera
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
