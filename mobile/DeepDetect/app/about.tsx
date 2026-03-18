import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STEPS = [
  {
    title: "Upload media",
    desc: "Select a photo or video from your gallery, or take one with your camera.",
    icon: "cloud-upload-outline" as const,
  },
  {
    title: "AI analysis",
    desc: "Three neural networks analyze texture, frequency spectrum, and semantic content simultaneously.",
    icon: "hardware-chip-outline" as const,
  },
  {
    title: "Get results",
    desc: "Receive a verdict with confidence score, risk level, and domain-by-domain breakdown.",
    icon: "checkmark-done-outline" as const,
  },
];

const DOMAINS = [
  {
    icon: "layers-outline" as const,
    name: "Spatial Analysis",
    color: "#3B82F6",
    desc: "Examines texture patterns, noise consistency, and structural anomalies at the pixel level using the Xception architecture.",
  },
  {
    icon: "analytics-outline" as const,
    name: "Frequency Analysis",
    color: "#8B5CF6",
    desc: "Applies FFT to detect artifacts in the frequency spectrum that are invisible to the human eye but common in generated media.",
  },
  {
    icon: "eye-outline" as const,
    name: "Semantic Analysis",
    color: "#06B6D4",
    desc: "Uses CLIP to understand visual semantics and detect contextual inconsistencies that suggest manipulation.",
  },
];

const shadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 6,
  elevation: 1,
};

export default function AboutScreen() {
  return (
    <ScrollView className="flex-1 bg-surface-base" bounces={false}>
      {/* ── App identity ── */}
      <View className="items-center px-6 pt-10 pb-8">
        <View
          className="mb-4 h-18 w-18 items-center justify-center rounded-3xl"
          style={{
            backgroundColor: "#EEF2FF",
            width: 72,
            height: 72,
          }}
        >
          <Ionicons name="shield-checkmark" size={36} color="#6366F1" />
        </View>
        <Text
          className="text-xl font-bold text-ink-dark"
          style={{ letterSpacing: -0.4 }}
        >
          DeepDetect
        </Text>
        <Text
          className="mt-1.5 text-center text-ink-muted"
          style={{ fontSize: 14, lineHeight: 20 }}
        >
          AI-powered multi-domain{"\n"}media forensics
        </Text>
      </View>

      {/* ── How it works ── */}
      <View className="px-6">
        <Text
          className="mb-4 text-xs font-bold uppercase text-ink-muted"
          style={{ letterSpacing: 0.8 }}
        >
          How it works
        </Text>

        <View
          className="rounded-2xl bg-surface-card p-6"
          style={shadow}
        >
          {STEPS.map((step, i) => (
            <View
              key={step.title}
              className={`flex-row items-start ${i < STEPS.length - 1 ? "mb-6" : ""}`}
            >
              <View
                className="mr-4 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "#EEF2FF",
                  width: 40,
                  height: 40,
                }}
              >
                <Ionicons name={step.icon} size={20} color="#6366F1" />
              </View>
              <View className="flex-1 pt-0.5">
                <Text
                  className="text-sm font-semibold text-ink-dark"
                  style={{ letterSpacing: -0.1 }}
                >
                  {step.title}
                </Text>
                <Text
                  className="mt-1 text-xs text-ink-muted"
                  style={{ lineHeight: 18 }}
                >
                  {step.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Analysis domains ── */}
      <View className="px-6 pt-10">
        <Text
          className="mb-4 text-xs font-bold uppercase text-ink-muted"
          style={{ letterSpacing: 0.8 }}
        >
          Analysis domains
        </Text>

        {DOMAINS.map((domain, i) => (
          <View
            key={domain.name}
            className={`rounded-2xl bg-surface-card p-5 ${
              i < DOMAINS.length - 1 ? "mb-3" : ""
            }`}
            style={shadow}
          >
            <View className="mb-3 flex-row items-center">
              <View
                className="mr-3 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: domain.color + "12",
                  width: 36,
                  height: 36,
                }}
              >
                <Ionicons name={domain.icon} size={18} color={domain.color} />
              </View>
              <Text
                className="text-sm font-semibold text-ink-dark"
                style={{ letterSpacing: -0.1 }}
              >
                {domain.name}
              </Text>
            </View>
            <Text
              className="text-xs text-ink-secondary"
              style={{ lineHeight: 18 }}
            >
              {domain.desc}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Footer ── */}
      <View className="items-center px-6 pt-10 pb-12">
        <Text className="text-xs text-ink-faint">Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}
