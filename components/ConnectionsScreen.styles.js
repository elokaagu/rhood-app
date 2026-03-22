/**
 * Connections feature styles — composed from `connectionsStyles/*` modules.
 * Import this file only; partials are implementation details.
 */
import { StyleSheet } from "react-native";
import layoutShell from "./connectionsStyles/layoutShell";
import headerSearch from "./connectionsStyles/headerSearch";
import skeletonsEmpty from "./connectionsStyles/skeletonsEmpty";
import groupsConnectionsCtaTabsMessages from "./connectionsStyles/groupsConnectionsCtaTabsMessages";
import discoverRecommendationsModals from "./connectionsStyles/discoverRecommendationsModals";

const styles = StyleSheet.create({
  ...layoutShell,
  ...headerSearch,
  ...skeletonsEmpty,
  ...groupsConnectionsCtaTabsMessages,
  ...discoverRecommendationsModals,
});

export default styles;
