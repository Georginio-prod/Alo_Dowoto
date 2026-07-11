const isOpen = ref(false)
const searchTerm = ref<string | null>(null)

export function useChoiceModal() {
  function open(term?: string | null) {
    searchTerm.value = term?.trim() || null
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, searchTerm, open, close }
}
