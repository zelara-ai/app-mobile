package ai.zelara.mobile

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.util.Base64
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager

/**
 * NativeModule that creates WebSocket connections using its own OkHttpClient with
 * certificate pinning. This bypasses React Native's WebSocketModule (which ignores
 * OkHttpClientProvider in new-arch Bridgeless mode) and directly controls TLS.
 *
 * JS side uses ZelaraPinnedWebSocket.ts which wraps this module.
 *
 * Events emitted on 'ZelaraWebSocketEvent': { id, type: 'onOpen'|'onMessage'|'onClose'|'onError', data? }
 */
class ZelaraWebSocketModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val sockets = ConcurrentHashMap<String, WebSocket>()

    override fun getName(): String = "ZelaraWebSocket"

    @ReactMethod
    fun connect(id: String, url: String, fingerprint: String?) {
        android.util.Log.d("ZelaraTLS", "connect() id=$id url=$url fingerprint='$fingerprint' (len=${fingerprint?.length})")
        val trustManager = if (!fingerprint.isNullOrEmpty()) {
            PinnedTrustManager(fingerprint)
        } else {
            android.util.Log.w("ZelaraTLS", "No fingerprint provided — using TrustAllManager")
            TrustAllManager()
        }

        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, arrayOf<TrustManager>(trustManager), SecureRandom())

        val client = OkHttpClient.Builder()
            .sslSocketFactory(sslContext.socketFactory, trustManager)
            .hostnameVerifier { _, _ -> true }
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build()

        val request = Request.Builder().url(url).build()

        client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                sockets[id] = webSocket
                emit(id, "onOpen", null)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                emit(id, "onMessage", text)
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                val encoded = Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)
                emit(id, "onBinaryMessage", encoded)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
                sockets.remove(id)
                emit(id, "onClose", null)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                sockets.remove(id)
                emit(id, "onError", t.message)
            }
        })
    }

    @ReactMethod
    fun send(id: String, message: String) {
        sockets[id]?.send(message)
    }

    @ReactMethod
    fun sendBinary(id: String, base64Data: String) {
        val bytes = Base64.decode(base64Data, Base64.NO_WRAP)
        sockets[id]?.send(ByteString.of(*bytes))
    }

    @ReactMethod
    fun close(id: String) {
        sockets[id]?.close(1000, "Closed by client")
        sockets.remove(id)
    }

    // Required by NativeEventEmitter on the JS side
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    private fun emit(id: String, type: String, data: String?) {
        val params = Arguments.createMap().apply {
            putString("id", id)
            putString("type", type)
            if (data != null) putString("data", data)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("ZelaraWebSocketEvent", params)
    }
}
