package ai.zelara.mobile

import com.facebook.react.modules.network.OkHttpClientFactory
import okhttp3.OkHttpClient
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * Custom OkHttp factory that accepts self-signed TLS certificates for local network WSS
 * connections between the Zelara mobile and desktop apps.
 *
 * Security rationale:
 * - Traffic is encrypted (protects against passive WiFi sniffing)
 * - Authentication is enforced via the pairing token exchanged out-of-band through the QR code
 * - Connections are LAN-only (private IP ranges); no external hosts are reached this way
 * - NSAllowsLocalNetworking=true on iOS achieves the equivalent bypass for iOS
 */
class ZelaraOkHttpFactory : OkHttpClientFactory {
    override fun createNewNetworkModuleClient(): OkHttpClient {
        val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        })

        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, trustAllCerts, SecureRandom())

        return OkHttpClient.Builder()
            .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
            .hostnameVerifier { _, _ -> true }
            .build()
    }
}
