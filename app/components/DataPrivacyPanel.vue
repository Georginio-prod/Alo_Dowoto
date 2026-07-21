<script setup lang="ts">
/**
 * Droits RGPD en libre-service (#286, audit sécurité — droit d'accès à la
 * portabilité et droit à l'effacement) : jusqu'ici, la politique de
 * confidentialité renvoyait vers un contact e-mail manuel pour exercer ces
 * droits. Cette fenêtre les rend directement actionnables depuis le hub
 * `/profil`.
 */
const { clear: clearSession } = useSession()

const isExporting = ref(false)
const exportError = ref('')

async function exportData() {
  if (isExporting.value) return
  isExporting.value = true
  exportError.value = ''
  try {
    const data = await $fetch('/api/account/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'worktogo-mes-donnees.json'
    link.click()
    URL.revokeObjectURL(url)
  } catch (fetchError) {
    exportError.value = apiErrorMessage(fetchError, "L'export a échoué. Réessayez.")
  } finally {
    isExporting.value = false
  }
}

const CONFIRM_PHRASE = 'SUPPRIMER'
const confirmInput = ref('')
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)
const deleteError = ref('')

async function deleteAccount() {
  if (isDeleting.value || confirmInput.value !== CONFIRM_PHRASE) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await $fetch('/api/account/delete', { method: 'POST' })
    clearSession()
    await navigateTo('/')
  } catch (fetchError) {
    deleteError.value = apiErrorMessage(fetchError, 'La suppression a échoué. Réessayez.')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h3 class="mb-1.5 text-[13.5px] font-bold text-dark">Télécharger mes données</h3>
      <p class="mb-2.5 text-[12.5px] leading-relaxed text-muted">
        Recevez une copie de vos données WorkTogo (profil, abonnement, solde) au format JSON.
      </p>
      <button
        type="button"
        class="press rounded-field border border-primary px-4 py-2 text-[13px] font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="isExporting"
        @click="exportData"
      >
        {{ isExporting ? 'Préparation…' : 'Télécharger mes données' }}
      </button>
      <p v-if="exportError" class="mt-2 text-[12.5px] text-error">{{ exportError }}</p>
    </div>

    <div class="border-t border-hairline pt-4">
      <h3 class="mb-1.5 text-[13.5px] font-bold text-error">Supprimer mon compte</h3>
      <p class="mb-2.5 text-[12.5px] leading-relaxed text-muted">
        Vos données identifiantes (nom, contact, localisation, pièces d'identité) seront effacées définitivement.
        Cette action est irréversible.
      </p>

      <button
        v-if="!showDeleteConfirm"
        type="button"
        class="press rounded-field border border-error px-4 py-2 text-[13px] font-semibold text-error"
        @click="showDeleteConfirm = true"
      >
        Supprimer mon compte
      </button>

      <div v-else class="space-y-2">
        <label for="delete-confirm" class="block text-[12.5px] text-muted">
          Tapez <strong>{{ CONFIRM_PHRASE }}</strong> pour confirmer.
        </label>
        <input
          id="delete-confirm"
          v-model="confirmInput"
          type="text"
          class="h-[42px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[13.5px] text-ink outline-none focus:border-error"
        >
        <div class="flex gap-2">
          <button
            type="button"
            class="press rounded-field bg-error px-4 py-2 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="confirmInput !== CONFIRM_PHRASE || isDeleting"
            @click="deleteAccount"
          >
            {{ isDeleting ? 'Suppression…' : 'Confirmer la suppression' }}
          </button>
          <button type="button" class="press text-[12.5px] text-muted" @click="showDeleteConfirm = false; confirmInput = ''">
            Annuler
          </button>
        </div>
        <p v-if="deleteError" class="text-[12.5px] text-error">{{ deleteError }}</p>
      </div>
    </div>
  </div>
</template>
