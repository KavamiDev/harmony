// Domain of the children's addresses. Placeholder until the real domain is bought.
export const MAIL_DOMAIN = "harmony.fr";
export const PRICE_EUR = 19;
export const CONTACT_EMAIL = `contact@${MAIL_DOMAIN}`;
/** Stripe Payment Link (19 EUR/year subscription). Test link in dev, live link in production. */
export const STRIPE_PAYMENT_LINK = (import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined) ?? "";
