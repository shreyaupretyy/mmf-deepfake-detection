import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import VerdictBadge from "../components/VerdictBadge";
import ConfidenceGauge from "../components/ConfidenceGauge";
import DomainBreakdown from "../components/DomainBreakdown";
import type { AnalysisResponse } from "../types";

const RISK_CONFIG = {
  HIGH: {
    color: "#EF4444",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "alert-circle" as const,
  },
  MEDIUM: {
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "warning" as const,
  },
  LOW: {
    color: "#10B981",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "checkmark-circle" as const,
  },
};

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
  const risk = RISK_CONFIG[result.risk_level];

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
        <VerdictBadge
          verdict={result.verdict}
          confidence={result.confidence}
        />

        {/* Confidence Gauge */}
        <View className="mt-8 items-center">
          <ConfidenceGauge
            confidence={result.confidence}
            verdict={result.verdict}
          />
        </View>

        {/* Risk Level */}
        <View
          className="mt-6 flex-row items-center justify-center rounded-xl px-5 py-3.5"
          style={{
            backgroundColor: risk.bg,
            borderWidth: 1,
            borderColor: risk.border,
          }}
        >
          <Ionicons name={risk.icon} size={18} color={risk.color} />
          <Text className="ml-2 text-sm text-ink-secondary">Risk Level: </Text>
          <Text className="text-sm font-bold" style={{ color: risk.color }}>
            {result.risk_level}
          </Text>
        </View>

        {/* Domain Breakdown */}
        <View className="mt-6">
          <DomainBreakdown domains={result.domains} />
        </View>

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
        <View className="mt-6 items-center pb-6">
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
      </View>
    </ScrollView>
  );
}
