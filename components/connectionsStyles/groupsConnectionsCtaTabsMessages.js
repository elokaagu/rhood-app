/**
 * Legacy group chrome (unused in current tree but kept for API stability),
 * CTA strip, tab switcher, message list rows (DM + community list items).
 */
import { FONT_BODY, FONT_HEADING, cardTile } from "./tokens";

export default {
  /**
   * RN native does not support CSS sticky; kept for web if ever shared.
   * On native this behaves as a normal block with zIndex for overlap only.
   */
  pinnedGroup: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    padding: 16,
    zIndex: 10,
  },
  groupChatItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  groupTime: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
  },
  groupMessage: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  groupBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinnedBadge: {
    backgroundColor: "hsla(75, 100%, 60%, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsla(75, 100%, 60%, 0.3)",
  },
  pinnedBadgeText: {
    fontSize: 10,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  memberCount: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
  },
  unreadCounter: {
    width: 20,
    height: 20,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadCount: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  connectionsList: {
    backgroundColor: "hsl(0, 0%, 0%)",
    paddingTop: 32,
  },
  connectionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  connectionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    position: "relative",
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 0%)",
  },
  connectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  connectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  connectionName: {
    fontSize: 14,
    fontFamily: FONT_HEADING,
    color: "hsl(0, 0%, 100%)",
    flex: 1,
  },
  lastActive: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
  },
  lastMessageContent: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 100%)",
    marginTop: 4,
  },
  genreTags: {
    flexDirection: "row",
    gap: 6,
  },
  genreTag: {
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  genreTagText: {
    fontSize: 10,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
  },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 4,
  },
  ctaSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
  },
  ctaCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 16,
    fontFamily: FONT_HEADING,
    color: "hsl(0, 0%, 100%)",
    marginTop: 8,
    marginBottom: 4,
  },
  ctaDescription: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  ctaSecondaryLink: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  ctaSecondaryLinkText: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(75, 100%, 55%)",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 36,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(0, 0%, 70%)",
  },
  tabTextActive: {
    color: "hsl(0, 0%, 0%)",
  },
  /** Inline banner when refresh fails but cached rows are still shown */
  listStaleErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 35%, 12%)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 40%, 28%)",
    gap: 10,
  },
  listStaleErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 90%)",
  },
  listStaleErrorRetry: {
    fontSize: 13,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(75, 100%, 55%)",
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageItem: {
    padding: 16,
    marginBottom: 12,
    ...cardTile,
  },
  messageContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
  },
  messageInfo: {
    flex: 1,
    marginRight: 8,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  messageHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectionStatusMessage: {
    fontSize: 13,
    color: "hsl(75, 100%, 70%)",
    fontFamily: FONT_BODY,
    marginBottom: 4,
  },
  messageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    fontFamily: FONT_BODY,
  },
  messageTime: {
    fontSize: 12,
    color: "hsl(0, 0%, 60%)",
    fontFamily: FONT_BODY,
  },
  /** Row wrapper for ConnectionListItem preview (View). */
  messagePreviewRow: {
    flex: 1,
    justifyContent: "space-between",
    marginBottom: 6,
  },
  /** Single-line preview text (CommunityListItem / Text). */
  messagePreview: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    fontFamily: FONT_BODY,
  },
  messageText: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    fontFamily: FONT_BODY,
    flex: 1,
  },
  messageBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingRequestsSection: {
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: "hsl(0, 0%, 6%)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.12)",
    padding: 16,
    gap: 16,
  },
  pendingRequestsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  pendingRequestsTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: FONT_HEADING,
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
  },
  pendingRequestCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.08)",
    padding: 12,
    gap: 12,
  },
  pendingRequestInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pendingRequestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  pendingRequestDetails: {
    flex: 1,
    gap: 4,
  },
  pendingRequestName: {
    fontSize: 16,
    fontFamily: FONT_BODY,
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
  },
  pendingRequestStatus: {
    fontSize: 13,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
  },
  pendingRequestSubtitle: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 55%)",
  },
  pendingRequestActions: {
    flexDirection: "row",
    gap: 10,
  },
  pendingActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pendingAcceptButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  pendingDeclineButton: {
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)",
  },
  pendingActionDisabled: {
    opacity: 0.6,
  },
  pendingActionText: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  pendingDeclineText: {
    color: "hsl(0, 0%, 70%)",
  },
};
