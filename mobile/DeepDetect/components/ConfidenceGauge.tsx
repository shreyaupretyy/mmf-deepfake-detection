import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Props {
  confidence: number;
  verdict: "AUTHENTIC" | "MANIPULATED" | "INCONCLUSIVE";
}

const COLORS = {
  AUTHENTIC: "#10B981",
  MANIPULATED: "#EF4444",
  INCONCLUSIVE: "#F59E0B",
};

export default function ConfidenceGauge({ confidence, verdict }: Props) {
  const pct = Math.round(confidence * 100);
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - confidence);
  const color = COLORS[verdict];

  return (
    <View className="items-center">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={progress}
            strokeLinecap="round"
            transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          />
        </Svg>
        {/* Center text */}
        <View
          className="absolute items-center justify-center"
          style={{ width: size, height: size }}
        >
          <Text className="text-4xl font-bold text-ink-dark">{pct}%</Text>
          <Text className="text-xs text-ink-muted">confidence</Text>
        </View>
      </View>
    </View>
  );
}
