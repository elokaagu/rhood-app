//
//  LiveActivityModule.swift
//  RHOOD
//
//  Native module for managing Live Activities and Lock Screen widgets
//

import Foundation
import React

#if canImport(ActivityKit)
import ActivityKit
#endif

#if canImport(WidgetKit)
import WidgetKit
#endif

@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
  
  // App Group identifier - must match in entitlements
  private let appGroupIdentifier = "group.com.rhoodapp.mobile"
  
  // UserDefaults for App Group shared storage
  private var sharedDefaults: UserDefaults? {
    // Safely access App Group UserDefaults, fallback to standard if unavailable
    return UserDefaults(suiteName: appGroupIdentifier) ?? UserDefaults.standard
  }
  
  // MARK: - React Native Bridge Methods
  
  @objc
  func startLiveActivity(_ state: [String: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // For iOS 16.1+, use ActivityKit
    if #available(iOS 16.1, *) {
      #if canImport(ActivityKit)
      do {
        let activityAttributes = RhoodLiveActivityAttributes(
          title: state["title"] as? String ?? "R/HOOD",
          artist: state["artist"] as? String ?? "",
          isPlaying: state["isPlaying"] as? Bool ?? false
        )
        
        let initialContentState = RhoodLiveActivityAttributes.ContentState(
          position: state["position"] as? Double ?? 0.0,
          duration: state["duration"] as? Double ?? 0.0
        )
        
        let activityContent = ActivityContent(state: initialContentState, staleDate: nil)
        
        let activity = try Activity<RhoodLiveActivityAttributes>.request(
          attributes: activityAttributes,
          content: activityContent,
          pushType: nil
        )
        
        // Store activity ID for updates
        sharedDefaults?.set(activity.id, forKey: "currentLiveActivityId")
        
        resolver(["success": true, "activityId": activity.id])
      } catch {
        rejecter("LIVE_ACTIVITY_ERROR", "Failed to start Live Activity: \(error.localizedDescription)", error)
      }
      #else
      // Fallback: Just update shared storage for widget
      updateSharedState(state)
      resolver(["success": true, "message": "Live Activities require iOS 16.1+"])
      #endif
    } else {
      // Fallback: Just update shared storage for widget
      updateSharedState(state)
      resolver(["success": true, "message": "Live Activities require iOS 16.1+"])
    }
  }
  
  @objc
  func updateLiveActivity(_ state: [String: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.1, *) {
      #if canImport(ActivityKit)
      guard let activityIdString = sharedDefaults?.string(forKey: "currentLiveActivityId"),
            let activityId = UUID(uuidString: activityIdString) else {
        rejecter("NO_ACTIVITY", "No active Live Activity found", nil)
        return
      }
      
      // Find the activity
      let activities = Activity<RhoodLiveActivityAttributes>.activities
      guard let activity = activities.first(where: { $0.id == activityId }) else {
        rejecter("ACTIVITY_NOT_FOUND", "Live Activity not found", nil)
        return
      }
      
      let updatedState = RhoodLiveActivityAttributes.ContentState(
        position: state["position"] as? Double ?? 0.0,
        duration: state["duration"] as? Double ?? 0.0
      )
      
      let updatedContent = ActivityContent(state: updatedState, staleDate: nil)
      
      Task {
        await activity.update(updatedContent)
        resolver(["success": true])
      }
      #else
      // Fallback: Update shared storage
      updateSharedState(state)
      resolver(["success": true])
      #endif
    } else {
      // Fallback: Update shared storage
      updateSharedState(state)
      resolver(["success": true])
    }
  }
  
  @objc
  func endLiveActivity(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.1, *) {
      #if canImport(ActivityKit)
      guard let activityIdString = sharedDefaults?.string(forKey: "currentLiveActivityId"),
            let activityId = UUID(uuidString: activityIdString) else {
        resolver(["success": true, "message": "No active Live Activity"])
        return
      }
      
      let activities = Activity<RhoodLiveActivityAttributes>.activities
      guard let activity = activities.first(where: { $0.id == activityId }) else {
        resolver(["success": true, "message": "Live Activity not found"])
        return
      }
      
      Task {
        await activity.end(dismissalPolicy: .immediate)
        sharedDefaults?.removeObject(forKey: "currentLiveActivityId")
        resolver(["success": true])
      }
      #else
      sharedDefaults?.removeObject(forKey: "currentLiveActivityId")
      resolver(["success": true])
      #endif
    } else {
      sharedDefaults?.removeObject(forKey: "currentLiveActivityId")
      resolver(["success": true])
    }
  }
  
  @objc
  func updateSharedState(_ state: [String: Any]) {
    // Update App Group UserDefaults for widget access
    sharedDefaults?.set(state["title"], forKey: "currentTrackTitle")
    sharedDefaults?.set(state["artist"], forKey: "currentTrackArtist")
    sharedDefaults?.set(state["isPlaying"], forKey: "isPlaying")
    sharedDefaults?.set(state["position"], forKey: "position")
    sharedDefaults?.set(state["duration"], forKey: "duration")
    sharedDefaults?.set(state["artwork"], forKey: "artwork")
    sharedDefaults?.set(Date(), forKey: "lastUpdated")
    
    // Reload widget timeline if WidgetKit is available
    #if canImport(WidgetKit)
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    #endif
  }
  
  // MARK: - RCTBridgeModule
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  static func moduleName() -> String! {
    return "LiveActivityModule"
  }
}

// MARK: - Live Activity Attributes

#if canImport(ActivityKit)
@available(iOS 16.1, *)
struct RhoodLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var position: Double
    var duration: Double
  }
  
  var title: String
  var artist: String
  var isPlaying: Bool
}
#endif
