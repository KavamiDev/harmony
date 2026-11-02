// Domain of the children's addresses (VITE_MAIL_DOMAIN in production, placeholder in dev).
export const MAIL_DOMAIN = (import.meta.env.VITE_MAIL_DOMAIN as string | undefined) || "harmony.fr";
export const PRICE_EUR = 19;
export const CONTACT_EMAIL = `contact@${MAIL_DOMAIN}`;
/** Stripe Payment Link (19 EUR/year subscription). Test link in dev, live link in production. */
export const STRIPE_PAYMENT_LINK = (import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined) ?? "";
