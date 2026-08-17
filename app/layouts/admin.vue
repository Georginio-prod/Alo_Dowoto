<script setup lang="ts">
/**
 * Socle du dashboard admin (#dashboard-admin) : sidebar de navigation entre
 * les 12 modules + en-tête (recherche/alertes/compte), persistants d'une page
 * à l'autre. La protection réelle est côté serveur : chaque route
 * /api/admin/** revérifie le rôle (requireAdminRole) — ce layout et le
 * middleware `auth` (authRole: 'admin', voir app/middleware/auth.ts) ne font
 * qu'éviter d'afficher l'interface à qui n'y a pas accès.
 */
const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-bg text-ink lg:flex">
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="min-w-0 flex-1">
      <AdminHeader @toggle-menu="sidebarOpen = !sidebarOpen" />
      <main class="p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
