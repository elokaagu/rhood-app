import * as React from "react";
import { Platform, View, Pressable, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { RH } from "../design/tokens";

type Props = BottomTabBarProps & {
  /** When true we dock the bar to bottom (e.g., when mini player shows) */
  docked?: boolean;
};

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  docked,
}: Props) {
  const insets = useSafeAreaInsets();

  // Keyboard handling: when the tabBar is hidden by RN Navigation (on keyboard),
  // this component won't render, so no special logic needed here.

  const baseBottom =
    (docked ? 0 : RH.tabbar.bottomInset) + Math.max(insets.bottom, 0);

  const Container: React.ComponentType<any> =
    Platform.OS === "ios" ? BlurView : View;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill]}>
      <Container
        intensity={Platform.OS === "ios" ? RH.tabbar.blurIntensity : undefined}
        tint="dark"
        style={[
          styles.bar,
          {
            left: RH.tabbar.sideInset,
            right: RH.tabbar.sideInset,
            bottom: baseBottom,
            height: RH.tabbar.height,
            borderRadius: RH.radius.xl,
            ...(Platform.OS !== "ios" && {
              backgroundColor: RH.color.bgElevated,
            }),
          },
        ]}
      >
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? (options.tabBarLabel as string)
                : options.title !== undefined
                ? options.title
                : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            const Icon =
              (options.tabBarIcon as any)?.({
                focused: isFocused,
                color: isFocused ? RH.color.active : RH.color.textSecondary,
                size: RH.tabbar.icon,
              }) ?? null;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.item}
              >
                {Icon}
                <Text
                  style={[
                    styles.label,
                    {
                      color: isFocused
                        ? RH.color.active
                        : RH.color.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {label as string}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderWidth: RH.tabbar.borderWidth,
    borderColor: RH.color.stroke,
    overflow: "hidden",
    shadowColor: RH.color.shadow,
    shadowOpacity: RH.tabbar.shadowOpacity,
    shadowRadius: RH.tabbar.shadowRadius,
    shadowOffset: { width: 0, height: RH.tabbar.shadowOffsetY },
    elevation: 16, // Android shadow
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: RH.space.lg,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: RH.space.xs,
  },
  label: {
    fontSize: RH.tabbar.label,
    fontWeight: "600",
  },
});
