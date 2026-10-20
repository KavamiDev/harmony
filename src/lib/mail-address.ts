// The child's address: <first name>.<4 chars>, e.g. lea.k7m2@<domain>.

const SUFFIX_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0, 1, i, l, o
const LOCAL = /^[a-z0-9]{2,20}\.[abcdefghjkmnpqrstuvwxyz23456789]{4}$/;

export function normalizeFirstName(name: string): string | null {
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  return n.length >= 2 ? n : null;
}

const cryptoRandom = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

export function makeMailLocal(firstName: string, random: () => number = cryptoRandom): string | null {
  const name = normalizeFirstName(firstName);
  if (!name) return null;
  const suffix = Array.from({ length: 4 }, () => SUFFIX_ALPHABET[Math.floor(random() * SUFFIX_ALPHABET.length)]).join("");
  return `${name}.${suffix}`;
}

export const isMailLocal = (s: string) => LOCAL.test(s);

/** Local part of a recipient on our domain, or null. Accepts "Name <a@b>" forms. */
export function recipientLocal(address: string, domain: string): string | null {
  const m = address.trim().match(/<?([^<>\s@]+)@([^<>\s@]+)>?$/);
  if (!m || m[2]!.toLowerCase() !== domain.toLowerCase()) return null;
  const local = m[1]!.toLowerCase();
  return isMailLocal(local) ? local : null;
}
