// 같은 기관 안에서만 이름과 자동 번호를 비교한다. 식별자는 항상 recipient.id다.
export function normalizeRecipientName(name: string) {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function recipientNameFamily(name: string) {
  const normalized = normalizeRecipientName(name);
  const numbered = normalized.match(/^(.*) \((\d+)\)$/);
  return numbered && Number(numbered[2]) >= 2 ? numbered[1] : normalized;
}

export function nextRecipientName(name: string, existingNames: string[]) {
  const base = recipientNameFamily(name);
  const used = new Set(existingNames.map(normalizeRecipientName));
  if (!used.has(base)) return base;
  let number = 2;
  while (used.has(`${base} (${number})`)) number++;
  return `${base} (${number})`;
}
