export const RELATION_LABELS: Record<string, string> = {
  self: "Self",
  father: "Father",
  mother: "Mother",
  spouse: "Spouse",
  son: "Son",
  daughter: "Daughter",
  brother: "Brother",
  sister: "Sister",
  grandfather: "Grandfather",
  grandmother: "Grandmother",
  uncle: "Uncle",
  aunt: "Aunt",
  cousin: "Cousin",
  friend: "Friend",
  other: "Other",
};

export function formatRelation(relation: string): string {
  return RELATION_LABELS[relation] || relation;
}

export function formatFamilyLabel(relation: string, fullName: string): string {
  return `${formatRelation(relation)} - ${fullName}`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function calculateAge(dob: string): number | null {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
