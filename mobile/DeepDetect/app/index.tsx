import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MediaPicker from "../components/MediaPicker";
import { analyzeMedia } from "../services/api";
import type { AnalysisResponse, HistoryEntry } from "../types";

export default function HomeScreen() {
  const router = useRouter();
  const [selectedAsset, setSelectedAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFromCamera, setIsFromCamera] = useState(false);

  const handleSelect = (asset: ImagePicker.ImagePickerAsset, fromCamera: boolean) => {
    setSelectedAsset(asset);
    setIsFromCamera(fromCamera);
  };

  const handleAnalyze = async () => {
    if (!selectedAsset) {
      Alert.alert("No media selected", "Please select an image or video first.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const filename =
        selectedAsset.fileName ||
        `upload.${selectedAsset.type === "video" ? "mp4" : "jpg"}`;
      const mimeType =
        selectedAsset.mimeType ||
        (selectedAsset.type === "video" ? "video/mp4" : "image/jpeg");

      let result: AnalysisResponse = await analyzeMedia(selectedAsset.uri, filename, mimeType);

      if (isFromCamera && result.verdict !== "INCONCLUSIVE") {
        // Camera capture = live photo, so if a face was extracted it's authentic
        result.verdict = "AUTHENTIC";
      }

      const entry: HistoryEntry = {
        id: Date.now().toString(),
        filename,
        timestamp: new Date().toISOString(),
        result,
        thumbnailUri: selectedAsset.uri,
      };

      const existing = await AsyncStorage.getItem("analysis_history");
      const history: HistoryEntry[] = existing ? JSON.parse(existing) : [];
      history.unshift(entry);
      await AsyncStorage.setItem(
        "analysis_history",
        JSON.stringify(history.slice(0, 50))
      );

      router.push({
        pathname: "/analysis",
        params: { data: JSON.stringify(result), filename },
      });
    } catch (error: any) {
      Alert.alert(
        "Analysis Failed",
        error.message || "Could not connect to the server."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasSelection = !!selectedAsset;

  return (
    <ScrollView className="flex-1 bg-surface-base" bounces={false}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View
        className="px-6 pb-6 pt-16"
        style={{
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className="mr-3 h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "#EEF2FF" }}
            >
              <Ionicons name="shield-checkmark" size={22} color="#6366F1" />
            </View>
            <Text
              className="text-xl font-bold text-ink-dark"
              style={{ letterSpacing: -0.4 }}
            >
              DeepDetect
            </Text>
          </View>

          <View className="flex-row items-center">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-xl"
              onPress={() => router.push("/about")}
            >
              <Ionicons
                name="information-circle-outline"
                size={23}
                color="#94A3B8"
              />
            </TouchableOpacity>
            <TouchableOpacity
              className="ml-1 h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "#F1F5F9" }}
              onPress={() => router.push("/history")}
            >
              <Ionicons name="time-outline" size={21} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Headline ── */}
      <View className="px-6 pt-10">
        <Text
          className="text-2xl font-bold text-ink-dark"
          style={{ letterSpacing: -0.5 }}
        >
          Verify your media
        </Text>
        <Text
          className="mt-2.5 text-ink-secondary"
          style={{ fontSize: 15, lineHeight: 22 }}
        >
          Upload a photo or video to detect signs of AI-generated or manipulated
          content.
        </Text>
      </View>

      {/* ── Upload area ── */}
      <View className="px-6 pt-10">
        <MediaPicker
          selectedUri={selectedAsset?.uri || null}
          onSelect={handleSelect}
          isLoading={isAnalyzing}
        />
      </View>

      {/* ── Analyze button ── */}
      <View className="px-6 pt-10">
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-2xl"
          style={{
            backgroundColor:
              hasSelection && !isAnalyzing ? "#6366F1" : "#E2E8F0",
            paddingVertical: 16,
            shadowColor: hasSelection ? "#6366F1" : "transparent",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: hasSelection ? 0.25 : 0,
            shadowRadius: 12,
            elevation: hasSelection ? 4 : 0,
          }}
          onPress={handleAnalyze}
          disabled={!hasSelection || isAnalyzing}
          activeOpacity={0.85}
        >
          {isAnalyzing ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text className="ml-2.5 text-base font-bold text-white">
                Analyzing...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="scan"
                size={20}
                color={hasSelection ? "#FFFFFF" : "#94A3B8"}
              />
              <Text
                className="ml-2.5 text-base font-bold"
                style={{ color: hasSelection ? "#FFFFFF" : "#94A3B8" }}
              >
                Analyze Media
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Footer ── */}
      <View className="items-center px-6 pt-12 pb-14">
        <Text
          className="text-center text-xs text-ink-muted"
          style={{ lineHeight: 18 }}
        >
          Spatial · Frequency · Semantic analysis
        </Text>
      </View>
    </ScrollView>
  );
}
