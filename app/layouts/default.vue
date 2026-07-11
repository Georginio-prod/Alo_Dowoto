<template>
  <div class="min-h-screen bg-bg text-ink">
    <header class="sticky top-0 z-20 border-b border-black/[0.08] bg-white px-6 py-3.5">
      <div class="mx-auto flex max-w-6xl items-center gap-4">
        <div class="text-xl font-extrabold tracking-tight text-dark">
          Work<span class="text-primary">Togo</span>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>
