import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AnalysisResponse } from "../types";

interface Props {
  domains: AnalysisResponse["domains"];
}

const DOMAIN_CONFIG = {
  spatial: {
    icon: "layers-outline" as const,
    color: "#3B82F6",
    name: "Spatial",
  },
  frequency: {
    icon: "analytics-outline" as const,
    color: "#8B5CF6",
    name: "Frequency",
  },
  semantic: {
    icon: "eye-outline" as const,
    color: "#06B6D4",
    name: "Semantic",
  },
};

export default function DomainBreakdown({ domains }: Props) {
  return (
    <View
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <Text className="mb-4 text-sm font-bold text-ink-dark">
        Domain Analysis
      </Text>
      {(Object.keys(DOMAIN_CONFIG) as Array<keyof typeof DOMAIN_CONFIG>).map(
        (key, index, arr) => {
          const cfg = DOMAIN_CONFIG[key];
          const domain = domains[key];
          const pct = Math.round(domain.weight * 100);

          return (
            <View key={key} className={index < arr.length - 1 ? "mb-4" : ""}>
              <View className="mb-1.5 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    className="mr-2.5 h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: cfg.color + "15" }}
                  >
                    <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                  </View>
                  <Text className="text-sm font-medium text-ink-secondary">
                    {cfg.name}
                  </Text>
                </View>
                <Text
                  className="text-sm font-bold"
                  style={{ color: cfg.color }}
                >
                  {pct}%
                </Text>
              </View>
              {/* Progress bar */}
              <View
                className="h-2.5 rounded-full"
                style={{ backgroundColor: cfg.color + "15" }}
              >
                <View
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${Math.max(pct, 3)}%`,
                    backgroundColor: cfg.color,
                  }}
                />
              </View>
              <Text className="mt-1 text-xs text-ink-muted">
                {domain.label}
              </Text>
            </View>
          );
        }
      )}
    </View>
  );
}
