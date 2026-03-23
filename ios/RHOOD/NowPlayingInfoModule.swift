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

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    [
      "NowPlayingRemotePlayPause",
      "NowPlayingRemoteNext",
      "NowPlayingRemotePrevious",
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
      let dict = info as? [String: Any] ?? [:]
      var nowPlaying: [String: Any] = [:]

      nowPlaying[MPMediaItemPropertyTitle] = dict["title"] as? String ?? "R/HOOD"
      nowPlaying[MPMediaItemPropertyArtist] = dict["artist"] as? String ?? ""
      nowPlaying[MPMediaItemPropertyAlbumTitle] = dict["albumTitle"] as? String ?? "R/HOOD"

      if let duration = dict["duration"] as? NSNumber {
        nowPlaying[MPMediaItemPropertyPlaybackDuration] = duration.doubleValue
      }
      if let elapsed = dict["elapsedPlaybackTime"] as? NSNumber {
        nowPlaying[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed.doubleValue
      }
      if let rate = dict["playbackRate"] as? NSNumber {
        nowPlaying[MPNowPlayingInfoPropertyPlaybackRate] = rate.doubleValue
      } else {
        nowPlaying[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
      }

      MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlaying
      self.installRemoteCommandsIfNeeded()

      if let artworkUrlString = dict["artwork"] as? String,
         let url = URL(string: artworkUrlString),
         url.scheme == "http" || url.scheme == "https" {
        self.loadArtwork(from: url)
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
      var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = positionSec.doubleValue
      info[MPMediaItemPropertyPlaybackDuration] = durationSec.doubleValue
      info[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate.doubleValue
      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      resolver(true)
    }
  }

  @objc
  func clearNowPlayingInfo(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      self.removeRemoteCommands()
      resolver(true)
    }
  }

  // MARK: - Artwork

  private func loadArtwork(from url: URL) {
    URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      guard let self = self, let data = data, let image = UIImage(data: data) else { return }
      DispatchQueue.main.async {
        let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        var np = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        np[MPMediaItemPropertyArtwork] = artwork
        MPNowPlayingInfoCenter.default().nowPlayingInfo = np
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
      self?.sendEvent(withName: "NowPlayingRemotePlayPause", body: nil)
      return .success
    }

    center.pauseCommand.isEnabled = true
    center.pauseCommand.addTarget { [weak self] _ in
      self?.sendEvent(withName: "NowPlayingRemotePlayPause", body: nil)
      return .success
    }

    center.togglePlayPauseCommand.isEnabled = true
    center.togglePlayPauseCommand.addTarget { [weak self] _ in
      self?.sendEvent(withName: "NowPlayingRemotePlayPause", body: nil)
      return .success
    }

    center.nextTrackCommand.isEnabled = true
    center.nextTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent(withName: "NowPlayingRemoteNext", body: nil)
      return .success
    }

    center.previousTrackCommand.isEnabled = true
    center.previousTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent(withName: "NowPlayingRemotePrevious", body: nil)
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

    center.playCommand.isEnabled = false
    center.pauseCommand.isEnabled = false
    center.togglePlayPauseCommand.isEnabled = false
    center.nextTrackCommand.isEnabled = false
    center.previousTrackCommand.isEnabled = false
  }
}
