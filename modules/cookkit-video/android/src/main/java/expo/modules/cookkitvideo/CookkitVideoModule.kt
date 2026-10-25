package expo.modules.cookkitvideo

import android.graphics.Bitmap
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min
import org.json.JSONObject

class CookkitVideoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CookkitVideo")
    AsyncFunction("resolveVideo") { address: String, script: String, promise: Promise ->
      resolvePublicVideo(address, script, promise, false)
    }
    AsyncFunction("sampleVideoCoverFrames") { address: String, script: String, promise: Promise ->
      resolvePublicVideo(address, script, promise, true)
    }

    AsyncFunction("prepareVideo") { address: String, directory: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("Open Cookkit to read the video.")
      val input = Uri.parse(address)
      val output = File(Uri.parse(directory).path ?: "").canonicalFile
      require(input.scheme == "file" && output.path.startsWith(context.cacheDir.canonicalPath + File.separator)) { "Choose a saved MP4 or MOV video." }
      val path = input.path ?: throw IllegalArgumentException("Choose a saved video.")
      val retriever = MediaMetadataRetriever()
      val frames = mutableListOf<Map<String, Any>>()
      var duration: Double
      try {
        retriever.setDataSource(path)
        duration = (retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toDoubleOrNull() ?: 0.0) / 1000
        require(duration > 0 && duration <= 180) { "Choose a video shorter than 3 minutes." }
        for (index in 0 until 8) {
          val time = max(0.0, min(duration - 0.05, duration * (index + 0.25) / 8))
          val original = retriever.getFrameAtTime((time * 1_000_000).toLong(), MediaMetadataRetriever.OPTION_CLOSEST)
            ?: throw IllegalArgumentException("Couldn't read this video's frames.")
          val scale = min(1.0, min(512.0 / original.width, 912.0 / original.height))
          val bitmap = Bitmap.createScaledBitmap(original, max(1, (original.width * scale).toInt()), max(1, (original.height * scale).toInt()), true)
          val jpeg = ByteArrayOutputStream()
          try {
            var quality = 65
            do {
              jpeg.reset()
              bitmap.compress(Bitmap.CompressFormat.JPEG, quality, jpeg)
              quality -= 10
            } while (jpeg.size() > 130000 && quality >= 15)
            require(jpeg.size() <= 135000) { "Couldn't prepare this video's frames." }
            frames.add(mapOf("timestamp" to time, "mimeType" to "image/jpeg", "data" to Base64.encodeToString(jpeg.toByteArray(), Base64.NO_WRAP)))
          } finally {
            bitmap.recycle()
            if (original !== bitmap) original.recycle()
          }
        }
      } finally { retriever.release() }
      val warnings = mutableListOf<String>()
      val pcm = try { decodeAudio(path) } catch (_: Exception) {
        warnings.add("Couldn't read the audio. Check the video instructions or add its caption.")
        byteArrayOf()
      }
      val chunks = mutableListOf<Map<String, Any>>()
      var offset = 0
      while (offset < pcm.size) {
        val bytes = pcm.copyOfRange(offset, min(offset + 45 * 32000, pcm.size))
        val file = File(output, "audio-$offset.wav")
        file.writeBytes(wave(bytes))
        chunks.add(mapOf("uri" to Uri.fromFile(file).toString(), "start" to offset / 32000.0))
        offset += bytes.size
      }
      mapOf("duration" to duration, "frames" to frames, "audioChunks" to chunks, "warnings" to warnings)
    }
  }

  private fun resolvePublicVideo(address: String, script: String, promise: Promise, coverOnly: Boolean) {
      val uri = Uri.parse(address)
      val allowed = setOf("tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "instagram.com", "www.instagram.com")
      if (uri.scheme != "https" || uri.host !in allowed || script.length > 20000) {
        promise.reject("VIDEO_ACCESS", "Choose a saved video or paste the full caption.", null)
      } else {
        Handler(Looper.getMainLooper()).post {
          val context = appContext.reactContext
          val activity = appContext.currentActivity
          if (context == null || activity == null) {
            promise.reject("VIDEO_ACCESS", "Open Cookkit to read the shared video.", null)
            return@post
          }
          val browser = WebView(activity)
          val handler = Handler(Looper.getMainLooper())
          var finished = false
          fun finish(value: Map<String, String>?) {
            if (finished) return
            finished = true
            handler.removeCallbacksAndMessages(null)
            browser.stopLoading()
            browser.removeJavascriptInterface("CookkitVideo")
            (browser.parent as? ViewGroup)?.removeView(browser)
            browser.destroy()
            if (value != null) promise.resolve(value)
            else promise.reject("VIDEO_ACCESS", "Couldn't access this video. Choose a saved video or paste the full caption.", null)
          }
          browser.settings.javaScriptEnabled = true
          browser.settings.domStorageEnabled = true
          browser.settings.allowFileAccess = false
          browser.settings.allowContentAccess = false
          browser.settings.mediaPlaybackRequiresUserGesture = false
          browser.addJavascriptInterface(object {
            @JavascriptInterface fun postMessage(text: String) {
              if (text.length > (if (coverOnly) 1500000 else 65000)) return
              handler.post {
                try {
                  val json = JSONObject(text)
                  val value = if (coverOnly) mapOf("frames" to json.getString("frames"), "reason" to json.optString("reason")) else mapOf("mediaUrl" to json.getString("mediaUrl"), "title" to json.optString("title"), "caption" to json.optString("caption"), "userAgent" to json.optString("userAgent"))
                  finish(value)
                } catch (_: Exception) { finish(null) }
              }
            }
          }, "CookkitVideo")
          browser.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
              if (!request.isForMainFrame) return false
              val next = request.url
              val platform = if (uri.host!!.endsWith("tiktok.com")) "tiktok.com" else "instagram.com"
              val blocked = next.scheme != "https" || next.host !in allowed || !next.host!!.endsWith(platform)
              if (blocked && !coverOnly) finish(null)
              return blocked
            }
            override fun onPageFinished(view: WebView, url: String) {
              if (!finished) view.evaluateJavascript(script, null)
            }
          }
          browser.alpha = 0.01f
          browser.isEnabled = false
          browser.isFocusable = false
          activity.addContentView(browser, ViewGroup.LayoutParams(if (coverOnly) activity.resources.displayMetrics.widthPixels else 1, if (coverOnly) activity.resources.displayMetrics.heightPixels else 1))
          handler.postDelayed({ finish(null) }, 18000)
          browser.loadUrl(address)
        }
      }
  }

  /** Decode to mono 16 kHz PCM so the speech recognizer receives a supported audio format. */
  private fun decodeAudio(path: String): ByteArray {
    val extractor = MediaExtractor()
    var decoder: MediaCodec? = null
    val pcm = ByteArrayOutputStream()
    try {
      extractor.setDataSource(path)
      val track = (0 until extractor.trackCount).firstOrNull { extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true } ?: return byteArrayOf()
      extractor.selectTrack(track)
      val format = extractor.getTrackFormat(track)
      var rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      var encoding = AudioFormat.ENCODING_PCM_16BIT
      val codec = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
      decoder = codec
      codec.configure(format, null, null, 0)
      codec.start()
      val info = MediaCodec.BufferInfo()
      var inputEnded = false
      var inputFrames = 0L
      var outputFrames = 0L
      val deadline = System.nanoTime() + 30_000_000_000L
      while (true) {
        require(System.nanoTime() < deadline) { "Reading the audio took too long. Try a shorter video." }
        if (!inputEnded) {
          val index = codec.dequeueInputBuffer(10000)
          if (index >= 0) {
            val buffer = codec.getInputBuffer(index)!!
            buffer.clear()
            val size = extractor.readSampleData(buffer, 0)
            if (size < 0) {
              codec.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputEnded = true
            } else {
              codec.queueInputBuffer(index, 0, size, extractor.sampleTime, 0)
              extractor.advance()
            }
          }
        }
        val index = codec.dequeueOutputBuffer(info, 10000)
        if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          val output = codec.outputFormat
          rate = output.getInteger(MediaFormat.KEY_SAMPLE_RATE)
          channels = output.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
          encoding = if (output.containsKey(MediaFormat.KEY_PCM_ENCODING)) output.getInteger(MediaFormat.KEY_PCM_ENCODING) else AudioFormat.ENCODING_PCM_16BIT
        } else if (index >= 0) {
          val buffer = codec.getOutputBuffer(index)!!.duplicate().order(ByteOrder.LITTLE_ENDIAN)
          buffer.position(info.offset)
          buffer.limit(info.offset + info.size)
          val sampleBytes = if (encoding == AudioFormat.ENCODING_PCM_FLOAT) 4 else 2
          require(rate > 0 && channels in 1..8 && encoding in setOf(AudioFormat.ENCODING_PCM_FLOAT, AudioFormat.ENCODING_PCM_16BIT)) { "Unsupported audio format." }
          while (buffer.remaining() >= sampleBytes * channels) {
            var value = 0.0
            repeat(channels) { value += if (sampleBytes == 4) buffer.float.toDouble() * 32767 else buffer.short.toDouble() }
            val sample = (value / channels).toInt().coerceIn(-32768, 32767)
            while (outputFrames * rate / 16000 <= inputFrames) {
              pcm.write(sample and 255); pcm.write((sample shr 8) and 255)
              outputFrames++
              require(pcm.size() <= 181 * 32000) { "Choose a video shorter than 3 minutes." }
            }
            inputFrames++
          }
          codec.releaseOutputBuffer(index, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
        }
      }
      return pcm.toByteArray()
    } finally {
      try { decoder?.stop() } catch (_: Exception) {}
      decoder?.release()
      extractor.release()
    }
  }

  private fun wave(bytes: ByteArray): ByteArray {
    val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    header.put("RIFF".toByteArray()); header.putInt(bytes.size + 36); header.put("WAVEfmt ".toByteArray())
    header.putInt(16); header.putShort(1); header.putShort(1); header.putInt(16000); header.putInt(32000)
    header.putShort(2); header.putShort(16); header.put("data".toByteArray()); header.putInt(bytes.size)
    return header.array() + bytes
  }
}
