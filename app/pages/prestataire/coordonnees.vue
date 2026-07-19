<script setup lang="ts">
import type { ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Coordonnées complémentaires du prestataire (#hub-profil-prestataire) :
 * WhatsApp et site web / réseaux sociaux. Le contact de connexion
 * (téléphone/email, vérifié par OTP) n'est pas modifiable ici — un
 * changement casserait l'authentification ; nom et localisation restent sur
 * /profil/identite pour éviter deux surfaces d'édition du même champ.
 */
definePageMeta({ layout: 'blank', middleware: 'auth', authRole: 'prestataire' })

const { user } = useSession()
const { data } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const existing = data.value?.profile ?? null

const whatsapp = ref(existing?.whatsapp ?? '')
const website = ref(existing?.website ?? '')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  isSubmitting.value = true
  try {
    await $fetch('/api/providers/me', {
      method: 'PATCH',
      body: {
        whatsapp: whatsapp.value.trim() || undefined,
        website: website.value.trim() || undefined,
      },
    })
    success.value = true
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, "L'enregistrement a échoué. Réessayez.")
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
        <p class="mt-1 text-[13.5px] text-muted">Facilitez la prise de contact avec vos futurs clients.</p>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-5 text-lg font-bold text-dark">Coordonnées</h1>

        <div class="mb-3.5 rounded-field border border-hairline bg-bg p-3.5">
          <p class="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">Contact de connexion</p>
          <p class="text-[13.5px] font-semibold text-dark">{{ user?.contact }}</p>
          <p class="mt-1 text-[11.5px] leading-relaxed text-muted">
            Vérifié par code — non modifiable ici. Nom et localisation se modifient depuis
            <NuxtLink to="/profil/identite" class="press font-semibold text-primary">Identité</NuxtLink>.
          </p>
        </div>

        <label for="coord-whatsapp" class="mb-1.5 block text-[13px] font-semibold text-dark">Numéro WhatsApp</label>
        <input
          id="coord-whatsapp"
          v-model="whatsapp"
          type="tel"
          placeholder="Ex. +228 90 00 00 00"
          class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >

        <label for="coord-website" class="mb-1.5 block text-[13px] font-semibold text-dark">Site web / réseaux sociaux</label>
        <input
          id="coord-website"
          v-model="website"
          type="text"
          placeholder="Ex. https://facebook.com/monatelier"
          class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >

        <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">Coordonnées mises à jour.</p>
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
