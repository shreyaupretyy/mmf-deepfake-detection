import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  verdict: "AUTHENTIC" | "MANIPULATED" | "INCONCLUSIVE";
  confidence: number;
}

const VERDICT_CONFIG = {
  AUTHENTIC: {
    color: "#10B981",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "shield-checkmark" as const,
    label: "Authentic",
    subtitle: "No signs of manipulation detected",
  },
  MANIPULATED: {
    color: "#EF4444",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "alert-circle" as const,
    label: "Manipulated",
    subtitle: "Signs of digital manipulation found",
  },
  INCONCLUSIVE: {
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "help-circle" as const,
    label: "Inconclusive",
    subtitle: "Unable to determine authenticity",
  },
};

export default function VerdictBadge({ verdict, confidence }: Props) {
  const cfg = VERDICT_CONFIG[verdict];
  const pct = Math.round(confidence * 100);

  return (
    <View
      className="w-full items-center rounded-2xl px-6 py-8"
      style={{
        backgroundColor: cfg.bg,
        borderWidth: 1,
        borderColor: cfg.border,
      }}
    >
      <View
        className="mb-4 h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: cfg.color + "20" }}
      >
        <Ionicons name={cfg.icon} size={32} color={cfg.color} />
      </View>
      <Text className="text-2xl font-bold" style={{ color: cfg.color }}>
        {cfg.label}
      </Text>
      <Text className="mt-1.5 text-sm font-medium text-ink-secondary">
        {pct}% confidence
      </Text>
      <Text className="mt-1 text-xs text-ink-muted">{cfg.subtitle}</Text>
    </View>
  );
}
