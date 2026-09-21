//
//  AudioTranscodeModule.swift
//  RHOOD — WAV/AIFF → AAC/M4A for mix streaming (AVAssetExportSession)
//

import AVFoundation
import Foundation
import React

@objc(AudioTranscodeModule)
class AudioTranscodeModule: RCTEventEmitter {

  private var hasListeners = false

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  override static func requiresMainQueueSetup() -> Bool {
    false
  }

  override func supportedEvents() -> [String]! {
    ["AudioTranscodeProgress"]
  }

  @objc
  func transcodeToAac(
    _ sourceUri: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let sourceURL = Self.fileURL(from: sourceUri) else {
      rejecter("E_BAD_URI", "Could not open this audio file.", nil)
      return
    }
    guard FileManager.default.fileExists(atPath: sourceURL.path) else {
      rejecter("E_MISSING", "The selected audio file is no longer on this iPhone. Pick it again.", nil)
      return
    }

    let asset = AVURLAsset(url: sourceURL)
    asset.loadValuesAsynchronously(forKeys: ["playable", "tracks"]) { [weak self] in
      var playableError: NSError?
      let playableStatus = asset.statusOfValue(forKey: "playable", error: &playableError)
      if playableStatus == .failed {
        rejecter(
          "E_UNREADABLE",
          playableError?.localizedDescription ?? "This WAV could not be read.",
          playableError
        )
        return
      }

      guard let session = AVAssetExportSession(
        asset: asset,
        presetName: AVAssetExportPresetAppleM4A
      ) else {
        rejecter(
          "E_PRESET",
          "This WAV can't be converted on iPhone. Export an MP3 from your DJ software.",
          nil
        )
        return
      }

      let outName = "rhood-mix-\(UUID().uuidString).m4a"
      let outURL = FileManager.default.temporaryDirectory.appendingPathComponent(outName)
      try? FileManager.default.removeItem(at: outURL)

      session.outputURL = outURL
      session.outputFileType = .m4a
      session.shouldOptimizeForNetworkUse = true

      let poll = DispatchSource.makeTimerSource(queue: DispatchQueue.global(qos: .utility))
      poll.schedule(deadline: .now(), repeating: 0.25)
      poll.setEventHandler { [weak self] in
        let progress = session.progress
        self?.emitProgress(progress)
      }
      poll.resume()

      session.exportAsynchronously {
        poll.cancel()
        self?.emitProgress(1)

        switch session.status {
        case .completed:
          let size = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? NSNumber)?.int64Value ?? 0
          resolver([
            "uri": outURL.absoluteString,
            "size": NSNumber(value: size),
            "mimeType": "audio/mp4",
          ])
        case .cancelled:
          try? FileManager.default.removeItem(at: outURL)
          rejecter("E_CANCELLED", "Conversion was cancelled.", nil)
        default:
          try? FileManager.default.removeItem(at: outURL)
          let message = session.error?.localizedDescription
            ?? "Couldn't convert this WAV for streaming."
          rejecter("E_EXPORT", message, session.error)
        }
      }
    }
  }

  private func emitProgress(_ progress: Float) {
    guard hasListeners else { return }
    let clamped = max(0, min(1, progress))
    DispatchQueue.main.async { [weak self] in
      guard let self = self, self.hasListeners else { return }
      self.sendEvent(
        withName: "AudioTranscodeProgress",
        body: ["progress": NSNumber(value: clamped)]
      )
    }
  }

  private static func fileURL(from uriString: String) -> URL? {
    let trimmed = uriString.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.hasPrefix("file:") {
      if let url = URL(string: trimmed) {
        return url
      }
    }
    return URL(fileURLWithPath: trimmed)
  }
}
