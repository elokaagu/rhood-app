import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Keyboard,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Dev overlay for keyboard / input overlap debugging.
 *
 * @param {boolean} isVisible
 * @param {() => void} onToggle
 * @param {React.RefObject} inputRef — attach the same ref to your TextInput (or a wrapper View).
 */
const KeyboardDebugger = ({ isVisible = false, onToggle, inputRef }) => {
  const [keyboardData, setKeyboardData] = useState({
    height: 0,
    isVisible: false,
    duration: 0,
    easing: "",
  });
  const [screenData, setScreenData] = useState({
    height: Dimensions.get("window").height,
    width: Dimensions.get("window").width,
  });
  const [logs, setLogs] = useState([]);
  const [inputMeasurements, setInputMeasurements] = useState(null);

  const flushMeasureInput = useCallback(() => {
    const node = inputRef?.current;
    if (!node || typeof node.measure !== "function") {
      return;
    }
    node.measure((x, y, width, height, pageX, pageY) => {
      const measurements = {
        x: pageX,
        y: pageY,
        width,
        height,
        bottom: pageY + height,
        right: pageX + width,
      };
      setInputMeasurements(measurements);
      const win = Dimensions.get("window");
      setLogs((prev) =>
        [
          {
            timestamp: new Date().toLocaleTimeString(),
            event: "INPUT_MEASURED",
            data: {
              ...measurements,
              screenHeight: win.height,
              screenWidth: win.width,
            },
          },
          ...prev,
        ].slice(0, 20)
      );
    });
  }, [inputRef]);

  // Keyboard + dimension listeners: register once; use Dimensions.get when logging for fresh values.
  useEffect(() => {
    const pushLog = (event, data) => {
      setLogs((prev) =>
        [{ timestamp: new Date().toLocaleTimeString(), event, data }, ...prev].slice(
          0,
          20
        )
      );
    };

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const newData = {
          height: event.endCoordinates.height,
          isVisible: true,
          duration: event.duration || 0,
          easing: event.easing || "",
        };
        setKeyboardData(newData);

        const win = Dimensions.get("window");
        pushLog("KEYBOARD_SHOW", {
          height: event.endCoordinates.height,
          duration: event.duration,
          screenHeight: win.height,
          screenWidth: win.width,
        });
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (event) => {
        const newData = {
          height: 0,
          isVisible: false,
          duration: event.duration || 0,
          easing: event.easing || "",
        };
        setKeyboardData(newData);

        const win = Dimensions.get("window");
        pushLog("KEYBOARD_HIDE", {
          duration: event.duration,
          screenHeight: win.height,
          screenWidth: win.width,
        });
      }
    );

    const dimensionListener = Dimensions.addEventListener(
      "change",
      ({ window }) => {
        setScreenData({
          height: window.height,
          width: window.width,
        });

        pushLog("SCREEN_ROTATION", {
          height: window.height,
          width: window.width,
        });
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
      dimensionListener?.remove();
    };
  }, []);

  // Re-measure when overlay opens or keyboard visibility changes (layout may have shifted).
  useEffect(() => {
    if (!isVisible) return undefined;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(flushMeasureInput);
    });
    return () => cancelAnimationFrame(id);
  }, [isVisible, keyboardData.isVisible, keyboardData.height, flushMeasureInput]);

  const clearLogs = () => {
    setLogs([]);
  };

  const calculateVisibility = () => {
    if (!inputMeasurements || !keyboardData.isVisible) {
      return { isVisible: true, overlap: 0 };
    }

    const keyboardTop = screenData.height - keyboardData.height;
    const inputBottom = inputMeasurements.bottom;
    const overlap = Math.max(0, inputBottom - keyboardTop);

    return {
      isVisible: overlap === 0,
      overlap,
    };
  };

  const visibility = calculateVisibility();

  if (!isVisible) return null;

  /** Ref object may exist before .current is set; Remeasure is still useful after mount. */
  const remeasureEnabled = !!inputRef;

  return (
    <View style={styles.debuggerContainer}>
      <View style={styles.debuggerHeader}>
        <Text style={styles.debuggerTitle}>Keyboard Debugger</Text>
        <TouchableOpacity onPress={onToggle} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
      </View>

      <View style={styles.debuggerContent}>
        {/* Current Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <Text style={styles.statusText}>
            Keyboard: {keyboardData.isVisible ? "Visible" : "Hidden"} (
            {keyboardData.height}px)
          </Text>
          <Text style={styles.statusText}>
            Screen: {screenData.height}px × {screenData.width}px
          </Text>
          <Text
            style={[
              styles.statusText,
              {
                color: visibility.isVisible
                  ? "hsl(75, 100%, 60%)"
                  : "hsl(0, 100%, 50%)",
              },
            ]}
          >
            Input Field:{" "}
            {!inputRef
              ? "Pass inputRef (from useKeyboardDebugger) to KeyboardDebugger"
              : !inputMeasurements
                ? "Not measured yet — tap Remeasure (after TextInput mounts)"
                : visibility.isVisible
                  ? "Visible"
                  : `Blocked (${visibility.overlap}px overlap)`}
          </Text>
          <TouchableOpacity
            style={styles.remeasureButton}
            onPress={flushMeasureInput}
            disabled={!remeasureEnabled}
          >
            <Text
              style={[
                styles.remeasureButtonText,
                !remeasureEnabled && styles.remeasureButtonTextDisabled,
              ]}
            >
              Remeasure input layout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Measurements */}
        {inputMeasurements && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Input Field Position</Text>
            <Text style={styles.statusText}>
              X: {inputMeasurements.x.toFixed(0)}px
            </Text>
            <Text style={styles.statusText}>
              Y: {inputMeasurements.y.toFixed(0)}px
            </Text>
            <Text style={styles.statusText}>
              Width: {inputMeasurements.width.toFixed(0)}px
            </Text>
            <Text style={styles.statusText}>
              Height: {inputMeasurements.height.toFixed(0)}px
            </Text>
            <Text style={styles.statusText}>
              Bottom: {inputMeasurements.bottom.toFixed(0)}px
            </Text>
          </View>
        )}

        {/* Recent Logs */}
        <View style={styles.logsSection}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log.timestamp} - {log.event}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

/**
 * @returns {{
 *   isDebuggerVisible: boolean,
 *   toggleDebugger: () => void,
 *   inputRef: React.RefObject,
 * }}
 *
 * Attach `inputRef` to the field you care about, then render:
 * `<KeyboardDebugger isVisible={isDebuggerVisible} onToggle={toggleDebugger} inputRef={inputRef} />`
 */
export const useKeyboardDebugger = () => {
  const [isDebuggerVisible, setIsDebuggerVisible] = useState(false);
  const inputRef = useRef(null);

  const toggleDebugger = useCallback(() => {
    setIsDebuggerVisible((prev) => !prev);
  }, []);

  return {
    isDebuggerVisible,
    toggleDebugger,
    inputRef,
  };
};

const styles = StyleSheet.create({
  debuggerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    zIndex: 9999,
  },
  debuggerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(75, 100%, 60%)",
  },
  debuggerTitle: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
  },
  debuggerContent: {
    flex: 1,
    padding: 16,
  },
  statusSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  sectionTitle: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  statusText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 14,
    marginBottom: 4,
    fontFamily: "monospace",
  },
  remeasureButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "hsl(0, 0%, 20%)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 40%)",
  },
  remeasureButtonText: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 13,
    fontWeight: "600",
  },
  remeasureButtonTextDisabled: {
    color: "hsl(0, 0%, 45%)",
  },
  logsSection: {
    flex: 1,
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clearButton: {
    backgroundColor: "hsl(0, 100%, 50%)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearButtonText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 12,
    fontWeight: "600",
  },
  logsContainer: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  logText: {
    color: "hsl(0, 0%, 80%)",
    fontSize: 12,
    marginBottom: 2,
    fontFamily: "monospace",
  },
});

export default KeyboardDebugger;
