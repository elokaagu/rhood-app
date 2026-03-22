/**
 * Screen shell: root container, scroll insets vs tab bar / player, bottom fade.
 */
export default {
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  flex1: {
    flex: 1,
    zIndex: 0,
    elevation: 0,
  },
  listContent: {
    paddingBottom: 80,
  },
  /** Use when list has no rows so error/loading/empty fills the viewport under the header */
  listContentGrow: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 80,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
};
