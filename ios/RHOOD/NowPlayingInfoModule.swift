//
//  NowPlayingInfoModule.swift
//  RHOOD — MPNowPlayingInfoCenter + MPRemoteCommandCenter for lock screen / Control Center
//

import Foundation
import MediaPlayer
import React
import UIKit

@objc(NowPlayingInfoModule)
class NowPlayingInfoModule: RCTEventEmitter {

  private var remoteCommandsInstalled = false
  private var hasListeners = false
  /// Ignore stale JS time updates for a moment after the user scrubs the lock screen.
  private var ignoreStaleElapsedUntil: TimeInterval = 0
  private var expectedElapsedAfterSeek: Double = 0

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  private func jsBridgeIsReady() -> Bool {
    var ready = false
    RhoodSafeRun {
      ready = (self.value(forKey: "callableJSModules") as Any?) != nil
    }
    return ready
  }

  /// Never call sendEvent from an MPRemoteCommandCenter callback. That runs off
  /// the RN thread; a Swift Double body or a nil callableJSModules aborts the app.
  private func emitRemoteEvent(_ name: String, body: [String: Any]? = nil) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self, self.hasListeners, self.jsBridgeIsReady() else { return }
      RhoodSafeRun {
        self.sendEvent(withName: name, body: body)
      }
    }
  }

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    [
      "NowPlayingRemotePlayPause",
      "NowPlayingRemoteNext",
      "NowPlayingRemotePrevious",
      "NowPlayingRemoteSeek",
    ]
  }

  // MARK: - Exported methods

  @objc
  func setNowPlayingInfo(
    _ info: NSDictionary,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      RhoodSafeRun {
        let dict = info as? [String: Any] ?? [:]
        var nowPlaying: [String: Any] = [:]

        nowPlaying[MPMediaItemPropertyTitle] = dict["title"] as? String ?? "R/HOOD"
        nowPlaying[MPMediaItemPropertyArtist] = dict["artist"] as? String ?? ""
        nowPlaying[MPMediaItemPropertyAlbumTitle] = dict["albumTitle"] as? String ?? "R/HOOD"

        if let duration = dict["duration"] as? NSNumber, duration.doubleValue.isFinite {
          nowPlaying[MPMediaItemPropertyPlaybackDuration] = duration
        }
        if let elapsed = dict["elapsedPlaybackTime"] as? NSNumber, elapsed.doubleValue.isFinite {
          nowPlaying[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
        }
        if let rate = dict["playbackRate"] as? NSNumber, rate.doubleValue.isFinite {
          nowPlaying[MPNowPlayingInfoPropertyPlaybackRate] = rate
        } else {
          nowPlaying[MPNowPlayingInfoPropertyPlaybackRate] = NSNumber(value: 1.0)
        }

        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlaying
        self.installRemoteCommandsIfNeeded()

        if let artworkUrlString = dict["artwork"] as? String,
           let url = URL(string: artworkUrlString),
           url.scheme == "http" || url.scheme == "https" {
          self.loadArtwork(from: url)
        }
      }
      resolver(true)
    }
  }

  @objc
  func updatePlaybackTime(
    _ positionSec: NSNumber,
    durationSec: NSNumber,
    playbackRate: NSNumber,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      RhoodSafeRun {
        let incoming = positionSec.doubleValue
        let duration = durationSec.doubleValue
        let rate = playbackRate.doubleValue
        guard incoming.isFinite, duration.isFinite, rate.isFinite else { return }

        let now = Date().timeIntervalSince1970
        if now < self.ignoreStaleElapsedUntil {
          if abs(incoming - self.expectedElapsedAfterSeek) > 1.25 {
            return
          }
          self.ignoreStaleElapsedUntil = 0
        }
        var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = NSNumber(value: incoming)
        info[MPMediaItemPropertyPlaybackDuration] = NSNumber(value: duration)
        info[MPNowPlayingInfoPropertyPlaybackRate] = NSNumber(value: rate)
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      }
      resolver(true)
    }
  }

  @objc
  func clearNowPlayingInfo(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      RhoodSafeRun {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        self.removeRemoteCommands()
      }
      resolver(true)
    }
  }

  // MARK: - Artwork

  private func loadArtwork(from url: URL) {
    URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      guard let self = self, let data = data, let image = UIImage(data: data) else { return }
      DispatchQueue.main.async {
        RhoodSafeRun {
          let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
          var np = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
          np[MPMediaItemPropertyArtwork] = artwork
          MPNowPlayingInfoCenter.default().nowPlayingInfo = np
        }
      }
    }.resume()
  }

  // MARK: - Remote commands

  private func installRemoteCommandsIfNeeded() {
    guard !remoteCommandsInstalled else { return }
    remoteCommandsInstalled = true

    let center = MPRemoteCommandCenter.shared()

    center.playCommand.isEnabled = true
    center.playCommand.addTarget { [weak self] _ in
      self?.emitRemoteEvent("NowPlayingRemotePlayPause")
      return .success
    }

    center.pauseCommand.isEnabled = true
    center.pauseCommand.addTarget { [weak self] _ in
      self?.emitRemoteEvent("NowPlayingRemotePlayPause")
      return .success
    }

    center.togglePlayPauseCommand.isEnabled = true
    center.togglePlayPauseCommand.addTarget { [weak self] _ in
      self?.emitRemoteEvent("NowPlayingRemotePlayPause")
      return .success
    }

    center.nextTrackCommand.isEnabled = true
    center.nextTrackCommand.addTarget { [weak self] _ in
      self?.emitRemoteEvent("NowPlayingRemoteNext")
      return .success
    }

    center.previousTrackCommand.isEnabled = true
    center.previousTrackCommand.addTarget { [weak self] _ in
      self?.emitRemoteEvent("NowPlayingRemotePrevious")
      return .success
    }

    center.changePlaybackPositionCommand.isEnabled = true
    center.changePlaybackPositionCommand.addTarget { [weak self] event in
      guard let seekEvent = event as? MPChangePlaybackPositionCommandEvent else {
        return .commandFailed
      }
      let position = seekEvent.positionTime
      guard position.isFinite, position >= 0 else { return .commandFailed }

      DispatchQueue.main.async {
        RhoodSafeRun {
          var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
          let rate = (info[MPNowPlayingInfoPropertyPlaybackRate] as? NSNumber)?.doubleValue ?? 1.0
          info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = NSNumber(value: position)
          info[MPNowPlayingInfoPropertyPlaybackRate] = NSNumber(value: rate)
          MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        }
        self?.expectedElapsedAfterSeek = position
        self?.ignoreStaleElapsedUntil = Date().timeIntervalSince1970 + 1.6
        self?.emitRemoteEvent(
          "NowPlayingRemoteSeek",
          body: ["position": NSNumber(value: position)]
        )
      }
      return .success
    }
  }

  private func removeRemoteCommands() {
    guard remoteCommandsInstalled else { return }
    remoteCommandsInstalled = false

    let center = MPRemoteCommandCenter.shared()
    center.playCommand.removeTarget(nil)
    center.pauseCommand.removeTarget(nil)
    center.togglePlayPauseCommand.removeTarget(nil)
    center.nextTrackCommand.removeTarget(nil)
    center.previousTrackCommand.removeTarget(nil)
    center.changePlaybackPositionCommand.removeTarget(nil)

    center.playCommand.isEnabled = false
    center.pauseCommand.isEnabled = false
    center.togglePlayPauseCommand.isEnabled = false
    center.nextTrackCommand.isEnabled = false
    center.previousTrackCommand.isEnabled = false
    center.changePlaybackPositionCommand.isEnabled = false
  }
}
