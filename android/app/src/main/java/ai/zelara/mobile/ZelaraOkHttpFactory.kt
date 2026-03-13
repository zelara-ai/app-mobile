package ai.zelara.mobile

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import java.security.SecureRandom
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager

/**
 * Custom OkHttp factory for Zelara HTTP/HTTPS requests.
 *
 * When a cert fingerprint has been set (via ZelaraTLSModule.setPinnedCert after QR scan),
 * uses PinnedTrustManager. Falls back to TrustAllManager before first pairing.
 *
 * NOTE: This factory applies to HTTP/HTTPS requests only. WebSocket connections in
 * React Native new-arch bypass OkHttpClientProvider — those are handled by
 * ZelaraWebSocketModule which owns its own OkHttpClient.
 */
class ZelaraOkHttpFactory : OkHttpClientFactory {

    companion object {
        @Volatile var pinnedFingerprint: String? = null
    }

    override fun createNewNetworkModuleClient(): OkHttpClient {
        val trustManager = pinnedFingerprint?.let { PinnedTrustManager(it) } ?: TrustAllManager()

        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, arrayOf<TrustManager>(trustManager), SecureRandom())

        return OkHttpClientProvider.createClientBuilder()
            .sslSocketFactory(sslContext.socketFactory, trustManager)
            .hostnameVerifier { _, _ -> true }
            .build()
    }
}
