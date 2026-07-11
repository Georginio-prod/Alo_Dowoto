<script setup lang="ts">
type Tab = 'login' | 'signup'

const route = useRoute()

const activeTab = ref<Tab>(route.query.role ? 'signup' : 'login')

function selectTab(tab: Tab) {
  activeTab.value = tab
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <div class="mb-[22px] flex rounded-field bg-bg p-1">
          <button
            type="button"
            class="press flex-1 rounded-[8px] py-2.5 text-sm font-semibold"
            :class="activeTab === 'login' ? 'bg-white text-dark' : 'text-muted'"
            @click="selectTab('login')"
          >
            Connexion
          </button>
          <button
            type="button"
            class="press flex-1 rounded-[8px] py-2.5 text-sm font-semibold"
            :class="activeTab === 'signup' ? 'bg-white text-dark' : 'text-muted'"
            @click="selectTab('signup')"
          >
            Inscription
          </button>
        </div>

        <div class="text-center text-sm text-muted">
          Formulaire à venir.
        </div>
      </div>
    </div>
  </div>
</template>
