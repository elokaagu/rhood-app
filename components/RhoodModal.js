import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  Linking,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

const { width, height } = Dimensions.get("window");

const RhoodModal = ({
  visible,
  onClose,
  title,
  message,
  eventDetails = null,
  primaryButtonText = "OK",
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  type = "info", // 'info', 'success', 'warning', 'error'
  showCloseButton = true,
  showShareButton = false, // New prop to show share button
}) => {
  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle",
          color: COLORS.primary, // R/HOOD lime green
          bgColor: "hsl(75, 100%, 60%, 0.15)",
        };
      case "warning":
        return {
          icon: "warning",
          color: COLORS.primary, // Use R/HOOD lime instead of generic warning
          bgColor: "hsl(75, 100%, 60%, 0.15)",
        };
      case "error":
        return {
          icon: "close-circle",
          color: COLORS.primary, // Use R/HOOD lime instead of red
          bgColor: "hsl(75, 100%, 60%, 0.15)",
        };
      default:
        return {
          icon: "rhood-logo", // Custom type for R/HOOD logo
          color: COLORS.primary, // R/HOOD lime green
          bgColor: "hsl(75, 100%, 60%, 0.15)",
        };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  // Parse event details for enhanced display
  const handleLinkPress = (url) => {
    if (!url) return;

    const normalizedUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;

    Linking.openURL(normalizedUrl).catch((error) => {
      console.warn("Unable to open URL:", normalizedUrl, error);
    });
  };

  const renderTextWithLinks = (text) => {
    if (!text) return null;

    // Enhanced URL regex: matches http://, https://, www., or common domains
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
    const segments = [];
    let lastIndex = 0;
    let match;
    const urlMatches = [];

    // Find all URL matches and store them
    while ((match = urlRegex.exec(text)) !== null) {
      urlMatches.push({
        url: match[0],
        index: match.index,
        length: match[0].length,
      });
    }

    // If no URLs found, check if text contains "here" - might be a reference to a URL elsewhere
    if (urlMatches.length === 0) {
      return <Text>{text}</Text>;
    }

    // Build segments with URLs and text
    urlMatches.forEach((urlMatch, urlIndex) => {
      // Add text before URL
      if (urlMatch.index > lastIndex) {
        const textBefore = text.substring(lastIndex, urlMatch.index);
        segments.push({
          type: "text",
          value: textBefore,
          urlIndex: urlIndex,
        });
      }
      
      // Add URL
      segments.push({
        type: "url",
        value: urlMatch.url,
        urlIndex: urlIndex,
      });
      
      lastIndex = urlMatch.index + urlMatch.length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: "text",
        value: text.substring(lastIndex),
        urlIndex: urlMatches.length - 1,
      });
    }

    // Render segments
    return segments.map((segment, index) => {
      if (segment.type === "url") {
        // Replace URL with clickable "here"
        return (
          <Text
            key={`url-${index}`}
            style={styles.linkText}
            onPress={() => handleLinkPress(segment.value)}
          >
            here
          </Text>
        );
      }
      
      // Check if text segment contains "here" - make it clickable and link to nearest URL
      if (/\bhere\b/i.test(segment.value)) {
        // Find the URL to link to (use the URL associated with this segment, or the first one)
        const targetUrl = urlMatches[segment.urlIndex]?.url || urlMatches[0]?.url;
        if (targetUrl) {
          const parts = segment.value.split(/(\bhere\b)/gi);
          return (
            <Text key={`text-${index}`}>
              {parts.map((part, partIndex) => {
                if (/\bhere\b/i.test(part)) {
                  return (
                    <Text
                      key={`here-${partIndex}`}
                      style={styles.linkText}
                      onPress={() => handleLinkPress(targetUrl)}
                    >
                      {part}
                    </Text>
                  );
                }
                return part;
              })}
            </Text>
          );
        }
      }
      
      return <Text key={`text-${index}`}>{segment.value}</Text>;
    });
  };

  const renderDescriptionContent = (text) => {
    if (!text) return null;

    const lines = text.split(/\r?\n+/);

    return (
      <View style={styles.descriptionContainer}>
        {lines.map((line, lineIndex) => (
          <Text
            key={`description-line-${lineIndex}`}
            style={[
              styles.descriptionText,
              lineIndex > 0 && styles.descriptionLineSpacing,
            ]}
          >
            {renderTextWithLinks(line.trim())}
          </Text>
        ))}
      </View>
    );
  };

  const renderStructuredEventDetails = (details) => {
    if (!details) return null;

    const detailItems = [
      { type: "date", label: "Date", value: details.date },
      { type: "time", label: "Time", value: details.time },
      {
        type: "compensation",
        label: "Compensation",
        value: details.compensation,
      },
      { 
        type: "location", 
        label: "Location", 
        value: details.location,
        distance: details.distanceFormatted || null,
      },
    ].filter(
      (item) =>
        item.value !== null &&
        item.value !== undefined &&
        `${item.value}`.trim().length > 0
    );

    return (
      <View>
        {detailItems.length > 0 && (
          <View style={styles.eventDetailsGrid}>
            {detailItems.map((detail, index) => (
              <View
                key={`${detail.type}-${index}`}
                style={styles.eventDetailItem}
              >
                <View style={styles.eventDetailIcon}>
                  <Ionicons
                    name={getEventDetailIcon(detail.type)}
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.eventDetailContent}>
                  <Text style={styles.eventDetailLabel}>{detail.label}</Text>
                  <Text style={styles.eventDetailValue}>{detail.value}</Text>
                  {detail.distance && (
                    <Text style={styles.eventDetailDistance}>{detail.distance}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {details.description ? renderDescriptionContent(details.description) : null}

        {details.applicationsRemainingText ? (
          <View style={styles.applicationsContainer}>
            <View style={styles.applicationsIcon}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.applicationsText}>
              {details.applicationsRemainingText}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const parseEventDetails = (message) => {
    const lines = message.split("\n");
    const eventDetails = [];
    let description = "";
    let applicationsRemaining = "";

    lines.forEach((line, index) => {
      if (line.startsWith("Date:")) {
        eventDetails.push({ type: "date", value: line.replace("Date: ", "") });
      } else if (line.startsWith("Time:")) {
        eventDetails.push({ type: "time", value: line.replace("Time: ", "") });
      } else if (line.startsWith("Compensation:")) {
        eventDetails.push({
          type: "compensation",
          value: line.replace("Compensation: ", ""),
        });
      } else if (line.startsWith("Location:")) {
        eventDetails.push({
          type: "location",
          value: line.replace("Location: ", ""),
        });
      } else if (line.includes("applications remaining today")) {
        applicationsRemaining = line;
      } else if (line.trim() && !line.includes("applications remaining")) {
        description = line;
      }
    });

    return (
      <View>
        {/* Event Details Grid */}
        <View style={styles.eventDetailsGrid}>
          {eventDetails.map((detail, index) => (
            <View key={index} style={styles.eventDetailItem}>
              <View style={styles.eventDetailIcon}>
                <Ionicons
                  name={getEventDetailIcon(detail.type)}
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.eventDetailContent}>
                <Text style={styles.eventDetailLabel}>
                  {detail.type.charAt(0).toUpperCase() + detail.type.slice(1)}
                </Text>
                <Text style={styles.eventDetailValue}>{detail.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Description */}
        {description ? renderDescriptionContent(description) : null}

        {/* Applications Remaining */}
        {applicationsRemaining && (
          <View style={styles.applicationsContainer}>
            <View style={styles.applicationsIcon}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.applicationsText}>{applicationsRemaining}</Text>
          </View>
        )}
      </View>
    );
  };

  const getEventDetailIcon = (type) => {
    switch (type) {
      case "date":
        return "calendar-outline";
      case "time":
        return "time-outline";
      case "compensation":
        return "cash-outline";
      case "location":
        return "location-outline";
      default:
        return "information-circle-outline";
    }
  };

  const handlePrimaryPress = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else {
      onClose();
    }
  };

  const handleSecondaryPress = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else {
      onClose();
    }
  };

  const handleShare = async () => {
    try {
      // Build share message with opportunity details
      let shareMessage = `🎧 ${title}\n\n`;
      
      if (eventDetails) {
        if (eventDetails.description) {
          shareMessage += `${eventDetails.description}\n\n`;
        }
        
        const details = [];
        if (eventDetails.date) details.push(`📅 Date: ${eventDetails.date}`);
        if (eventDetails.time) details.push(`⏰ Time: ${eventDetails.time}`);
        if (eventDetails.location) details.push(`📍 Location: ${eventDetails.location}`);
        if (eventDetails.compensation) details.push(`💰 Compensation: ${eventDetails.compensation}`);
        if (eventDetails.distanceFormatted) details.push(`📏 Distance: ${eventDetails.distanceFormatted}`);
        
        if (details.length > 0) {
          shareMessage += details.join("\n") + "\n\n";
        }
      } else if (message) {
        shareMessage += `${message}\n\n`;
      }
      
      shareMessage += `Check it out on R/HOOD! 🎵`;
      
      await Share.share({
        message: shareMessage,
        title: `Share: ${title}`,
      });
    } catch (error) {
      console.warn("Error sharing opportunity:", error);
    }
  };

  const shouldRenderStructuredDetails =
    type === "info" && eventDetails && Object.keys(eventDetails).length > 0;

  const shouldRenderParsedDetails =
    !shouldRenderStructuredDetails &&
    type === "info" &&
    typeof message === "string" &&
    message.includes("Date:");

  const supplementalMessage =
    message &&
    message.trim().length > 0 &&
    (!eventDetails?.description ||
      message.trim() !== eventDetails.description?.trim())
      ? message
      : "";

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            {showShareButton && (
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {showCloseButton && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Icon */}
          <View
            style={[
              icon === "rhood-logo"
                ? styles.rhoodLogoContainer
                : styles.iconContainer,
              {
                backgroundColor:
                  icon === "rhood-logo" ? "transparent" : bgColor,
              },
            ]}
          >
            {icon === "rhood-logo" ? (
              <Image
                source={require("../assets/rhood_logo.webp")}
                style={styles.rhoodLogo}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name={icon} size={48} color={color} />
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>

            {/* Enhanced Message Parsing for Event Details */}
            {shouldRenderStructuredDetails ? (
              <View style={styles.eventDetailsContainer}>
                {renderStructuredEventDetails(eventDetails)}
              </View>
            ) : shouldRenderParsedDetails ? (
              <View style={styles.eventDetailsContainer}>
                {parseEventDetails(message)}
              </View>
            ) : (
              <>
                {message ? (
                  <Text style={styles.message}>
                    {renderTextWithLinks(message)}
                  </Text>
                ) : null}
              </>
            )}

            {shouldRenderStructuredDetails && supplementalMessage ? (
              <Text style={[styles.message, { marginTop: SPACING.md }]}>
                {renderTextWithLinks(supplementalMessage)}
              </Text>
            ) : null}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {secondaryButtonText && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSecondaryPress}
              >
                <Text style={styles.secondaryButtonText}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: color },
                !secondaryButtonText && styles.primaryButtonFull,
              ]}
              onPress={handlePrimaryPress}
            >
              <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...sharedStyles.modalOverlay,
  },
  modalContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.2)", // R/HOOD lime border
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  shareButton: {
    padding: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%, 0.3)", // R/HOOD lime border
  },
  rhoodLogoContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: SPACING.lg,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  rhoodLogo: {
    width: 72,
    height: 72,
    backgroundColor: "transparent",
  },
  content: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY["3xl"],
    fontFamily: TYPOGRAPHY.brand, // Use R/HOOD brand font
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.lg,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: SPACING.base,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.background, // Black text on lime background
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%, 0.4)", // R/HOOD lime border
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  // Enhanced Event Details Styles
  eventDetailsContainer: {
    width: "100%",
    marginTop: SPACING.sm,
  },
  eventDetailsGrid: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.1)",
  },
  eventDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  eventDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(75, 100%, 60%, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  eventDetailContent: {
    flex: 1,
  },
  eventDetailLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  eventDetailValue: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },
  eventDetailDistance: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: TYPOGRAPHY.medium,
  },
  descriptionContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.1)",
  },
  descriptionText: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  descriptionLineSpacing: {
    marginTop: SPACING.xs,
  },
  linkText: {
    color: "hsl(75, 100%, 60%)",
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  applicationsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "hsl(75, 100%, 60%, 0.1)",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.2)",
  },
  applicationsIcon: {
    marginRight: SPACING.xs,
  },
  applicationsText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
});

export default RhoodModal;
