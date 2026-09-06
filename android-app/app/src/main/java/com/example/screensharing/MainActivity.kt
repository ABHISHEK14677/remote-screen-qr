package com.example.screensharing

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var relayUrlInput: EditText
    private lateinit var tokenInput: EditText

    private val projectionManager by lazy {
        getSystemService(MediaProjectionManager::class.java)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        relayUrlInput = findViewById(R.id.relayUrlInput)
        tokenInput = findViewById(R.id.tokenInput)
        val scanQrBtn = findViewById<Button>(R.id.scanQrBtn)
        val startBtn = findViewById<Button>(R.id.startBtn)
        val stopBtn = findViewById<Button>(R.id.stopBtn)

        scanQrBtn.setOnClickListener {
            startActivity(Intent(this, QrScannerActivity::class.java))
        }

        startBtn.setOnClickListener {
            requestNotificationPermissionIfNeeded()
            startActivityForResult(projectionManager.createScreenCaptureIntent(), REQ_CAPTURE)
        }

        stopBtn.setOnClickListener {
            stopService(Intent(this, ScreenStreamService::class.java))
            statusText.text = "Stopped."
        }

        // If we arrived via QR scan results
        intent.getStringExtra(QrScannerActivity.EXTRA_URL)?.let { url ->
            applyPayload(url)
        }
    }

    private fun applyPayload(url: String) {
        // expected: rsx://<host>?t=<token>&d=<deviceId>  or  wss://...
        val uri = Uri.parse(
            if (url.startsWith("rsx://")) url.replaceFirst("rsx://", "https://") else url
        )
        val scheme = if (uri.host?.startsWith("rsx") == true || url.startsWith("rsx://")) "wss" else uri.scheme
        val wsUrl = "wss://${uri.authority}/ws"
        val token = uri.getQueryParameter("t") ?: ""
        val deviceId = uri.getQueryParameter("d") ?: "device-01"

        relayUrlInput.setText("$wsUrl?role=device&d=$deviceId&t=$token")
        tokenInput.setText(token)
        statusText.text = "QR loaded. Tap START to begin streaming."
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_CAPTURE && resultCode == RESULT_OK && data != null) {
            val wsUrl = relayUrlInput.text.toString().trim()
            if (wsUrl.isEmpty()) {
                Toast.makeText(this, "Scan a QR or enter relay URL first", Toast.LENGTH_LONG).show()
                return
            }
            val svc = Intent(this, ScreenStreamService::class.java).apply {
                putExtra("resultCode", resultCode)
                putExtra("data", data)
                putExtra("wsUrl", wsUrl)
            }
            ContextCompat.startForegroundService(this, svc)
            statusText.text = "Streaming…"
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
    }

    companion object { private const val REQ_CAPTURE = 1001 }
}
