import { useCallback } from "react";
import ConnectionListItem from "../components/ConnectionListItem";
import CommunityListItem from "../components/CommunityListItem";
import { formatMessageTime, getUserName } from "../lib/connectionListUtils";
import styles from "../components/ConnectionsScreen.styles";

const RHOOD_COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * SectionList renderItem for connections tab (DM rows + community rows).
 */
export function useRenderConnectionSectionItem(connectionsData, actions) {
  return useCallback(
    ({ item, section }) => {
      if (section.key === "communities") {
        const community = item;
        const latestMessage =
          connectionsData.communityMessages?.[community.id];
        const unreadCount =
          connectionsData.communityUnreadCounts?.[community.id] || 0;
        const isRhood = community.id === RHOOD_COMMUNITY_ID;
        return (
          <CommunityListItem
            community={community}
            latestMessage={latestMessage}
            unreadCount={unreadCount}
            isRhood={isRhood}
            onPress={actions.handleGroupChatPress}
            formatMessageTime={formatMessageTime}
            styles={styles}
          />
        );
      }
      return (
        <ConnectionListItem
          connection={item}
          onPress={actions.handleConnectionPress}
          onLongPress={
            item.isConnected ? actions.handleOpenConnectionOptions : undefined
          }
          getUserName={getUserName}
          getLastMessageSender={connectionsData.getLastMessageSender}
          getLastMessageContent={connectionsData.getLastMessageContent}
          getLastMessageTime={connectionsData.getLastMessageTime}
          styles={styles}
        />
      );
    },
    [
      connectionsData.communityMessages,
      connectionsData.communityUnreadCounts,
      connectionsData.getLastMessageSender,
      connectionsData.getLastMessageContent,
      connectionsData.getLastMessageTime,
      actions.handleGroupChatPress,
      actions.handleConnectionPress,
      actions.handleOpenConnectionOptions,
    ]
  );
}
