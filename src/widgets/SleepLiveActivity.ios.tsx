import { HStack, Image, Link, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";

export type SleepLiveActivityProps = {
  babyName: string;
  startedAt: string;
  startedAtLabel: string;
};

const SleepLiveActivity = (props: SleepLiveActivityProps, environment: LiveActivityEnvironment) => {
  "widget";
  const startedAt = new Date(props.startedAt);
  const timerEndsAt = new Date(startedAt.getTime() + 8 * 60 * 60 * 1000);
  const primary = environment.isLuminanceReduced ? "#FFFFFF" : "#20332E";
  const secondary = environment.isLuminanceReduced ? "#D5DED9" : "#61716C";

  const elapsed = (
    <Text
      timerInterval={{ lower: startedAt, upper: timerEndsAt }}
      countsDown={false}
      modifiers={[font({ weight: "semibold", size: 20 }), foregroundStyle(primary)]}
    />
  );
  const stopLink = (
    <Link destination="uykuva://sleep/stop" modifiers={[padding({ horizontal: 12, vertical: 8 })]}>
      <Text modifiers={[font({ weight: "bold", size: 14 }), foregroundStyle("#FFFFFF")]}>Uyandı · kaydı bitir</Text>
    </Link>
  );

  return {
    banner: (
      <VStack spacing={8} modifiers={[padding({ all: 14 })]}>
        <HStack spacing={10}>
          <Image systemName="moon.zzz.fill" color="#447465" />
          <VStack alignment="leading" spacing={3}>
            <Text modifiers={[font({ weight: "bold", size: 16 }), foregroundStyle(primary)]}>Bebek uyuyor</Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>
              {props.babyName} · Başladı {props.startedAtLabel}
            </Text>
            {elapsed}
          </VStack>
        </HStack>
        {stopLink}
      </VStack>
    ),
    compactLeading: <Image systemName="moon.zzz.fill" color="#447465" />,
    compactTrailing: elapsed,
    minimal: <Image systemName="moon.zzz.fill" color="#447465" />,
    expandedLeading: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 8 })]}>
        <Image systemName="moon.zzz.fill" color="#447465" />
        <Text modifiers={[font({ weight: "bold", size: 12 }), foregroundStyle(primary)]}>Uyuyor</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={4} modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>Başladı {props.startedAtLabel}</Text>
        {elapsed}
      </VStack>
    ),
    expandedBottom: stopLink,
  };
};

export default createLiveActivity("UykuTakibi", SleepLiveActivity);
