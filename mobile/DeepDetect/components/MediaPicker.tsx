import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface Props {
  selectedUri: string | null;
  onSelect: (asset: ImagePicker.ImagePickerAsset) => void;
  isLoading: boolean;
}

export default function MediaPicker({
  selectedUri,
  onSelect,
  isLoading,
}: Props) {
  const pickMedia = async (useCamera: boolean) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets[0]) {
      onSelect(result.assets[0]);
    }
  };

  if (selectedUri) {
    return (
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
    );
  }

  return (
    <View>
      <TouchableOpacity
        className="items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "#FFFFFF",
          paddingVertical: 52,
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

      <TouchableOpacity
        className="mt-5 flex-row items-center justify-center py-2"
        onPress={() => pickMedia(true)}
        disabled={isLoading}
        activeOpacity={0.6}
      >
        <Ionicons name="camera-outline" size={16} color="#6366F1" />
        <Text
          className="ml-1.5 text-sm font-medium"
          style={{ color: "#6366F1" }}
        >
          Use camera instead
        </Text>
      </TouchableOpacity>
    </View>
  );
}
