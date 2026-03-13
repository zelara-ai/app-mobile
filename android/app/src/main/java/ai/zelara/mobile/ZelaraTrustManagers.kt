package ai.zelara.mobile

import android.util.Base64
import java.security.MessageDigest
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.X509TrustManager

/**
 * Validates the server certificate's SHA-256 DER fingerprint against the value
 * from the QR code. Prevents MITM even on a trusted LAN.
 */
internal class PinnedTrustManager(private val expectedBase64: String) : X509TrustManager {
    override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
        val fingerprint = MessageDigest.getInstance("SHA-256").digest(chain[0].encoded)
        val actual = Base64.encodeToString(fingerprint, Base64.NO_WRAP)
        android.util.Log.d("ZelaraTLS", "Expected fingerprint: '$expectedBase64' (len=${expectedBase64.length})")
        android.util.Log.d("ZelaraTLS", "Actual   fingerprint: '$actual' (len=${actual.length})")
        if (actual != expectedBase64) {
            android.util.Log.e("ZelaraTLS", "MISMATCH — expected vs actual differ")
            throw CertificateException("Cert fingerprint mismatch")
        }
        android.util.Log.d("ZelaraTLS", "Fingerprint OK")
    }
    override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
    override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
}

/**
 * Accepts all certificates. Used before first pairing (no fingerprint known yet).
 * Traffic is still encrypted; the pairing token provides authentication.
 */
internal class TrustAllManager : X509TrustManager {
    override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
    override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
    override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
}
