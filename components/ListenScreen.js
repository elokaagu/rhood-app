import React, { useEffect } from "react";
import { View, FlatList, SectionList } from "react-native";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import { useListenPlaylists } from "../hooks/useListenPlaylists";
import { useListenMixes } from "../hooks/useListenMixes";
import ListenUploadModal from "./ListenUploadModal";
import ManageMixesModal from "./ManageMixesModal";
import SaveToPlaylistModal from "./SaveToPlaylistModal";
import styles from "./ListenScreen.styles";

export default function ListenScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onStopAudio,
  onAddToQueue,
  onPlayNext,
  onClearQueue,
  onNavigate,
  user,
}) {
  const playlistState = useListenPlaylists(user);
  const mixState = useListenMixes({
    user,
    globalAudioState,
    onPlayAudio,
    onPauseAudio,
    onResumeAudio,
    onStopAudio,
    onAddToQueue,
    onPlayNext,
    onNavigate,
    handleSaveToPlaylist: playlistState.handleSaveToPlaylist,
    playlists: playlistState.playlists,
  });

  useEffect(() => {
    if (user?.id) playlistState.fetchPlaylists();
  }, [user?.id, playlistState.fetchPlaylists]);

  return (
    <View style={styles.container}>
      {mixState.searchQuery.trim() ? (
        <FlatList
          data={mixState.filteredMixes}
          keyExtractor={(item) => `search-${item.id}`}
          ListHeaderComponent={mixState.renderHeader}
          renderItem={mixState.renderSearchMixItem}
          ListEmptyComponent={mixState.searchListEmptyComponent}
          getItemLayout={mixState.getSearchItemLayout}
          refreshControl={mixState.refreshControl}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
          windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
          removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
        />
      ) : (
        <SectionList
          sections={mixState.sections ?? []}
          keyExtractor={mixState.keyExtractor}
          renderSectionHeader={mixState.renderSectionHeader}
          renderItem={mixState.renderSectionItem}
          ListHeaderComponent={mixState.renderHeader}
          ListFooterComponent={mixState.renderFooter}
          getItemLayout={mixState.getSectionItemLayout}
          refreshControl={mixState.refreshControl}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
          windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
          removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
        />
      )}

      <ListenUploadModal
        visible={mixState.showUploadModal}
        onClose={() => mixState.setShowUploadModal(false)}
        onNavigate={onNavigate}
      />

      <ManageMixesModal
        visible={mixState.showManageMixesModal}
        onClose={() => mixState.setShowManageMixesModal(false)}
        onUploadNew={onNavigate}
        loadingUserMixes={mixState.loadingUserMixes}
        userMixes={mixState.userMixes}
        onEditMix={mixState.handleEditMix}
        onPinMix={mixState.handlePinMix}
        onDeleteMix={mixState.handleDeleteMixFromManage}
      />

      <SaveToPlaylistModal
        visible={playlistState.showSaveToPlaylistModal}
        onRequestClose={() => {
          playlistState.setShowSaveToPlaylistModal(false);
          playlistState.setSelectedMixForPlaylist(null);
          playlistState.setNewPlaylistName("");
        }}
        selectedMixForPlaylist={playlistState.selectedMixForPlaylist}
        newPlaylistName={playlistState.newPlaylistName}
        setNewPlaylistName={playlistState.setNewPlaylistName}
        creatingPlaylist={playlistState.creatingPlaylist}
        handleCreatePlaylist={playlistState.handleCreatePlaylist}
        playlists={playlistState.playlists}
        handleSelectPlaylist={playlistState.handleSelectPlaylist}
      />
    </View>
  );
}

