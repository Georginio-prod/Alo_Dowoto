<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
  invalid?: boolean
  disabled?: boolean
}>()

const { t } = useI18n({ useScope: 'global' })

const emit = defineEmits<{
  'update:modelValue': [digits: string[]]
  complete: [code: string]
}>()

const inputs = ref<(HTMLInputElement | null)[]>([])

/**
 * Répartit une saisie à partir de la case `index` : un chiffre par case.
 *
 * Cette répartition n'est pas un luxe. Une case ne recevait auparavant qu'un
 * seul caractère (`maxlength="1"` + `slice(-1)`), or le déplacement du focus
 * vers la case suivante n'a lieu qu'une fois le gestionnaire exécuté : une
 * frappe rapide — ou un code collé depuis le SMS — arrivait dans une case déjà
 * pleine et était purement perdue (seul le premier chiffre s'inscrivait, le
 * bouton « Vérifier le code » restait grisé).
 */
function applyDigits(index: number, raw: string) {
  const digits = raw.replace(/\D/g, '')
  const next = [...props.modelValue]

  if (!digits) {
    next[index] = ''
    emit('update:modelValue', next)
    return
  }

  let cursor = index
  for (const digit of digits) {
    if (cursor > 5) break
    next[cursor] = digit
    cursor += 1
  }
  emit('update:modelValue', next)

  inputs.value[Math.min(cursor, 5)]?.focus()
  if (next.every((d) => d !== '')) emit('complete', next.join(''))
}

function onInput(index: number, e: Event) {
  const target = e.target as HTMLInputElement
  const raw = target.value
  // La case redevient ce que dit le modèle : c'est Vue qui la remplit ensuite
  // avec la valeur retenue, sans quoi les chiffres surnuméraires resteraient
  // affichés dans la première case.
  target.value = props.modelValue[index] ?? ''
  applyDigits(index, raw)
}

function onPaste(index: number, e: ClipboardEvent) {
  e.preventDefault()
  applyDigits(index, e.clipboardData?.getData('text') ?? '')
}

function onKeydown(index: number, e: KeyboardEvent) {
  if (e.key !== 'Backspace' || props.modelValue[index] || index === 0) return
  const next = [...props.modelValue]
  next[index - 1] = ''
  emit('update:modelValue', next)
  inputs.value[index - 1]?.focus()
}
</script>

<template>
  <div
    class="flex justify-center gap-2"
    :class="{ 'animate-[wt-shake_0.4s_ease-in-out]': invalid }"
    role="group"
    :aria-label="t('otpInput.groupAriaLabel')"
  >
    <input
      v-for="(digit, i) in modelValue"
      :key="i"
      :ref="(el) => (inputs[i] = el as HTMLInputElement | null)"
      :value="digit"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      :disabled="disabled"
      :aria-label="t('otpInput.digitAriaLabel', { n: i + 1 })"
      class="h-[54px] w-11 rounded-field border-[1.5px] text-center text-lg font-semibold text-ink outline-none focus:border-primary disabled:opacity-60"
      :class="invalid ? 'border-error' : 'border-hairline'"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste(i, $event)"
    >
  </div>
</template>
