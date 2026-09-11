import { StyleSheet, Dimensions } from "react-native";

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#000000", // Pure black background to match tab bar
  },
  screenContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000000", // Pure black background; dynamic paddingBottom for anchored tab bar
  },
  onboarding: {
    backgroundColor: "#000000", // Pure black background
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Minimal bottom padding for floating tab bar
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#000000", // Pure black background
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingLeft: 0, // Remove any left padding
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start", // Ensure left alignment
  },
  logoText: {
    color: "#C2CC06", // Brand lime green
    fontSize: 18,
    fontFamily: "TS Block Bold",
    letterSpacing: 1,
  },
  logoTextGreen: {
    color: "#C2CC06", // Brand lime green - matches the green logo
    fontSize: 18,
    fontFamily: "TS Block Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoTextWhite: {
    color: "#FFFFFF", // White - matches the white logo
    fontSize: 18,
    fontFamily: "TS Block Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoTextBlack: {
    color: "#000000", // Black - matches the black logo
    fontSize: 18,
    fontFamily: "TS Block Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  logoIcon: {
    height: 32,
    width: 32,
    marginRight: 8,
  },
  logoImage: {
    height: 36,
    width: 140, // Reduced size for better proportion
    alignSelf: "flex-start", // Ensure left alignment
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent", // Transparent background
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)", // Subtle border
  },
  headerIconText: {
    fontSize: 16,
    color: "#FFFFFF", // Brand white
    fontWeight: "300",
  },
  screen: {
    flex: 1,
    padding: 20,
    paddingBottom: 20, // Minimal bottom padding for floating tab bar
    backgroundColor: "#000000", // Pure black background
  },
  screenTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 24, // 120% of 20pt
    letterSpacing: 0, // Tracking set to 0
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "#C2CC06", // Brand lime green
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 28.8, // 120% of 24pt
    textTransform: "uppercase",
  },
  // TS Block Bold for impactful headings
  tsBlockBoldHeading: {
    fontFamily: "TS Block Bold",
    fontSize: 22,
    color: "#FFFFFF", // Brand white
    textAlign: "left", // Left aligned as per guidelines
    textTransform: "uppercase", // Always uppercase
    lineHeight: 26, // Tight line height for stacked effect
    letterSpacing: 1, // Slight spacing for impact
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 19.6, // 140% of 14pt for better readability
  },
  form: {
    width: "100%",
    marginBottom: 30,
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  formTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24, // 120% of 20pt
    letterSpacing: 0, // Tracking set to 0
  },
  label: {
    color: "#FFFFFF", // Brand white text
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 15,
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  input: {
    backgroundColor: "hsl(0, 0%, 10%)", // Input background
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white text
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  dropdownButton: {
    backgroundColor: "hsl(0, 0%, 10%)", // Input background
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white text
    flex: 1,
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  placeholderText: {
    color: "hsl(0, 0%, 50%)", // Muted text for placeholder
  },
  dropdownArrow: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)", // Muted foreground
  },
  dropdown: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white text
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  genreContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  genreTag: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  genreTagSelected: {
    backgroundColor: "#C2CC06", // Brand lime green
    borderColor: "#C2CC06",
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white text
    lineHeight: 14.4, // 120% of 12pt
    letterSpacing: 0, // Tracking set to 0
  },
  genreTagTextSelected: {
    color: "hsl(0, 0%, 0%)", // Black text on selected
  },
  button: {
    backgroundColor: "#C2CC06", // Brand lime green
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 15,
    // Removed glow effects
  },
  buttonText: {
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 19.2, // 120% of 16pt
    letterSpacing: 0, // Tracking set to 0
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    lineHeight: 19.2, // 120% of 16pt
    marginBottom: 20,
    letterSpacing: 0, // Tracking set to 0
  },
  featuresCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  featuresTitle: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 15,
    lineHeight: 21.6, // 120% of 18pt
    letterSpacing: 0, // Tracking set to 0
  },
  featureItem: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
    lineHeight: 16.8, // 120% of 14pt
    letterSpacing: 0, // Tracking set to 0
  },
  eventCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    // Removed glow effects
  },
  eventDJ: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 8,
  },
  eventInfo: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 4,
  },
  eventActions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  actionText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "#FFFFFF", // Brand white text
  },
  messageCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  messageName: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 5,
  },
  messagePreview: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)", // More muted text
  },
  profileCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  profileDJ: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
    // Removed glow effects
  },
  profileName: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 5,
  },
  profileCity: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
  },
  editButton: {
    backgroundColor: "#C2CC06", // Brand lime green
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    // Removed glow effects
  },
  editButtonText: {
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
    backgroundColor: "rgba(0, 0, 0, 0.98)",
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: "center",
    flexDirection: "column",
    gap: 4,
    marginHorizontal: 0,
    backgroundColor: "transparent", // Ensure 0 opacity for all tabs
  },
  activeTab: {
    backgroundColor: "transparent", // Remove background for active tab
  },
  tabText: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "500", // Medium weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textTransform: "capitalize", // Proper capitalization instead of uppercase
    letterSpacing: 0,
    textAlign: "center",
  },
  activeTabText: {
    color: "hsl(75, 100%, 60%)", // Brand lime green for active text
    fontWeight: "500", // Medium weight to match inactive tabs
  },

  // Notification Badge Styles
  tabIconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#FF3B30", // iOS red
    alignItems: "center",
    justifyContent: "center",
    minWidth: 22,
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#000000", // Black border to stand out
  },
  notificationBadgeSingleDigit: {
    minWidth: 18,
    minHeight: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 11,
  },
  tabNotificationBadge: {
    top: -8,
    right: -10,
  },
  menuNotificationBadge: {
    top: -4,
    right: -4,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 13,
  },
  // Empty Opportunities Screen Styles
  emptyOpportunitiesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
    padding: 40,
    paddingHorizontal: 20,
  },
  emptyOpportunitiesTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    width: "100%",
  },
  emptyOpportunitiesSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    width: "100%",
    lineHeight: 20,
  },
  opportunitiesContainer: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  opportunitiesHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  /** Kept for any legacy reference; hero copy uses RhoodScreenTitleBlock */
  opportunitiesSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  dailyApplicationChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    marginTop: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsla(75, 100%, 60%, 0.18)",
    maxWidth: "100%",
  },
  dailyApplicationChipLimited: {
    borderColor: "hsla(0, 100%, 55%, 0.35)",
  },
  dailyApplicationChipText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    lineHeight: 20,
  },
  dailyApplicationNumber: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  dailyApplicationRest: {
    color: "hsl(0, 0%, 68%)",
    fontWeight: "500",
  },
  opportunitiesCardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    position: "relative",
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)", // Black background to prevent white flash
  },
  /** Tighter chrome when the swipe deck is empty so the card reads shorter,
   *  and centered vertically instead of pinned under the header. */
  opportunitiesCardContainerEmpty: {
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 12,
  },
  noMoreOpportunities: {
    width: "100%",
    maxWidth: 410,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 14%)",
    backgroundColor: "hsl(0, 0%, 6%)",
  },
  noMoreBadgeWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(75, 100%, 60%)",
    marginBottom: 8,
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  noMoreEyebrow: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "hsl(0, 0%, 0%)", // Black background
  },
  loadingText: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    textAlign: "center",
  },
  noMoreTitle: {
    fontSize: 17,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 6,
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  noMoreSubtitle: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 74%)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  resetButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 12,
    minWidth: 200,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 17,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 0%)",
    fontWeight: "700",
  },
  resetHintText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 58%)",
    textAlign: "center",
  },

  // Opportunities Screen Styles
  featuredOpportunityCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  opportunityImageContainer: {
    position: "relative",
    height: 200,
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background for image placeholder
    justifyContent: "center",
    alignItems: "center",
  },
  opportunityImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "hsl(0, 0%, 20%)",
    justifyContent: "center",
    alignItems: "center",
  },
  opportunityImageText: {
    fontSize: 40,
    color: "#C2CC06", // Brand lime green
  },
  genreTag: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "hsl(0, 0%, 0%)", // Black background
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "#FFFFFF", // Brand white text
    fontWeight: "bold",
  },
  opportunityContent: {
    padding: 20,
  },
  opportunityTitle: {
    fontSize: 20,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 10,
  },
  opportunityDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    lineHeight: 20,
    marginBottom: 15,
  },
  opportunityDetails: {
    marginBottom: 15,
  },
  opportunityDetail: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "#FFFFFF", // Brand white text
    marginBottom: 5,
  },
  opportunityFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skillLevelTag: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillLevelText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "#FFFFFF", // Brand white text
    fontWeight: "bold",
  },
  organizerName: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    fontWeight: "bold",
  },
  opportunityActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    gap: 40,
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 25%)",
  },
  passButtonText: {
    fontSize: 24,
    color: "#FFFFFF", // Brand white text
    fontWeight: "bold",
  },
  applyButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#C2CC06", // Brand lime green
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 24,
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontWeight: "bold",
  },
  actionHint: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)", // Muted text
    textAlign: "center",
    marginBottom: 30,
  },
  opportunityCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  opportunityDJ: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  opportunityInfo: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 4,
  },
  // Notifications Screen Styles
  notificationCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#FFFFFF", // Brand white text
    marginBottom: 5,
  },
  notificationText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)", // More muted text
  },
  // Community Screen Styles
  communityCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  communityTitle: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    marginBottom: 5,
  },
  communityMembers: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
  },
  communityDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "#FFFFFF", // Brand white text
    lineHeight: 20,
  },
  // Settings Screen Styles
  settingsCard: {
    backgroundColor: "#1D1D1B", // Brand black background
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  settingsTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "#C2CC06", // Brand lime green
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 10%)", // Very subtle border
  },
  settingsItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "#FFFFFF", // Brand white text
  },
  settingsArrow: {
    fontSize: 18,
    color: "hsl(0, 0%, 50%)", // Muted text
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
    fontFamily: "Helvetica Neue",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },

  // Hamburger Menu Styles
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  menuOverlayTouchable: {
    flex: 1,
  },
  menuContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderBottomWidth: 0,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  menuContent: {
    padding: 24,
    paddingBottom: 60,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 20%)",
  },
  menuTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItems: {
    gap: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 18%)",
    minHeight: 72,
  },
  menuItemText: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "bold",
    lineHeight: 20,
    marginBottom: 2,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  menuItemDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 16,
    // marginLeft: 16,
    fontWeight: "400",
  },
  menuItemActive: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
    minHeight: 72,
  },

  // Full-Screen Player Menu Styles
  fullScreenMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  fullScreenMenuOverlayTouchable: {
    flex: 1,
  },
  fullScreenMenuContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderBottomWidth: 0,
    maxHeight: "50%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  fullScreenMenuContent: {
    padding: 20,
  },
  fullScreenMenuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 20%)",
  },
  fullScreenMenuItems: {
    gap: 16,
  },
  fullScreenMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  // Queue Modal Styles
  queueModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  queueModalOverlayTouchable: {
    flex: 1,
  },
  queueModalContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    maxHeight: "80%",
  },
  queueModalContent: {
    padding: 20,
  },
  queueModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  queueModalTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
  },
  queueModalClose: {
    padding: 4,
  },
  queueModalScroll: {
    maxHeight: 500,
  },
  queueItemCurrent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 8%)",
    marginBottom: 8,
  },
  queueItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  queueItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  queueItemReorderButton: {
    padding: 4,
  },
  queueItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  queueItemNumberText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 70%)",
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  queueItemArtist: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  queueItemBadge: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  queueItemBadgeText: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 0%)",
  },
  queueItemRemove: {
    padding: 4,
    marginLeft: 8,
  },
  queueEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  queueEmptyText: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 50%)",
    marginTop: 16,
    marginBottom: 8,
  },
  queueEmptySubtext: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 40%)",
    textAlign: "center",
  },
  queueClearButton: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    alignItems: "center",
  },
  queueClearButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 100%, 60%)",
  },

  // Global Audio Player — mini bar UI is components/MiniPlayerBar.js (tokens kept here for reference / future use)
  globalAudioPlayer: {
    position: "absolute",
    // left / right / bottom come from GlobalAudioPlayerUI (safe area + tab offset)
    backgroundColor: "hsl(0, 0%, 8%)", // Dark background
    borderRadius: 16,
    paddingVertical: 12, // Compact vertical padding
    paddingHorizontal: 16,
    overflow: "hidden",
    zIndex: 1001, // Higher than tab bar
    elevation: 20, // Above tab bar (elevation 15) on Android
    // Remove shadow to avoid overlapping bottom tab
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 0, // Remove border for cleaner look
    minHeight: 70, // Compact height
  },
  audioPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  audioAlbumArt: {
    width: 50, // Slightly smaller for compact design
    height: 50,
    borderRadius: 8, // Less rounded than main container
    marginRight: 12, // Tighter spacing
    overflow: "hidden",
    borderWidth: 0.5, // Subtle border
    borderColor: "hsl(0, 0%, 20%)", // Very subtle border
  },
  albumArtImage: {
    width: "100%",
    height: "100%",
  },
  albumArtPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioTrackInfo: {
    flex: 1,
    marginRight: 16, // Better spacing
    justifyContent: "center",
  },
  audioTrackTitle: {
    fontSize: 16, // Larger for better hierarchy
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2, // Tight spacing
    lineHeight: 18,
  },
  audioTrackArtist: {
    fontSize: 14, // Slightly larger
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)", // Light gray for artist
    fontWeight: "400",
  },
  upNextPreview: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 20%)",
  },
  upNextLabel: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 2,
  },
  upNextTrack: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center the single button
  },
  audioControlButton: {
    width: 40, // Smaller, more compact
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD green
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  audioCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  audioProgressContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3, // Very thin progress bar
    backgroundColor: "hsl(0, 0%, 15%)", // Dark track
    borderBottomLeftRadius: 12, // Match container radius
    borderBottomRightRadius: 12,
    overflow: "visible", // Allow thumb to extend beyond container
  },
  audioProgressBar: {
    height: "100%",
    backgroundColor: "transparent", // No background needed
    position: "relative",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD green
    borderRadius: 0, // No border radius for thin line
  },
  scrubberThumb: {
    position: "absolute",
    top: -4, // Position above the progress bar
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD green
    marginLeft: -5, // Center the thumb
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  scrubTimeText: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    color: "#C2CC06",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  audioTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginRight: 24, // Increased spacing from play button
  },
  audioTimeText: {
    fontSize: 11, // Smaller for subtlety
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)", // More subtle
    fontWeight: "400",
    letterSpacing: 0.5,
  },

  // Full-Screen Player Styles - Redesigned to match reference with R/HOOD theming
  fullScreenPlayerOverlay: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 7%)", // Spotify-style canvas (#121212)
  },
  fullScreenBackgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Subtle overlay
  },
  fullScreenPlayer: {
    flex: 1,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  fullScreenPlayerContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: Dimensions.get("window").height,
  },
  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  threeDotsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  fullScreenHeaderTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 16,
  },
  fullScreenAlbumArtContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  fullScreenAlbumArt: {
    width: 320,
    height: 320,
    borderRadius: 12,
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  fullScreenTrackInfo: {
    alignItems: "flex-start",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  fullScreenTrackTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    marginBottom: 8,
  },
  fullScreenTrackTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "900",
    textAlign: "left",
    flex: 1,
    lineHeight: 28,
  },
  fullScreenLikeButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenTrackArtist: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "left",
    fontWeight: "500",
    marginBottom: 4,
  },
  fullScreenProgressSection: {
    marginBottom: 32,
  },
  fullScreenProgressBar: {
    height: 4,
    backgroundColor: "hsla(0, 0%, 20%, 0.3)",
    borderRadius: 2,
    marginBottom: 16,
    position: "relative",
    paddingVertical: 12,
    justifyContent: "center",
  },
  fullScreenProgressFill: {
    height: 4,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 2,
    position: "absolute",
    top: 12,
  },
  fullScreenProgressThumb: {
    position: "absolute",
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(75, 100%, 60%)",
    marginLeft: -6,
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  fullScreenTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  fullScreenTimeText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  fullScreenControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
    marginLeft: 40,
    marginRight: 40,
    gap: 40,
  },
  fullScreenControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenSecondaryActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
    gap: 24,
  },
  fullScreenSecondaryButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    position: "relative",
  },
  fullScreenSecondaryButtonText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    marginTop: 4,
    fontWeight: "500",
  },
  queueBadge: {
    position: "absolute",
    top: 0,
    right: 4,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  queueBadgeText: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 0%)",
    fontWeight: "700",
  },
  fullScreenPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },

  // About the DJ Section
  aboutDJCard: {
    marginTop: 32,
    marginHorizontal: 24,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  aboutDJHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  aboutDJAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
    overflow: "hidden",
  },
  aboutDJAvatarImage: {
    width: "100%",
    height: "100%",
  },
  aboutDJInfo: {
    flex: 1,
  },
  aboutDJTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
    marginBottom: 4,
  },
  aboutDJName: {
    fontSize: 14,
    color: "hsl(75, 100%, 60%)",
    fontWeight: "500",
  },
  aboutDJArrow: {
    marginLeft: 8,
  },
  aboutDJText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
    fontWeight: "400",
  },

  // Enhanced Progress Bar Styles
  enhancedProgressContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "hsl(0, 0%, 8%)", // Brand backgroundSecondary
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Brand border
  },
  playPauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#C2CC06",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C2CC06",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  fullScreenActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 8%)", // Brand backgroundSecondary
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Brand border
  },
  fadeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    zIndex: 10000,
    pointerEvents: "none",
  },

  // New Profile Page Styles
  profileScreen: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
    padding: 16,
  },
  profileHeaderCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    position: "relative",
  },
  editProfileButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "hsl(0, 0%, 0%)",
  },
  profileDisplayName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 8,
  },
  profileRating: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    marginLeft: 4,
  },
  profileBio: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  profileLocation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  statsCardsContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
  },
  genresCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 16,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  genreTagText: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
  },
  audioIdCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  audioInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  trackDetails: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 40,
    marginBottom: 16,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    backgroundColor: "hsl(0, 0%, 100%)",
    borderRadius: 1.5,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "hsl(0, 0%, 20%)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "25%",
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  socialLinksCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  socialLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  instagramIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E4405F",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  soundcloudIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#ff8800",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  socialLinkText: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
  },
  recentGigsCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  gigItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  gigInfo: {
    flex: 1,
  },
  gigTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  gigLocation: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    marginBottom: 2,
  },
  gigDate: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
  },
  gigStats: {
    alignItems: "flex-end",
  },
  gigFee: {
    fontSize: 16,
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
  },
  gigRating: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
  },
  gigSeparator: {
    height: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
    marginVertical: 8,
  },
  memberSince: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
    textAlign: "center",
    marginBottom: 20,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    opacity: 0.7,
  },
  swipeHintText: {
    fontSize: 10,
    color: "#C2CC06",
    marginHorizontal: 4,
    fontFamily: "Helvetica Neue",
  },

  // Enhanced Progress Bar Styles
  enhancedProgressContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  enhancedProgressBar: {
    width: "100%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "hsl(0, 0%, 20%)",
    borderRadius: 4,
    position: "relative",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 4,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "hsl(75, 100%, 60%)",
    position: "absolute",
    top: -4,
    shadowColor: "#C2CC06",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },

  // Enhanced Album Art Styles
  albumArtImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  albumArtPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },

  // Play Bar Fade Overlay (above tab bar, below mini player)
  playBarFadeOverlay: {
    position: "absolute",
    bottom: 90, // Position above the play bar (play bar height is ~70px)
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    pointerEvents: "none",
    zIndex: 1000,
    elevation: 19,
  },

  // Menu Styles
  headerSpacer: {
    flex: 1,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    // marginLeft: 16,
    fontWeight: "bold",
  },
  // In-App Notification Toast Styles
  inAppNotificationContainer: {
    position: "absolute",
    // Sit just below header bottom border (line) — was 60 and overlapped the rule
    top: 78,
    left: 20,
    right: 20,
    zIndex: 10000,
    elevation: 10000,
  },
  inAppNotification: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inAppNotificationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  inAppNotificationIcon: {
    marginRight: 12,
  },
  inAppNotificationTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  inAppNotificationTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  inAppNotificationMessage: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 18,
  },
  inAppNotificationClose: {
    padding: 4,
  },
});

export default styles;
