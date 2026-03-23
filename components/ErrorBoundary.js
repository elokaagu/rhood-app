import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONT_BODY, FONT_HEADING } from "./connectionsStyles/tokens";

/** Shallow compare reset key arrays (navigation route id, user id, etc.). */
function didResetKeysChange(prev, next) {
  if (prev === next) return false;
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    if (prev[i] !== next[i]) return true;
  }
  return false;
}

/**
 * Catches render errors in the child tree and shows a recoverable fallback.
 *
 * @param {React.ReactNode} children
 * @param {(error: Error, errorInfo: import('react').ErrorInfo) => void} [onError] — e.g. Sentry, logging
 * @param {() => void} [onRetry] — runs after clearing boundary state (navigation bump, refetch, etc.)
 * @param {unknown[]} [resetKeys] — when any value changes while errored, boundary state clears. Use with `key` on children if the subtree must remount.
 * @param {(args: { error: Error, errorInfo: import('react').ErrorInfo | null, retry: () => void }) => React.ReactNode} [renderFallback] — full custom error UI
 * @param {string} [title]
 * @param {string} [message]
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
    try {
      this.props.onError?.(error, errorInfo);
    } catch (reportErr) {
      if (__DEV__) console.warn("ErrorBoundary onError failed:", reportErr);
    }
  }

  componentDidUpdate(prevProps) {
    const { resetKeys } = this.props;
    if (
      this.state.hasError &&
      Array.isArray(resetKeys) &&
      didResetKeysChange(prevProps.resetKeys, resetKeys)
    ) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  }

  handleTryAgain = () => {
    const { onRetry } = this.props;
    try {
      onRetry?.();
    } catch (e) {
      if (__DEV__) console.warn("ErrorBoundary onRetry failed:", e);
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const {
      children,
      renderFallback,
      title = "Something went wrong",
      message = "This screen hit an unexpected error. You can try again, or go back if the problem continues.",
    } = this.props;

    if (!this.state.hasError) {
      return children;
    }

    const { error, errorInfo } = this.state;

    if (typeof renderFallback === "function") {
      return renderFallback({
        error,
        errorInfo,
        retry: this.handleTryAgain,
      });
    }

    const componentStack = errorInfo?.componentStack?.trim();

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{message}</Text>
            <Text style={styles.hint}>
              Try again resets this view only. If it keeps failing, go back or
              restart the app.
            </Text>

            {__DEV__ && error ? (
              <View style={styles.errorPanel}>
                <Text style={styles.errorPanelLabel}>Error (dev)</Text>
                <Text style={styles.errorMono} selectable>
                  {error.toString()}
                </Text>
                {error.stack ? (
                  <>
                    <Text style={styles.errorPanelLabel}>Stack</Text>
                    <Text style={styles.errorMonoSmall} selectable>
                      {error.stack}
                    </Text>
                  </>
                ) : null}
                {componentStack ? (
                  <>
                    <Text style={styles.errorPanelLabel}>Component stack</Text>
                    <Text style={styles.errorMonoSmall} selectable>
                      {componentStack}
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.handleTryAgain}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const LIME = "hsl(75, 100%, 60%)";
const BG = "hsl(0, 0%, 0%)";
const MUTED = "hsl(0, 0%, 60%)";
const CARD = "hsl(0, 0%, 8%)";
const BORDER = "hsl(0, 0%, 15%)";
const DANGER = "hsl(0, 75%, 58%)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "stretch",
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_HEADING,
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 0.75,
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 80%)",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    fontFamily: FONT_BODY,
    color: MUTED,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 24,
  },
  errorPanel: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 24,
  },
  errorPanelLabel: {
    fontSize: 11,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  errorMono: {
    color: DANGER,
    fontSize: 12,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  errorMonoSmall: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 11,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: LIME,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 15,
    fontFamily: FONT_BODY,
    fontWeight: "600",
  },
});
