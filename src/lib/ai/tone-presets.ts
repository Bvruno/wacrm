import type { TonePreset } from '@/types'

export interface TonePresetConfig {
  value: TonePreset
  label: string
  labelEs: string
  instructions: string
  temperature: number
}

export const TONE_PRESETS: Record<TonePreset, TonePresetConfig> = {
  formal: {
    value: 'formal',
    label: 'Formal',
    labelEs: 'Formal',
    instructions:
      'Use a professional and formal tone. Avoid colloquialisms and slang. Be polite and respectful at all times. Use complete sentences and proper grammar.',
    temperature: 0.5,
  },
  casual: {
    value: 'casual',
    label: 'Casual',
    labelEs: 'Casual',
    instructions:
      'Use a relaxed and friendly tone. Feel free to use colloquial expressions and a conversational style. Be approachable and warm.',
    temperature: 0.8,
  },
  friendly: {
    value: 'friendly',
    label: 'Friendly',
    labelEs: 'Amigable',
    instructions:
      'Be warm and approachable. Use friendly expressions and occasional emojis when appropriate. Make the customer feel welcome and valued.',
    temperature: 0.7,
  },
  professional: {
    value: 'professional',
    label: 'Professional',
    labelEs: 'Profesional',
    instructions:
      'Maintain a professional business tone. Be accessible but authoritative. Focus on clarity and efficiency in communication.',
    temperature: 0.6,
  },
  empathetic: {
    value: 'empathetic',
    label: 'Empathetic',
    labelEs: 'Empático',
    instructions:
      'Show understanding and empathy. Validate the customer concerns and feelings. Use phrases that acknowledge their situation before providing solutions.',
    temperature: 0.7,
  },
  technical: {
    value: 'technical',
    label: 'Technical',
    labelEs: 'Técnico',
    instructions:
      'Use precise technical terminology. Be detailed and specific in explanations. Provide thorough answers with technical accuracy as priority.',
    temperature: 0.4,
  },
}

export function getToneInstructions(preset: TonePreset | null): string {
  if (!preset) return ''
  return TONE_PRESETS[preset]?.instructions ?? ''
}

export function getToneTemperature(preset: TonePreset | null): number | null {
  if (!preset) return null
  return TONE_PRESETS[preset]?.temperature ?? null
}
