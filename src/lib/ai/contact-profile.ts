import type { SupabaseClient } from '@supabase/supabase-js'

export interface ContactProfile {
  name?: string | null
  email?: string | null
  company?: string | null
  phone?: string | null
  tags: string[]
  customFields: { field: string; value: string }[]
}

export async function buildContactProfile(
  db: SupabaseClient,
  contactId: string,
): Promise<ContactProfile | null> {
  const { data: contact, error: contactErr } = await db
    .from('contacts')
    .select('name, email, company, phone')
    .eq('id', contactId)
    .maybeSingle()
  if (contactErr || !contact) return null

  const { data: tags } = await db
    .from('contact_tags')
    .select('tags(name)')
    .eq('contact_id', contactId)

  const { data: customValues } = await db
    .from('contact_custom_values')
    .select('custom_fields(field_name), value')
    .eq('contact_id', contactId)

  return {
    name: contact.name,
    email: contact.email,
    company: contact.company,
    phone: contact.phone,
    tags: (
      tags
        ?.map((t: Record<string, unknown>) => (t.tags as Record<string, unknown>)?.name)
        .filter((n): n is string => !!n) ?? []
    ),
    customFields:
      customValues
        ?.map((cv: Record<string, unknown>) => ({
          field: (cv.custom_fields as Record<string, unknown>).field_name as string,
          value: (cv.value as string) ?? '',
        }))
        .filter((c: { field: string; value: string }) => c.value) ?? [],
  }
}

export function formatContactProfile(profile: ContactProfile): string {
  const lines: string[] = []
  if (profile.name) lines.push(`Name: ${profile.name}`)
  if (profile.email) lines.push(`Email: ${profile.email}`)
  if (profile.company) lines.push(`Company: ${profile.company}`)
  if (profile.phone) lines.push(`Phone: ${profile.phone}`)
  if (profile.tags.length > 0) lines.push(`Tags: ${profile.tags.join(', ')}`)
  if (profile.customFields.length > 0) {
    for (const cf of profile.customFields) {
      lines.push(`${cf.field}: ${cf.value}`)
    }
  }
  return lines.join('\n')
}
