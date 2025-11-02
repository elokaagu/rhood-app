//
//  NowPlayingInfoModule.swift
//  RHOODApp
//
//  Native module for iOS MPNowPlayingInfoCenter to display track metadata on lock screen
//

import Foundation
import MediaPlayer
import UIKit

@objc(NowPlayingInfoModule)
class NowPlayingInfoModule: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func setNowPlayingInfo(_ info: [String: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let nowPlayingInfo = MPNowPlayingInfoCenter.default()
      var infoDict: [String: Any] = [:]
      
      // Title
      if let title = info["title"] as? String {
        infoDict[MPMediaItemPropertyTitle] = title
      }
      
      // Artist
      if let artist = info["artist"] as? String {
        infoDict[MPMediaItemPropertyArtist] = artist
      }
      
      // Album Title
      if let albumTitle = info["albumTitle"] as? String {
        infoDict[MPMediaItemPropertyAlbumTitle] = albumTitle
      }
      
      // Duration
      if let duration = info["duration"] as? Double, duration > 0 {
        infoDict[MPMediaItemPropertyPlaybackDuration] = duration
      }
      
      // Elapsed Playback Time
      if let elapsedTime = info["elapsedPlaybackTime"] as? Double {
        infoDict[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsedTime
      }
      
      // Playback Rate (1.0 = playing, 0.0 = paused)
      if let playbackRate = info["playbackRate"] as? Double {
        infoDict[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate
      }
      
      // Artwork - handle URL string
      if let artworkUrl = info["artwork"] as? String, !artworkUrl.isEmpty {
        if let url = URL(string: artworkUrl) {
          // Load image asynchronously
          URLSession.shared.dataTask(with: url) { data, response, error in
            if let data = data, let image = UIImage(data: data) {
              let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
              DispatchQueue.main.async {
                var updatedDict = infoDict
                updatedDict[MPMediaItemPropertyArtwork] = artwork
                MPNowPlayingInfoCenter.default().nowPlayingInfo = updatedDict
              }
            }
          }.resume()
        }
      }
      
      // Set the info immediately (artwork will be added later if available)
      nowPlayingInfo.nowPlayingInfo = infoDict
      resolver(nil)
    }
  }
  
  @objc
  func updatePlaybackTime(_ position: Double, _ duration: Double, _ rate: Double, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let nowPlayingInfo = MPNowPlayingInfoCenter.default()
      var infoDict = nowPlayingInfo.nowPlayingInfo ?? [:]
      
      if duration > 0 {
        infoDict[MPMediaItemPropertyPlaybackDuration] = duration
      }
      
      infoDict[MPNowPlayingInfoPropertyElapsedPlaybackTime] = position
      infoDict[MPNowPlayingInfoPropertyPlaybackRate] = rate
      
      nowPlayingInfo.nowPlayingInfo = infoDict
      resolver(nil)
    }
  }
  
  @objc
  func clearNowPlayingInfo(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      resolver(nil)
    }
  }
}

