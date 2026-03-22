/**
 * Connections header, tabs row host, search field, typeahead dropdown.
 */
import { FONT_BODY, FONT_HEADING } from "./tokens";

export default {
  /** Entire header stacks above SectionList/FlatList so absolute suggestions stay visible. */
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    zIndex: 100,
    elevation: 24,
    position: "relative",
    overflow: "visible",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONT_HEADING,
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
    marginBottom: 16,
  },
  searchWrapper: {
    position: "relative",
    zIndex: 10000,
    elevation: 10000,
    overflow: "visible",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: -12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    fontFamily: FONT_BODY,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10001,
    zIndex: 10001,
    pointerEvents: "auto",
  },
  suggestionsScroll: {
    maxHeight: 300,
  },
  suggestionsScrollContent: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    gap: 12,
    minHeight: 64,
  },
  suggestionItemFirst: {
    paddingTop: 20,
  },
  suggestionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  suggestionImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionInfo: {
    flex: 1,
    gap: 4,
  },
  suggestionName: {
    fontSize: 15,
    fontFamily: FONT_BODY,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  suggestionCity: {
    fontSize: 13,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 60%)",
  },
};
