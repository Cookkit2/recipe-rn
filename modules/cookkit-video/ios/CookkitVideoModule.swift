import AVFoundation
import ExpoModulesCore
import UIKit
import WebKit

public class CookkitVideoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CookkitVideo")
    AsyncFunction("resolveVideo") { (url: String, script: String) async throws -> [String: String] in
      return try await VideoLinkResolver().resolve(url, script: script)
    }
    AsyncFunction("sampleVideoCoverFrames") { (url: String, script: String) async throws -> [String: String] in
      return try await VideoLinkResolver().resolve(url, script: script, maximumMessageBytes: 1_500_000)
    }
    AsyncFunction("prepareVideo") { (uri: String, directory: String) async throws -> [String: Any] in
      guard let file = URL(string: uri), file.isFileURL,
        let output = URL(string: directory), output.isFileURL,
        output.standardizedFileURL.path.hasPrefix(FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].path + "/")
      else { throw VideoError.invalidFile }
      let asset = AVURLAsset(url: file)
      let duration = try await asset.load(.duration).seconds
      guard duration.isFinite, duration > 0, duration <= 180 else { throw VideoError.tooLong }
      let generator = AVAssetImageGenerator(asset: asset)
      generator.appliesPreferredTrackTransform = true
      generator.maximumSize = CGSize(width: 512, height: 912)
      generator.requestedTimeToleranceBefore = .zero
      generator.requestedTimeToleranceAfter = .zero
      var frames = [[String: Any]]()
      for index in 0..<8 {
        let time = max(0, min(duration - 0.05, duration * (Double(index) + 0.25) / 8))
        let result = try await generator.image(at: CMTime(seconds: time, preferredTimescale: 600))
        let image = UIImage(cgImage: result.image)
        var quality: CGFloat = 0.65
        var jpeg = image.jpegData(compressionQuality: quality)
        while (jpeg?.count ?? 0) > 130_000 && quality > 0.15 {
          quality -= 0.1
          jpeg = image.jpegData(compressionQuality: quality)
        }
        guard let data = jpeg, data.count <= 135_000 else { throw VideoError.invalidFile }
        frames.append(["timestamp": time, "mimeType": "image/jpeg", "data": data.base64EncodedString()])
      }
      var chunks = [[String: Any]]()
      var warnings = [String]()
      do {
        let audioTracks = try await asset.loadTracks(withMediaType: .audio)
        if !audioTracks.isEmpty {
          let reader = try AVAssetReader(asset: asset)
          let audio = AVAssetReaderAudioMixOutput(audioTracks: audioTracks, audioSettings: [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false
          ])
          guard reader.canAdd(audio) else { throw VideoError.invalidFile }
          reader.add(audio)
          guard reader.startReading() else { throw VideoError.invalidFile }
          var pcm = Data()
          while let sample = audio.copyNextSampleBuffer() {
            guard let buffer = CMSampleBufferGetDataBuffer(sample) else { continue }
            let count = CMBlockBufferGetDataLength(buffer)
            guard pcm.count + count <= 180 * 32000 + 32000 else {
              reader.cancelReading()
              throw VideoError.tooLong
            }
            var bytes = Data(count: count)
            let status = bytes.withUnsafeMutableBytes { destination in
              CMBlockBufferCopyDataBytes(buffer, atOffset: 0, dataLength: count, destination: destination.baseAddress!)
            }
            guard status == kCMBlockBufferNoErr else { throw VideoError.invalidFile }
            pcm.append(bytes)
          }
          guard reader.status == .completed else { throw VideoError.invalidFile }
          let chunkSize = 45 * 32000
          for offset in stride(from: 0, to: pcm.count, by: chunkSize) {
            let bytes = pcm.subdata(in: offset..<min(offset + chunkSize, pcm.count))
            let path = output.appendingPathComponent("audio-\(offset).wav")
            try wave(bytes).write(to: path, options: .atomic)
            chunks.append(["uri": path.absoluteString, "start": Double(offset) / 32000])
          }
        }
      } catch {
        chunks = []
        warnings.append("Couldn't read the audio. Check the video instructions or add its caption.")
      }
      return ["duration": duration, "frames": frames, "audioChunks": chunks, "warnings": warnings]
    }
  }
}

private func wave(_ pcm: Data) -> Data {
  var result = Data()
  func text(_ value: String) { result.append(value.data(using: .ascii)!) }
  func number<T: FixedWidthInteger>(_ value: T) {
    var little = value.littleEndian
    withUnsafeBytes(of: &little) { result.append(contentsOf: $0) }
  }
  text("RIFF"); number(UInt32(pcm.count + 36)); text("WAVEfmt ")
  number(UInt32(16)); number(UInt16(1)); number(UInt16(1))
  number(UInt32(16000)); number(UInt32(32000)); number(UInt16(2)); number(UInt16(16))
  text("data"); number(UInt32(pcm.count)); result.append(pcm)
  return result
}

private enum VideoError: Error, LocalizedError {
  case invalidFile, tooLong, inaccessible
  var errorDescription: String? {
    switch self {
    case .invalidFile: return "Couldn't read this video. Choose an MP4 or MOV video."
    case .tooLong: return "Choose a video shorter than 3 minutes."
    case .inaccessible: return "Couldn't access this video. Choose a saved video or paste the full caption."
    }
  }
}

@MainActor
private final class VideoLinkResolver: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
  private var browser: WKWebView?
  private var continuation: CheckedContinuation<[String: String], Error>?
  private var timeout: Task<Void, Never>?
  private var expectedPlatform = ""
  private var maximumMessageBytes = 65_000

  func resolve(_ address: String, script: String, maximumMessageBytes: Int = 65_000) async throws -> [String: String] {
    self.maximumMessageBytes = maximumMessageBytes
    guard let url = URL(string: address), url.scheme == "https",
      let host = url.host, allowedHost(host), script.utf8.count < 20_000
    else { throw VideoError.inaccessible }
    expectedPlatform = host.hasSuffix("tiktok.com") ? "tiktok.com" : "instagram.com"
    return try await withCheckedThrowingContinuation { continuation in
      self.continuation = continuation
      let config = WKWebViewConfiguration()
      config.websiteDataStore = .nonPersistent()
      config.allowsInlineMediaPlayback = true
      config.mediaTypesRequiringUserActionForPlayback = []
      config.userContentController.add(self, name: "cookkitVideo")
      config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
      let coverOnly = maximumMessageBytes > 65_000
      let browser = WKWebView(frame: CGRect(x: 0, y: 0, width: coverOnly ? 390 : 1, height: coverOnly ? 844 : 1), configuration: config)
      browser.isUserInteractionEnabled = false
      browser.navigationDelegate = self
      self.browser = browser
      if let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first,
        let view = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController?.view {
        browser.alpha = 0.01
        view.addSubview(browser)
      }
      browser.load(URLRequest(url: url))
      timeout = Task { [weak self] in
        try? await Task.sleep(nanoseconds: 18_000_000_000)
        if !Task.isCancelled { self?.finish(.failure(VideoError.inaccessible)) }
      }
    }
  }

  private func allowedHost(_ host: String) -> Bool {
    ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "instagram.com", "www.instagram.com"].contains(host)
  }
  func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    if action.targetFrame?.isMainFrame != false {
      guard let url = action.request.url, url.scheme == "https", let host = url.host,
        allowedHost(host), host.hasSuffix(expectedPlatform) else {
        decisionHandler(.cancel)
        if maximumMessageBytes <= 65_000 { finish(.failure(VideoError.inaccessible)) }
        return
      }
    }
    decisionHandler(.allow)
  }
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard message.frameInfo.isMainFrame, let text = message.body as? String, text.utf8.count < maximumMessageBytes,
      let data = text.data(using: .utf8), let value = try? JSONSerialization.jsonObject(with: data) as? [String: String]
    else { return }
    finish(.success(value))
  }
  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    let failure = error as NSError
    if maximumMessageBytes > 65_000 && ((failure.domain == NSURLErrorDomain && failure.code == NSURLErrorCancelled) || (failure.domain == "WebKitErrorDomain" && failure.code == 102)) { return }
    finish(.failure(VideoError.inaccessible))
  }
  private func finish(_ result: Result<[String: String], Error>) {
    guard let continuation else { return }
    self.continuation = nil
    timeout?.cancel()
    browser?.stopLoading()
    browser?.configuration.userContentController.removeScriptMessageHandler(forName: "cookkitVideo")
    browser?.removeFromSuperview()
    browser = nil
    continuation.resume(with: result)
  }
}
