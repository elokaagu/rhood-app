import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import AnimatedListItem from "./AnimatedListItem";
import { HapticPatterns } from "../lib/haptics";

function formatAppliedDate(value) {
  if (!value) return "Date unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "hsl(145, 70%, 42%)";
    case "rejected":
      return "hsl(0, 70%, 48%)";
    default:
      return "hsl(75, 100%, 60%)";
  }
}

export default function ProfileBookingRequests({
  requests = [],
  onSeeAll,
}) {
  const [selected, setSelected] = useState(null);
  const list = Array.isArray(requests) ? requests.slice(0, 5) : [];

  const openRequest = (item) => {
    HapticPatterns.itemPress();
    setSelected(item);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Booking Requests</Text>
        {requests.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              HapticPatterns.buttonPress();
              onSeeAll?.();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {list.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={20} color="hsl(75, 100%, 60%)" />
          <Text style={styles.emptyTitle}>No booking requests yet</Text>
          <Text style={styles.emptySubtitle}>
            When someone applies to a gig you posted, you can read the details
            here.
          </Text>
        </View>
      ) : (
        list.map((item, index) => (
          <AnimatedListItem
            key={item.id}
            index={index}
            delay={70}
            maxStaggerIndex={6}
          >
            <TouchableOpacity
              style={styles.card}
              onPress={() => openRequest(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <ProgressiveImage
                  source={
                    item.applicantImage ? { uri: item.applicantImage } : null
                  }
                  style={styles.avatar}
                  placeholder={<View style={styles.avatarFallback} />}
                />
                <View style={styles.cardCopy}>
                  <Text style={styles.applicant} numberOfLines={1}>
                    {item.applicantName}
                  </Text>
                  <Text style={styles.opportunity} numberOfLines={1}>
                    {item.opportunityTitle}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {formatAppliedDate(item.appliedAt)}
                    {item.venue ? ` · ${item.venue}` : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor(item.status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      String(item.status).toLowerCase() === "pending"
                        ? styles.statusTextPending
                        : null,
                    ]}
                  >
                    {String(item.status || "pending").toUpperCase()}
                  </Text>
                </View>
              </View>
              {item.message ? (
                <Text style={styles.preview} numberOfLines={2}>
                  {item.message}
                </Text>
              ) : (
                <Text style={styles.previewMuted}>Tap to read details</Text>
              )}
            </TouchableOpacity>
          </AnimatedListItem>
        ))
      )}

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking request</Text>
              <TouchableOpacity
                onPress={() => setSelected(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalBody}
            >
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>
                {selected?.applicantName || "DJ"}
              </Text>
              <Text style={styles.detailLabel}>Gig</Text>
              <Text style={styles.detailValue}>
                {selected?.opportunityTitle}
                {selected?.venue ? `\n${selected.venue}` : ""}
              </Text>
              <Text style={styles.detailLabel}>Received</Text>
              <Text style={styles.detailValue}>
                {formatAppliedDate(selected?.appliedAt)}
              </Text>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>
                {String(selected?.status || "pending")}
              </Text>
              <Text style={styles.detailLabel}>Message</Text>
              <Text style={styles.detailMessage}>
                {selected?.message?.trim()
                  ? selected.message.trim()
                  : "No message was included with this request."}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 13,
    color: "hsl(75, 100%, 60%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "hsl(0, 0%, 62%)",
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  cardCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    minWidth: 0,
  },
  applicant: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  opportunity: {
    fontSize: 13,
    color: "hsl(75, 100%, 60%)",
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: "hsl(0, 0%, 62%)",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
  },
  statusTextPending: {
    color: "hsl(0, 0%, 0%)",
  },
  preview: {
    marginTop: 10,
    fontSize: 13,
    color: "hsl(0, 0%, 78%)",
    lineHeight: 18,
  },
  previewMuted: {
    marginTop: 10,
    fontSize: 13,
    color: "hsl(0, 0%, 50%)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  modalScroll: {
    maxHeight: 420,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    color: "hsl(0, 0%, 55%)",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    lineHeight: 22,
  },
  detailMessage: {
    fontSize: 15,
    color: "hsl(0, 0%, 85%)",
    lineHeight: 22,
  },
  modalCloseBtn: {
    margin: 16,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 0%)",
  },
});
