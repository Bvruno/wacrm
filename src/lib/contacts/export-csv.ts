import type { Contact } from '@/types';

export function contactsToCsv(contacts: Contact[], tagsMap?: Record<string, { name: string }>): string {
  const header = 'Name,Phone,Email,Company,Tags,Created\n';
  const rows = contacts.map((c) => {
    const name = c.name ?? '';
    const phone = c.phone;
    const email = c.email ?? '';
    const company = c.company ?? '';
    const tags = (c as Contact & { tags?: { id: string }[] }).tags
      ?.map((t) => {
        const tag = tagsMap?.[t.id];
        return tag?.name ?? t.id;
      })
      .join('; ') ?? '';
    const created = new Date(c.created_at).toISOString().split('T')[0];
    return [name, phone, email, company, tags, created]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',');
  });
  return header + rows.join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
