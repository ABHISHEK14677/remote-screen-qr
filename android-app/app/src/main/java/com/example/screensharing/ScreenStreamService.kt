package com.example.screensharing

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Base64
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import okio.ByteString.Companion.toByteString
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit

class ScreenStreamService : Service() {

    private lateinit var projection: MediaProjection
    private lateinit var virtualDisplay: VirtualDisplay
    private lateinit var imageReader: ImageReader
    private var webSocket: WebSocket? = null
    private val handler = Handler(Looper.getMainLooper())
    private var streaming = false

    private val okHttp = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .build()

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_NOT_STICKY
        startAsForeground()

        val resultCode = intent.getIntExtra("resultCode", -1)
        @Suppress("DEPRECATION") val data = intent.getParcelableExtra<Intent>("data")!!
        val wsUrl = intent.getStringExtra("wsUrl")!!

        val pm = getSystemService(MediaProjectionManager::class.java)
        projection = pm.getMediaProjection(resultCode, data)
        projection.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() { stopSelf() }
        }, handler)

        val metrics = resources.displayMetrics
        val width = metrics.widthPixels
        val height = metrics.heightPixels

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        virtualDisplay = projection.createVirtualDisplay(
            "RemoteScreenQR", width, height, metrics.densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader.surface, null, handler
        )

        connectWebSocket(wsUrl)

        imageReader.setOnImageAvailableListener({ reader ->
            if (!streaming) return@setOnImageAvailableListener
            val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
            try {
                val jpeg = imageToJpeg(image, 55)
                webSocket?.send(jpeg.toByteString())
            } catch (e: Exception) {
                Log.e(TAG, "frame encode failed", e)
            } finally {
                image.close()
            }
        }, handler)

        return START_STICKY
    }

    private fun connectWebSocket(url: String) {
        val req = Request.Builder().url(url).build()
        webSocket = okHttp.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                streaming = true
                updateNotification("Streaming…")
            }
            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                streaming = false
                Log.e(TAG, "WS failure", t)
                stopSelf()
            }
            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                streaming = false
                stopSelf()
            }
        })
    }

    /** Convert RGBA_8888 Image -> JPEG bytes */
    private fun imageToJpeg(image: Image, quality: Int): ByteArray {
        val plane = image.planes[0]
        val rowStride = plane.rowStride
        val pixelStride = plane.pixelStride
        val width = image.width
        val height = image.height
        val buffer = plane.buffer

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val rowBuffer = ByteArray(rowStride)
        for (row in 0 until height) {
            buffer.position(row * rowStride)
            buffer.get(rowBuffer, 0, minOf(rowStride, buffer.remaining()))
            val rowArray = IntArray(width)
            for (col in 0 until width) {
                val off = col * pixelStride
                val b = rowBuffer[off].toInt() and 0xFF
                val g = rowBuffer[off + 1].toInt() and 0xFF
                val r = rowBuffer[off + 2].toInt() and 0xFF
                rowArray[col] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
            }
            bitmap.setPixels(rowArray, 0, width, 0, row, width, 1)
        }

        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
        bitmap.recycle()
        return out.toByteArray()
    }

    private fun startAsForeground() {
        val channelId = "stream_channel"
        if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(channelId, "Screen Streaming", NotificationManager.IMPORTANCE_LOW)
            )
        }
        val notif: Notification =
            if (Build.VERSION.SDK_INT >= 26) {
                Notification.Builder(this, channelId)
                    .setContentTitle("Remote Screen QR")
                    .setContentText("Screen sharing active")
                    .setSmallIcon(android.R.drawable.ic_menu_view)
                    .setOngoing(true)
                    .build()
            } else {
                Notification.Builder(this)
                    .setContentTitle("Remote Screen QR")
                    .setContentText("Screen sharing active")
                    .setSmallIcon(android.R.drawable.ic_menu_view)
                    .build()
            }
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(1, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        } else {
            startForeground(1, notif)
        }
    }

    private fun updateNotification(text: String) { /* optionally re-post notification */ }

    override fun onDestroy() {
        streaming = false
        webSocket?.close(1000, "service stopped")
        try { virtualDisplay.release() } catch (_: Exception) {}
        try { imageReader.close() } catch (_: Exception) {}
        try { projection.stop() } catch (_: Exception) {}
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object { private const val TAG = "ScreenStreamService" }
}
