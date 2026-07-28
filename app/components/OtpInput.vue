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

function onInput(index: number, e: Event) {
  const target = e.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '').slice(-1)
  target.value = value

  const next = [...props.modelValue]
  next[index] = value
  emit('update:modelValue', next)

  if (value && index < 5) inputs.value[index + 1]?.focus()
  if (next.every((d) => d !== '')) emit('complete', next.join(''))
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
      maxlength="1"
      :disabled="disabled"
      :aria-label="t('otpInput.digitAriaLabel', { n: i + 1 })"
      class="h-[54px] w-11 rounded-field border-[1.5px] text-center text-lg font-semibold text-ink outline-none focus:border-primary disabled:opacity-60"
      :class="invalid ? 'border-error' : 'border-hairline'"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
    >
  </div>
</template>
