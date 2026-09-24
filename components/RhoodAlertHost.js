import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TextInput, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import RhoodModal from "./RhoodModal";
import {
  subscribeRhoodAlert,
  inferRhoodAlertType,
} from "../lib/rhoodAlert";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../lib/sharedStyles";

const EMPTY = {
  visible: false,
  kind: "alert",
  type: "info",
  title: "",
  message: "",
  buttons: [{ text: "OK" }],
  options: [],
  cancelButtonIndex: undefined,
  destructiveButtonIndex: undefined,
  onPress: null,
};

export default function RhoodAlertHost() {
  const [state, setState] = useState(EMPTY);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    return subscribeRhoodAlert((payload) => {
      setPromptValue("");
      setState({
        visible: true,
        kind: payload.kind || "alert",
        type: payload.type || inferRhoodAlertType(payload.title, payload.buttons),
        title: payload.title || "",
        message: payload.message || "",
        buttons: payload.buttons || [{ text: "OK" }],
        options: payload.options || [],
        cancelButtonIndex: payload.cancelButtonIndex,
        destructiveButtonIndex: payload.destructiveButtonIndex,
        onPress: payload.onPress || null,
      });
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const runButton = useCallback(
    (button) => {
      close();
      if (state.kind === "prompt") {
        button?.onPress?.(promptValue);
        return;
      }
      button?.onPress?.();
    },
    [close, promptValue, state.kind]
  );

  const alertLayout = useMemo(() => {
    if (state.kind !== "alert") return null;
    const buttons = state.buttons || [];
    if (buttons.length <= 2) {
      const cancel = buttons.find((b) => b.style === "cancel");
      const other = buttons.find((b) => b !== cancel) || buttons[0];
      const primary = other || { text: "OK" };
      const secondary = buttons.length > 1 ? cancel || buttons[0] : null;
      if (secondary && secondary === primary) {
        return { primary, secondary: buttons[1] || null };
      }
      return { primary, secondary };
    }
    return { list: buttons, primary: null, secondary: null };
  }, [state.kind, state.buttons]);

  const sheetOptions = useMemo(() => {
    if (state.kind !== "sheet") return [];
    return (state.options || []).map((label, index) => ({
      label,
      index,
      isCancel: index === state.cancelButtonIndex,
      isDestructive: index === state.destructiveButtonIndex,
    }));
  }, [state.kind, state.options, state.cancelButtonIndex, state.destructiveButtonIndex]);

  const promptButtons = useMemo(() => {
    if (state.kind !== "prompt") return { primary: { text: "OK" }, secondary: null };
    const buttons = state.buttons || [];
    const cancel = buttons.find((b) => b.style === "cancel");
    const other = buttons.find((b) => b !== cancel) || buttons[buttons.length - 1];
    return { primary: other || { text: "OK" }, secondary: cancel || null };
  }, [state.kind, state.buttons]);

  const listRows =
    state.kind === "sheet"
      ? sheetOptions.filter((o) => !o.isCancel)
      : alertLayout?.list || [];

  const cancelSheet = sheetOptions.find((o) => o.isCancel);

  const bodyAccessory =
    state.kind === "prompt" ? (
      <TextInput
        style={styles.promptInput}
        value={promptValue}
        onChangeText={setPromptValue}
        placeholder="Type here"
        placeholderTextColor={COLORS.textMuted}
        autoFocus
      />
    ) : listRows.length ? (
      <View style={styles.optionList}>
        {listRows.map((row) => {
          const label = row.label || row.text;
          const index = row.index;
          const destructive = row.isDestructive || row.style === "destructive";
          return (
            <TouchableOpacity
              key={`${label}-${index ?? label}`}
              style={styles.optionRow}
              onPress={() => {
                close();
                if (state.kind === "sheet") {
                  state.onPress?.(index);
                  return;
                }
                row.onPress?.();
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  destructive && styles.optionTextDestructive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ) : null;

  if (!state.visible) return null;

  const isList = Boolean(listRows.length);
  const primary =
    state.kind === "prompt"
      ? promptButtons.primary
      : isList
        ? cancelSheet
          ? { text: cancelSheet.label, onPress: () => state.onPress?.(cancelSheet.index) }
          : { text: "Close" }
        : alertLayout?.primary;
  const secondary =
    state.kind === "prompt"
      ? promptButtons.secondary
      : isList
        ? null
        : alertLayout?.secondary;

  return (
    <RhoodModal
      visible={state.visible}
      onClose={() => {
        close();
        if (state.kind === "sheet" && cancelSheet) {
          state.onPress?.(cancelSheet.index);
        }
      }}
      type={state.type}
      title={state.title || (state.kind === "sheet" ? "Choose" : "R/HOOD")}
      message={state.message}
      bodyAccessory={bodyAccessory}
      primaryButtonText={primary?.text || "OK"}
      onPrimaryPress={() => {
        if (state.kind === "sheet" && isList) {
          close();
          if (cancelSheet) state.onPress?.(cancelSheet.index);
          return;
        }
        runButton(primary);
      }}
      secondaryButtonText={secondary?.text}
      onSecondaryPress={
        secondary ? () => runButton(secondary) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  optionList: {
    width: "100%",
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
  },
  optionText: {
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.primary,
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.semibold,
  },
  optionTextDestructive: {
    color: COLORS.textPrimary,
  },
  promptInput: {
    width: "100%",
    marginTop: SPACING.md,
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.base,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.base,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.primary,
    fontSize: TYPOGRAPHY.md,
  },
});
