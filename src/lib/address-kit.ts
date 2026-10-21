// Ready-to-send notes asking the school, doctor or club to use the child's address.

export const RECIPIENTS = {
  school: { label: "L'école", topics: "mots, sorties, réunions, absences" },
  doctor: { label: "Le médecin", topics: "rendez-vous et rappels" },
  activity: { label: "Une activité", topics: "horaires, entraînements, sorties, cotisations" },
  other: { label: "Autre", topics: "tout ce qui concerne la famille" },
} as const;
export type Recipient = keyof typeof RECIPIENTS;

export function addressMessage(to: Recipient, c: { child: string; address: string; parents: string[]; signer: string }) {
  const both = c.parents.length >= 2 ? `à ses deux parents en même temps, ${c.parents[0]} et ${c.parents[1]}.` : "à ses deux parents en même temps.";
  const lines = [
    "Bonjour,",
    "",
    `Pour tout ce qui concerne ${c.child} (${RECIPIENTS[to].topics}), merci d'écrire désormais à cette adresse :`,
    c.address,
    "",
    `Les messages envoyés à cette adresse arrivent ${both}`,
    ...(to === "doctor" ? ["Pour des raisons de confidentialité, merci de n'y envoyer ni résultats ni ordonnances."] : []),
    "",
    "Merci beaucoup,",
    c.signer,
  ];
  return { subject: `Nouvelle adresse de contact pour ${c.child}`, body: lines.join("\n") };
}
