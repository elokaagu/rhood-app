import React, { useEffect, useCallback } from "react";
import { View, FlatList, SectionList } from "react-native";
import { LISTEN_SECTION_LIST_PERFORMANCE } from "../lib/performanceConstants";
import { useListenPlaylists } from "../hooks/useListenPlaylists";
import { useListenMixes } from "../hooks/useListenMixes";
import ListenUploadModal from "./ListenUploadModal";
import ManageMixesModal from "./ManageMixesModal";
import SaveToPlaylistModal from "./SaveToPlaylistModal";
import styles from "./ListenScreen.styles";

const LISTEN_PERF = LISTEN_SECTION_LIST_PERFORMANCE;

export default function ListenScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onStopAudio,
  onAddToQueue,
  onPlayNext,
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

  const handleCloseUploadModal = useCallback(
    () => mixState.setShowUploadModal(false),
    [mixState.setShowUploadModal]
  );
  const handleCloseManageModal = useCallback(
    () => mixState.setShowManageMixesModal(false),
    [mixState.setShowManageMixesModal]
  );
  const handleCloseSaveToPlaylist = useCallback(() => {
    playlistState.setShowSaveToPlaylistModal(false);
    playlistState.setSelectedMixForPlaylist(null);
    playlistState.setNewPlaylistName("");
  }, [
    playlistState.setShowSaveToPlaylistModal,
    playlistState.setSelectedMixForPlaylist,
    playlistState.setNewPlaylistName,
  ]);

  return (
    <View style={styles.container}>
      {mixState.searchQuery.trim() ? (
        <FlatList
          data={mixState.filteredMixes}
          keyExtractor={mixState.searchKeyExtractor}
          ListHeaderComponent={mixState.renderHeader}
          renderItem={mixState.renderSearchMixItem}
          ListEmptyComponent={mixState.searchListEmptyComponent}
          getItemLayout={mixState.getSearchItemLayout}
          refreshControl={mixState.refreshControl}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={LISTEN_PERF.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={LISTEN_PERF.MAX_TO_RENDER_PER_BATCH}
          windowSize={LISTEN_PERF.WINDOW_SIZE}
          removeClippedSubviews={LISTEN_PERF.REMOVE_CLIPPED_SUBVIEWS}
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
          initialNumToRender={LISTEN_PERF.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={LISTEN_PERF.MAX_TO_RENDER_PER_BATCH}
          windowSize={LISTEN_PERF.WINDOW_SIZE}
          removeClippedSubviews={LISTEN_PERF.REMOVE_CLIPPED_SUBVIEWS}
        />
      )}

      <ListenUploadModal
        visible={mixState.showUploadModal}
        onClose={handleCloseUploadModal}
        onNavigate={onNavigate}
      />

      <ManageMixesModal
        visible={mixState.showManageMixesModal}
        onClose={handleCloseManageModal}
        onUploadNew={onNavigate}
        loadingUserMixes={mixState.loadingUserMixes}
        userMixes={mixState.userMixes}
        onEditMix={mixState.handleEditMix}
        onPinMix={mixState.handlePinMix}
        onDeleteMix={mixState.handleDeleteMixFromManage}
      />

      <SaveToPlaylistModal
        visible={playlistState.showSaveToPlaylistModal}
        onRequestClose={handleCloseSaveToPlaylist}
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

