import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "./ListenScreen.styles";

export default function ManageMixesModal({
  visible,
  onClose,
  onUploadNew,
  loadingUserMixes,
  userMixes,
  onEditMix,
  onPinMix,
  onDeleteMix,
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.manageMixesModalContent}>
          <View style={styles.manageMixesModalHeader}>
            <Text style={styles.manageMixesModalTitle}>Manage Mixes</Text>
            <TouchableOpacity onPress={onClose} style={styles.manageMixesModalClose}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          {loadingUserMixes ? (
            <View style={styles.manageMixesLoadingContainer}>
              <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
              <Text style={styles.manageMixesLoadingText}>Loading your mixes...</Text>
            </View>
          ) : userMixes.length === 0 ? (
            <View style={styles.manageMixesEmptyContainer}>
              <Ionicons name="musical-notes-outline" size={64} color="hsl(0, 0%, 50%)" />
              <Text style={styles.manageMixesEmptyText}>No mixes yet</Text>
              <Text style={styles.manageMixesEmptySubtext}>
                Upload your first mix to get started
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.manageMixesScroll}>
              {userMixes.map((mix) => (
                <View key={mix.id} style={styles.manageMixItem}>
                  <View style={styles.manageMixItemInfo}>
                    <Image
                      source={
                        mix.artwork_url || mix.image_url
                          ? { uri: mix.artwork_url || mix.image_url }
                          : require("../assets/rhood_logo.webp")
                      }
                      style={styles.manageMixItemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.manageMixItemDetails}>
                      <Text style={styles.manageMixItemTitle} numberOfLines={1}>
                        {mix.title}
                      </Text>
                      <Text style={styles.manageMixItemGenre} numberOfLines={1}>
                        {mix.genre || "No genre"}
                      </Text>
                      <View style={styles.manageMixBadges}>
                        {mix.is_primary && (
                          <View style={styles.manageMixPrimaryBadge}>
                            <Text style={styles.manageMixPrimaryText}>Primary</Text>
                          </View>
                        )}
                        {mix.is_pinned && (
                          <View style={styles.manageMixPinnedBadge}>
                            <Ionicons name="pin" size={12} color="hsl(75, 100%, 60%)" />
                            <Text style={styles.manageMixPinnedText}>Pinned</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.manageMixItemActions}>
                    <TouchableOpacity
                      style={styles.manageMixActionButton}
                      onPress={() => onEditMix(mix)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={20} color="hsl(75, 100%, 60%)" />
                      <Text style={styles.manageMixActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.manageMixActionButton,
                        mix.is_pinned && styles.manageMixActionButtonPinned,
                      ]}
                      onPress={() => onPinMix(mix)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={mix.is_pinned ? "pin" : "pin-outline"}
                        size={20}
                        color={mix.is_pinned ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 60%)"}
                      />
                      <Text
                        style={[
                          styles.manageMixActionText,
                          mix.is_pinned && styles.manageMixActionTextPinned,
                        ]}
                      >
                        {mix.is_pinned ? "Unpin" : "Pin"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.manageMixActionButton, styles.manageMixActionButtonDelete]}
                      onPress={() => onDeleteMix(mix)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color="hsl(0, 100%, 50%)" />
                      <Text style={[styles.manageMixActionText, styles.manageMixActionTextDelete]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.manageMixesModalFooter}>
            <TouchableOpacity
              style={styles.manageMixesUploadButton}
              onPress={() => {
                onClose();
                if (onUploadNew) onUploadNew("upload-mix");
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["hsl(75, 100%, 60%)", "hsl(75, 100%, 50%)"]}
                style={styles.manageMixesUploadGradient}
              >
                <Ionicons name="add" size={20} color="hsl(0, 0%, 0%)" />
                <Text style={styles.manageMixesUploadText}>Upload New Mix</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
