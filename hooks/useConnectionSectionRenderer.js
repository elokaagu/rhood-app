import { useCallback } from "react";
import ConnectionListItem from "../components/ConnectionListItem";
import CommunityListItem from "../components/CommunityListItem";
import { formatMessageTime, getUserName } from "../lib/connectionListUtils";
import { CONNECTIONS_SECTION_TYPE } from "../lib/connectionsSectionTypes";
import { isRhoodCommunityId } from "../lib/communityConstants";
import styles from "../components/ConnectionsScreen.styles";

/**
 * Memoized SectionList `renderItem` for the connections tab (community rows + DM rows).
 *
 * Not stateful: this is a render factory stabilized with `useCallback`, not lifecycle logic.
 */
export function useConnectionSectionRenderer({
  communityMessages,
  communityUnreadCounts,
  getLastMessageSender,
  getLastMessageContent,
  getLastMessageTime,
  handleGroupChatPress,
  handleConnectionPress,
  handleOpenConnectionOptions,
}) {
  return useCallback(
    ({ item, section }) => {
      const isCommunitySection =
        section.type === CONNECTIONS_SECTION_TYPE.COMMUNITY ||
        section.key === "communities";

      if (isCommunitySection) {
        const community = item;
        const latestMessage = communityMessages?.[community.id];
        const unreadCount = communityUnreadCounts?.[community.id] || 0;
        return (
          <CommunityListItem
            community={community}
            latestMessage={latestMessage}
            unreadCount={unreadCount}
            isRhood={isRhoodCommunityId(community.id)}
            onPress={handleGroupChatPress}
            formatMessageTime={formatMessageTime}
            styles={styles}
          />
        );
      }

      return (
        <ConnectionListItem
          connection={item}
          onPress={handleConnectionPress}
          onLongPress={
            item.isConnected ? handleOpenConnectionOptions : undefined
          }
          getUserName={getUserName}
          getLastMessageSender={getLastMessageSender}
          getLastMessageContent={getLastMessageContent}
          getLastMessageTime={getLastMessageTime}
          styles={styles}
        />
      );
    },
    [
      communityMessages,
      communityUnreadCounts,
      getLastMessageSender,
      getLastMessageContent,
      getLastMessageTime,
      handleGroupChatPress,
      handleConnectionPress,
      handleOpenConnectionOptions,
    ]
  );
}
