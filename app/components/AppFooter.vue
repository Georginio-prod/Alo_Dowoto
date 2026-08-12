<script setup lang="ts">
import { COMPANY_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from '~/data/companyInfo'
import { SECTORS } from '~/data/sectors'

/** Footer complet (#132) : à propos, secteurs, assistance, légal, réseaux sociaux, contact, copyright. */

const { t } = useI18n({ useScope: 'global' })

const year = new Date().getFullYear()
const featuredSectors = SECTORS.slice(0, 6)

const SOCIAL_LINKS = [
  { label: 'Facebook', icon: 'f' },
  { label: 'Instagram', icon: '◎' },
  { label: 'LinkedIn', icon: 'in' },
  { label: 'WhatsApp', icon: '☎' },
]
</script>

<template>
  <!-- Masqué sur mobile / APK (#refonte-tabbar) : la navigation y passe
       entièrement par la barre d'onglets persistante. Conservé sur desktop web
       (≥ lg), où il n'y a pas de barre d'onglets. -->
  <footer class="hidden border-t border-hairline bg-surface lg:block">
    <div class="mx-auto max-w-6xl px-6 py-12">
      <div class="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
        <div class="col-span-2 sm:col-span-3 lg:col-span-1">
          <div class="mb-2.5 text-[17px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
          <p class="mb-4 text-[12.5px] leading-relaxed text-muted">
            {{ t('footer.tagline') }}
          </p>
          <NuxtLink to="/a-propos" class="press text-[12.5px] font-semibold text-primary">{{ t('footer.aboutUs') }}</NuxtLink>

          <div class="mt-4 flex gap-2">
            <span
              v-for="social in SOCIAL_LINKS"
              :key="social.label"
              class="flex size-8 items-center justify-center rounded-full bg-bg text-[12px] font-bold text-muted"
              :title="t('footer.socialComingSoon', { name: social.label })"
              :aria-label="t('footer.socialComingSoonAria', { name: social.label })"
            >
              {{ social.icon }}
            </span>
          </div>
        </div>

        <div>
          <div class="mb-3 text-[12px] font-bold uppercase tracking-wide text-dark">{{ t('footer.sectorsLabel') }}</div>
          <ul class="flex flex-col gap-2">
            <li v-for="sector in featuredSectors" :key="sector.slug">
              <NuxtLink :to="`/categories/${sector.slug}`" class="press text-[12.5px] text-muted hover:text-primary">
                {{ sector.name }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/categories" class="press text-[12.5px] font-semibold text-primary">
                {{ t('footer.allCategories') }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div>
          <div class="mb-3 text-[12px] font-bold uppercase tracking-wide text-dark">{{ t('footer.supportLabel') }}</div>
          <ul class="flex flex-col gap-2">
            <li><NuxtLink to="/faq" class="press text-[12.5px] text-muted hover:text-primary">{{ t('footer.faq') }}</NuxtLink></li>
            <li><NuxtLink to="/aide" class="press text-[12.5px] text-muted hover:text-primary">{{ t('footer.helpCenter') }}</NuxtLink></li>
            <li><NuxtLink to="/contact" class="press text-[12.5px] text-muted hover:text-primary">{{ t('footer.contactSupport') }}</NuxtLink></li>
            <li><NuxtLink to="/reclamation" class="press text-[12.5px] text-muted hover:text-primary">{{ t('footer.complaint') }}</NuxtLink></li>
          </ul>
        </div>

        <div>
          <div class="mb-3 text-[12px] font-bold uppercase tracking-wide text-dark">{{ t('footer.legalLabel') }}</div>
          <ul class="flex flex-col gap-2">
            <li><NuxtLink to="/mentions-legales" class="press text-[12.5px] text-muted hover:text-primary">{{ t('footer.legalNotice') }}</NuxtLink></li>
            <li><NuxtLink to="/cgu" class="press text-[12.5px] text-muted hover:text-primary">{{ t('footer.terms') }}</NuxtLink></li>
            <li><NuxtLink to="/confidentialite" class="press text-[12.5px] text-muted hover:text-primary">{{ t('footer.privacy') }}</NuxtLink></li>
            <li><NuxtLink to="/cookies" class="press text-[12.5px] text-muted hover:text-primary">{{ t('footer.cookies') }}</NuxtLink></li>
          </ul>
        </div>

        <div>
          <div class="mb-3 text-[12px] font-bold uppercase tracking-wide text-dark">{{ t('footer.contactLabel') }}</div>
          <ul class="flex flex-col gap-2">
            <li>
              <a :href="`mailto:${SUPPORT_EMAIL}`" class="press text-[12.5px] text-muted hover:text-primary">{{ SUPPORT_EMAIL }}</a>
            </li>
            <li>
              <a :href="`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`" class="press text-[12.5px] text-muted hover:text-primary">{{ SUPPORT_PHONE }}</a>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-10 border-t border-hairline pt-5 text-center text-[11.5px] text-muted">
        {{ t('footer.copyright', { year, company: COMPANY_NAME }) }}
      </div>
    </div>
  </footer>
</template>
