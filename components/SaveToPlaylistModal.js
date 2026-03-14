import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./ListenScreen.styles";

export default function SaveToPlaylistModal({
  visible,
  onRequestClose,
  selectedMixForPlaylist,
  newPlaylistName,
  setNewPlaylistName,
  creatingPlaylist,
  handleCreatePlaylist,
  playlists,
  handleSelectPlaylist,
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.playlistModalContent}>
          <View style={styles.playlistModalHeader}>
            <Text style={styles.playlistModalTitle}>Save to Playlist</Text>
            <TouchableOpacity onPress={onRequestClose} style={styles.playlistModalClose}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          {selectedMixForPlaylist && (
            <View style={styles.playlistMixPreview}>
              <Image
                source={
                  selectedMixForPlaylist.artwork_url ||
                  selectedMixForPlaylist.image_url ||
                  selectedMixForPlaylist.image
                    ? {
                        uri:
                          selectedMixForPlaylist.artwork_url ||
                          selectedMixForPlaylist.image_url ||
                          selectedMixForPlaylist.image,
                      }
                    : require("../assets/rhood_logo.webp")
                }
                style={styles.playlistMixPreviewImage}
                resizeMode="cover"
              />
              <View style={styles.playlistMixPreviewInfo}>
                <Text style={styles.playlistMixPreviewTitle} numberOfLines={1}>
                  {selectedMixForPlaylist.title}
                </Text>
                <Text style={styles.playlistMixPreviewArtist} numberOfLines={1}>
                  {selectedMixForPlaylist.artist ||
                    selectedMixForPlaylist.user_dj_name ||
                    "Unknown"}
                </Text>
              </View>
            </View>
          )}

          <ScrollView style={styles.playlistModalScroll}>
            <View style={styles.createPlaylistSection}>
              <Text style={styles.createPlaylistTitle}>Create New Playlist</Text>
              <View style={styles.createPlaylistInputContainer}>
                <TextInput
                  style={styles.createPlaylistInput}
                  placeholder="Playlist name"
                  placeholderTextColor="hsl(0, 0%, 50%)"
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  maxLength={50}
                  autoFocus={true}
                  returnKeyType="done"
                  onSubmitEditing={handleCreatePlaylist}
                  editable={!creatingPlaylist}
                />
                <TouchableOpacity
                  style={[
                    styles.createPlaylistButton,
                    (!newPlaylistName.trim() || creatingPlaylist) &&
                      styles.createPlaylistButtonDisabled,
                  ]}
                  onPress={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || creatingPlaylist}
                  activeOpacity={0.8}
                >
                  {creatingPlaylist ? (
                    <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
                  ) : (
                    <Text style={styles.createPlaylistButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {playlists.length > 0 && (
              <View style={styles.existingPlaylistsSection}>
                <Text style={styles.existingPlaylistsTitle}>Add to Existing Playlist</Text>
                {playlists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.existingPlaylistItem}
                    onPress={() => handleSelectPlaylist(playlist)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.existingPlaylistIcon}>
                      {playlist.image_url ? (
                        <Image
                          source={{ uri: playlist.image_url }}
                          style={styles.existingPlaylistImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="musical-notes"
                          size={20}
                          color="hsl(75, 100%, 60%)"
                        />
                      )}
                    </View>
                    <View style={styles.existingPlaylistInfo}>
                      <Text style={styles.existingPlaylistName} numberOfLines={1}>
                        {playlist.name}
                      </Text>
                      <Text style={styles.existingPlaylistMeta}>
                        {playlist.mixCount || 0} {playlist.mixCount === 1 ? "mix" : "mixes"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
