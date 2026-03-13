package ai.zelara.mobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.network.OkHttpClientProvider

/**
 * Native module that lets JS set the desktop's TLS certificate fingerprint before
 * opening the WebSocket connection. Called immediately after QR code scan with the
 * `cert` param from the pairing URL.
 *
 * After setting the fingerprint, recreates the OkHttp client factory so the next
 * WebSocket connection uses the PinnedTrustManager from ZelaraOkHttpFactory.
 */
class ZelaraTLSModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ZelaraTLS"

    @ReactMethod
    fun setPinnedCert(fingerprint: String) {
        ZelaraOkHttpFactory.pinnedFingerprint = fingerprint
        OkHttpClientProvider.setOkHttpClientFactory(ZelaraOkHttpFactory())
    }
}
