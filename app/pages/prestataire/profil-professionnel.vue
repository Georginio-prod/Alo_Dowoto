<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import type { PayoutMethod, ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Édition du profil professionnel prestataire (secteur, localisation, mode
 * de rémunération, tarif, description, photo) — jusqu'ici, le bouton
 * « Compléter mon profil » de app/pages/prestataire/index.vue ne menait
 * nulle part (voir son historique) : cette page comble ce manque, sur le
 * même schéma que les autres pages profil dédiées (#165).
 */
definePageMeta({ layout: 'blank', middleware: 'auth', authRole: 'prestataire' })

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

const PAYOUT_OPTIONS: { value: PayoutMethod; label: string; color: string }[] = [
  { value: 'flooz', label: 'Flooz', color: '#ff6600' },
  { value: 'tmoney', label: 'T-Money', color: '#ffc400' },
  { value: 'virement', label: 'Virement bancaire', color: '#0F2318' },
]

const { data } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const existing = data.value?.profile ?? null

const sector = ref(existing?.sector ?? '')
const city = ref(existing?.city ?? '')
const payoutMethod = ref<PayoutMethod | null>(existing?.payoutMethod ?? null)
const rateFrom = ref<number | null>(existing?.rateFrom ?? null)
const description = ref(existing?.description ?? '')
const photoUrl = ref<string | null>(existing?.photoUrl ?? null)
const photoFileName = ref('')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  error.value = ''
  if (!ACCEPTED_TYPES.includes(file.type)) {
    error.value = 'Formats acceptés : JPEG ou PNG.'
    input.value = ''
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    error.value = 'La photo doit faire 5 Mo maximum.'
    input.value = ''
    return
  }

  photoUrl.value = await readFileAsDataUrl(file)
  photoFileName.value = file.name
}

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  if (!sector.value || !city.value.trim() || !payoutMethod.value) {
    error.value = 'Secteur, localisation et mode de rémunération sont requis.'
    return
  }

  isSubmitting.value = true
  try {
    await $fetch('/api/providers/me', {
      method: 'PATCH',
      body: {
        sector: sector.value,
        city: city.value.trim(),
        payoutMethod: payoutMethod.value,
        rateFrom: rateFrom.value ?? undefined,
        description: description.value.trim() || undefined,
        photoUrl: photoUrl.value ?? undefined,
      },
    })
    success.value = true
  } catch (fetchError) {
    const statusMessage = (fetchError as { statusMessage?: string })?.statusMessage
    error.value = statusMessage || "L'enregistrement a échoué. Réessayez."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/profil" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour au profil</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
        <p class="mt-1 text-[13.5px] text-muted">Aidez les chercheurs à mieux vous connaître avant de vous contacter.</p>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-5 text-lg font-bold text-dark">Profil professionnel</h1>

        <label for="pp-photo" class="mb-1.5 block text-[13px] font-semibold text-dark">Photo de profil</label>
        <label
          for="pp-photo"
          class="press mb-3.5 flex h-[46px] w-full cursor-pointer items-center rounded-field border-[1.5px] border-dashed border-hairline px-3.5 text-[13.5px] text-muted hover:border-primary/40"
        >
          {{ photoFileName || (photoUrl ? 'Photo déjà enregistrée — choisir un autre fichier' : 'Choisir une photo (JPEG ou PNG, 5 Mo max)') }}
        </label>
        <input id="pp-photo" type="file" accept="image/jpeg,image/png" class="sr-only" @change="onPhotoSelected">

        <label for="pp-sector" class="mb-1.5 block text-[13px] font-semibold text-dark">Secteur d'activité</label>
        <select
          id="pp-sector"
          v-model="sector"
          class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline bg-white px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
          <option value="" disabled>Choisir un secteur</option>
          <option v-for="s in SECTORS" :key="s.slug" :value="s.slug">{{ s.emoji }} {{ s.name }}</option>
        </select>

        <label for="pp-city" class="mb-1.5 block text-[13px] font-semibold text-dark">Localisation / zone d'intervention</label>
        <input
          id="pp-city"
          v-model="city"
          type="text"
          placeholder="Ex. Lomé, Kara, Kpalimé…"
          class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >

        <label for="pp-rate" class="mb-1.5 block text-[13px] font-semibold text-dark">Tarif de base (F CFA)</label>
        <input
          id="pp-rate"
          v-model.number="rateFrom"
          type="number"
          min="0"
          placeholder="Ex. 3000"
          class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >

        <label for="pp-description" class="mb-1.5 block text-[13px] font-semibold text-dark">Description</label>
        <textarea
          id="pp-description"
          v-model="description"
          rows="3"
          placeholder="Présentez votre activité, votre expérience…"
          class="mb-3.5 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[14.5px] text-ink outline-none focus:border-primary"
        />

        <div class="mb-1.5 text-[13px] font-semibold text-dark">Mode de rémunération WorkTogo</div>
        <div class="mb-3.5 grid grid-cols-3 gap-2">
          <button
            v-for="option in PAYOUT_OPTIONS"
            :key="option.value"
            type="button"
            class="press flex flex-col items-center gap-1.5 rounded-field border-2 py-3.5"
            :class="payoutMethod === option.value ? 'border-primary bg-primary/10' : 'border-hairline bg-white'"
            :aria-pressed="payoutMethod === option.value"
            @click="payoutMethod = option.value"
          >
            <span class="h-6 w-6 rounded-[8px]" :style="{ background: option.color }" />
            <span class="text-center text-[12px] font-semibold text-dark">{{ option.label }}</span>
          </button>
        </div>

        <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">Profil professionnel mis à jour.</p>
        <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

        <button
          type="button"
          class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isSubmitting"
          @click="submit"
        >
          {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>
