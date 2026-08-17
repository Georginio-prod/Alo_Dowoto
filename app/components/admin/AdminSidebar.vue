<script setup lang="ts">
/**
 * Navigation entre les 12 modules du dashboard admin (#dashboard-admin).
 * Repliée en tiroir sur mobile (`open`), toujours visible en colonne fixe à
 * partir de `lg` — même patron que app/layouts/dashboard-prestataire.vue.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

interface NavItem {
  to: string
  label: string
  icon: string
}

const { t } = useI18n({ useScope: 'global' })

const NAV_ITEMS = computed<NavItem[]>(() => [
  { to: '/admin', label: t('admin.nav.overview'), icon: 'layout-dashboard' },
  { to: '/admin/prestataires', label: t('admin.nav.providers'), icon: 'hard-hat' },
  { to: '/admin/chercheurs', label: t('admin.nav.clients'), icon: 'users' },
  { to: '/admin/missions', label: t('admin.nav.missions'), icon: 'briefcase' },
  { to: '/admin/paiements', label: t('admin.nav.payments'), icon: 'wallet' },
  { to: '/admin/litiges', label: t('admin.nav.disputes'), icon: 'gavel' },
  { to: '/admin/abonnements', label: t('admin.nav.subscriptions'), icon: 'badge-percent' },
  { to: '/admin/avis', label: t('admin.nav.reviews'), icon: 'star' },
  { to: '/admin/anti-desintermediation', label: t('admin.nav.antiCircumvention'), icon: 'shield-alert' },
  { to: '/admin/categories', label: t('admin.nav.categories'), icon: 'layout-grid' },
  { to: '/admin/notifications', label: t('admin.nav.notifications'), icon: 'bell' },
  { to: '/admin/parametres', label: t('admin.nav.settings'), icon: 'settings' },
])

const route = useRoute()

function isActive(item: NavItem): boolean {
  return item.to === '/admin' ? route.path === '/admin' : route.path.startsWith(item.to)
}
</script>

<template>
  <!-- Fond assombri du tiroir mobile -->
  <div v-if="open" class="fixed inset-0 z-40 bg-dark/40 lg:hidden" @click="emit('close')" />

  <aside
    class="fixed inset-y-0 left-0 z-50 w-[240px] shrink-0 -translate-x-full overflow-y-auto border-r border-hairline bg-surface p-4 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
    :class="open ? 'translate-x-0' : ''"
  >
    <div class="mb-5 flex items-center justify-between">
      <NuxtLink to="/admin" class="text-[18px] font-extrabold text-dark">
        Work<span class="text-primary">Togo</span> <span class="text-[11px] font-semibold text-muted">Admin</span>
      </NuxtLink>
      <button type="button" class="press rounded-field p-1 text-muted lg:hidden" :aria-label="t('admin.sidebar.close')" @click="emit('close')">
        ✕
      </button>
    </div>

    <nav class="flex flex-col gap-1">
      <NuxtLink
        v-for="item in NAV_ITEMS"
        :key="item.to"
        :to="item.to"
        class="press rounded-field px-3 py-2.5 text-[13.5px] font-semibold"
        :class="isActive(item) ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-bg hover:text-dark'"
        @click="emit('close')"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
