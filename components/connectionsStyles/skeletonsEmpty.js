/**
 * Loading skeletons + empty states (connections / discover lists).
 */
import { FONT_BODY, FONT_HEADING, cardTile } from "./tokens";

export default {
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    ...cardTile,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(0, 0%, 18%)",
    marginRight: 12,
  },
  skeletonLines: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "hsl(0, 0%, 18%)",
    width: "75%",
  },
  skeletonLineShort: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(0, 0%, 15%)",
    width: "45%",
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginBottom: 16,
    ...cardTile,
  },
  skeletonCardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(0, 0%, 18%)",
    marginRight: 12,
  },
  skeletonCardLines: {
    flex: 1,
    gap: 6,
  },
  skeletonCardLine: {
    height: 16,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 18%)",
    width: "80%",
  },
  skeletonCardLineSmall: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(0, 0%, 15%)",
    width: "55%",
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontFamily: FONT_HEADING,
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  noResultsSubtitle: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
  },
};
