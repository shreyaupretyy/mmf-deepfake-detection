import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import VerdictBadge from "../components/VerdictBadge";
import type { AnalysisResponse } from "../types";

export default function AnalysisScreen() {
  const { data, filename } = useLocalSearchParams<{
    data: string;
    filename: string;
  }>();

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base">
        <Ionicons name="document-outline" size={48} color="#94A3B8" />
        <Text className="mt-3 text-base text-ink-muted">No analysis data</Text>
      </View>
    );
  }

  const result: AnalysisResponse = JSON.parse(data);

  return (
    <ScrollView className="flex-1 bg-surface-base" bounces={false}>
      <View className="px-6 py-6">
        {/* Filename chip */}
        <View className="mb-5 flex-row items-center justify-center">
          <View
            className="flex-row items-center rounded-full px-3.5 py-1.5"
            style={{ backgroundColor: "#F1F5F9" }}
          >
            <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
            <Text
              className="ml-1.5 text-xs font-medium text-ink-muted"
              numberOfLines={1}
            >
              {filename}
            </Text>
          </View>
        </View>

        {/* Verdict */}
        <VerdictBadge verdict={result.verdict} />

        {/* Frame Results */}
        {result.frame_results.length > 1 && (
          <View
            className="mt-6 rounded-2xl p-5"
            style={{
              backgroundColor: "#FFFFFF",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-bold text-ink-dark">
                Frame Analysis
              </Text>
              <Text className="text-xs text-ink-muted">
                {result.frames_analyzed} frames
              </Text>
            </View>
            {result.frame_results.map((fr, index) => {
              const pct = Math.round(fr.fake_probability * 100);
              const isFake = fr.fake_probability >= 0.5;
              const barColor = isFake ? "#EF4444" : "#10B981";

              return (
                <View
                  key={fr.frame}
                  className={`flex-row items-center ${
                    index < result.frame_results.length - 1 ? "mb-3" : ""
                  }`}
                >
                  <Text className="w-16 text-xs font-medium text-ink-muted">
                    Frame {fr.frame + 1}
                  </Text>
                  <View
                    className="mx-2.5 h-2 flex-1 rounded-full"
                    style={{ backgroundColor: barColor + "15" }}
                  >
                    <View
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.max(pct, 3)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </View>
                  <Text
                    className="w-10 text-right text-xs font-bold"
                    style={{ color: barColor }}
                  >
                    {pct}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Processing time */}
        <View className="mt-6 items-center">
          <View
            className="flex-row items-center rounded-full px-3 py-1.5"
            style={{ backgroundColor: "#F1F5F9" }}
          >
            <Ionicons name="timer-outline" size={13} color="#94A3B8" />
            <Text className="ml-1.5 text-xs text-ink-muted">
              Processed in {result.processing_time_seconds}s
            </Text>
          </View>
        </View>

        {/* Detection Pipeline */}
        <View
          className="mt-8 rounded-2xl p-5"
          style={{
            backgroundColor: "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <Text
            className="mb-4 text-sm font-bold text-ink-dark"
            style={{ letterSpacing: -0.2 }}
          >
            How Detection Works
          </Text>

          {[
            {
              icon: "scan-outline" as const,
              color: "#6366F1",
              bg: "#EEF2FF",
              title: "Face Detection",
              desc: "Facial regions are detected and extracted using an SSD neural network",
            },
            {
              icon: "grid-outline" as const,
              color: "#2E86AB",
              bg: "#E8F4F8",
              title: "Spatial Analysis",
              desc: "XceptionNet extracts texture and structural patterns from the face",
            },
            {
              icon: "pulse-outline" as const,
              color: "#F18F01",
              bg: "#FFF4E5",
              title: "Frequency Analysis",
              desc: "FFT reveals spectral artifacts invisible to the naked eye",
            },
            {
              icon: "eye-outline" as const,
              color: "#A23B72",
              bg: "#F8EEF4",
              title: "Semantic Analysis",
              desc: "CLIP ViT-B/32 checks high-level coherence and facial plausibility",
            },
            {
              icon: "git-merge-outline" as const,
              color: "#10B981",
              bg: "#ECFDF5",
              title: "Attention Fusion",
              desc: "All three domains are fused using learned attention weights for the final verdict",
            },
          ].map((step, i, arr) => (
            <View key={step.title}>
              <View className="flex-row items-start">
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: step.bg,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                    marginTop: 2,
                  }}
                >
                  <Ionicons name={step.icon} size={18} color={step.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    className="text-sm font-semibold text-ink-dark"
                    style={{ marginBottom: 2 }}
                  >
                    {step.title}
                  </Text>
                  <Text
                    className="text-xs text-ink-muted"
                    style={{ lineHeight: 16 }}
                  >
                    {step.desc}
                  </Text>
                </View>
              </View>
              {i < arr.length - 1 && (
                <View
                  style={{
                    width: 1,
                    height: 16,
                    backgroundColor: "#E2E8F0",
                    marginLeft: 18,
                    marginVertical: 6,
                  }}
                />
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
