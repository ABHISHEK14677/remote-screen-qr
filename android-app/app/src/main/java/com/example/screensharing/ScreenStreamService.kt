package com.example.screensharing

import android.app.Service
import android.content.Intent
import android.os.IBinder

/** Foreground-only capture service. Create MediaProjection after explicit system consent. */
class ScreenStreamService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // TODO: create a persistent notification, then initialize the WebRTC capture pipeline.
        // Never retain or reuse MediaProjection consent outside this active session.
        return START_NOT_STICKY
    }
    override fun onBind(intent: Intent?): IBinder? = null
    companion object { const val EXTRA_RESULT_CODE = "result_code"; const val EXTRA_RESULT_DATA = "result_data" }
}
