export const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_qkmvz1f',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_mcn89dy',
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'ulPNMrKKIb6umf-BL',
};

if (!import.meta.env.VITE_EMAILJS_SERVICE_ID || !import.meta.env.VITE_EMAILJS_TEMPLATE_ID || !import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
  console.info('ℹ️ VITE_EMAILJS environment variables not detected in build environment. Using fallback credentials.');
}
