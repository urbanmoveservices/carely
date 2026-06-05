/**
 * Content-Security-Policy and Permissions-Policy for Vaidya GPT.
 * Razorpay Checkout requires checkout, CDN, static, and lumberjack endpoints.
 */

const RAZORPAY_CHECKOUT = "https://checkout.razorpay.com";
const RAZORPAY_API = "https://api.razorpay.com";
const RAZORPAY_CDN = "https://cdn.razorpay.com";
const RAZORPAY_STATIC = "https://checkout-static-next.razorpay.com";
const RAZORPAY_LUMBERJACK = "https://lumberjack.razorpay.com";
const RAZORPAY_WILDCARD = "https://*.razorpay.com";

const RAZORPAY_SCRIPT_HOSTS = [
  RAZORPAY_CHECKOUT,
  RAZORPAY_CDN,
  RAZORPAY_STATIC,
].join(" ");

const RAZORPAY_FRAME_HOSTS = [RAZORPAY_API, RAZORPAY_CHECKOUT].join(" ");

function buildPermissionsPolicy() {
  // Allow Razorpay checkout iframe fraud/risk SDKs (Sardine) without console noise.
  const rzSensors = "https://api.razorpay.com https://checkout.razorpay.com";
  return [
    "payment=*",
    "camera=()",
    "microphone=()",
    "geolocation=()",
    `accelerometer=(self ${rzSensors})`,
    `gyroscope=(self ${rzSensors})`,
    "magnetometer=()",
  ].join(", ");
}

function buildContentSecurityPolicy(isDev) {
  const scriptUnsafe = isDev ? "'unsafe-eval' 'unsafe-inline'" : "'unsafe-inline'";

  const connectParts = ["connect-src 'self'", "wss:"];
  if (isDev) {
    connectParts.push(
      "ws:",
      "http://127.0.0.1:*",
      "http://localhost:*",
      "https://*.ngrok-free.dev",
      "https://*.ngrok-free.app",
      "https://*.ngrok.app"
    );
  }
  connectParts.push(
    RAZORPAY_API,
    RAZORPAY_CHECKOUT,
    RAZORPAY_LUMBERJACK,
    RAZORPAY_WILDCARD
  );

  return [
    "default-src 'self'",
    `script-src 'self' ${scriptUnsafe} ${RAZORPAY_SCRIPT_HOSTS}`,
    `script-src-elem 'self' 'unsafe-inline' ${RAZORPAY_SCRIPT_HOSTS}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${RAZORPAY_CHECKOUT} ${RAZORPAY_CDN}`,
    `img-src 'self' data: blob: ${RAZORPAY_WILDCARD} ${RAZORPAY_CHECKOUT} ${RAZORPAY_CDN} ${RAZORPAY_STATIC}`,
    `font-src 'self' data: https://fonts.gstatic.com ${RAZORPAY_WILDCARD} ${RAZORPAY_STATIC}`,
    connectParts.join(" "),
    `frame-src 'self' ${RAZORPAY_FRAME_HOSTS}`,
    `child-src 'self' ${RAZORPAY_FRAME_HOSTS}`,
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Hostnames required for Razorpay Checkout (used in tests). */
const RAZORPAY_CSP_REQUIRED_HOSTS = [
  "checkout.razorpay.com",
  "cdn.razorpay.com",
  "lumberjack.razorpay.com",
];

module.exports = {
  buildPermissionsPolicy,
  buildContentSecurityPolicy,
  RAZORPAY_CSP_REQUIRED_HOSTS,
};
