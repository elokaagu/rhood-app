import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles from "./ListenScreen.styles";

const DEFAULT_COPY = {
  title: "Share Your Mix",
  descriptionNoMixes:
    "Upload your own DJ mix and connect with the community",
  descriptionHasMixes: "Add another mix or edit from your Profile",
  buttonNoMixes: "Upload Mix",
  /** Opens upload flow; manage pins/edits on Profile */
  buttonHasMixes: "Upload another mix",
};

/**
 * Listen tab footer CTA (upload / manage mixes).
 * `bottomSpacing` mirrors list padding — parent could absorb this later if you centralize layout.
 */
export default function ListenScreenFooter({
  hasUserMixes,
  onUploadMix,
  copy: copyOverrides,
}) {
  const copy = { ...DEFAULT_COPY, ...copyOverrides };
  const description = hasUserMixes
    ? copy.descriptionHasMixes
    : copy.descriptionNoMixes;
  const buttonLabel = hasUserMixes ? copy.buttonHasMixes : copy.buttonNoMixes;

  return (
    <View style={styles.listenScreenFooterRoot}>
      <View style={styles.uploadSection}>
        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>{copy.title}</Text>
          <Text style={styles.uploadDescription}>{description}</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={onUploadMix}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            <Text style={styles.uploadButtonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bottomSpacing} />
    </View>
  );
}
