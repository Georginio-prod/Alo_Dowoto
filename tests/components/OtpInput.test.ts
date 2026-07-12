import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OtpInput from '~/components/OtpInput.vue'

function emptyDigits(): string[] {
  return ['', '', '', '', '', '']
}

describe('OtpInput (#21 vérification OTP)', () => {
  it('émet update:modelValue avec le chiffre saisi', async () => {
    const wrapper = mount(OtpInput, { props: { modelValue: emptyDigits() } })
    const inputs = wrapper.findAll('input')
    await inputs[0]?.setValue('4')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toEqual(['4', '', '', '', '', ''])
  })

  it('ignore les caractères non numériques', async () => {
    const wrapper = mount(OtpInput, { props: { modelValue: emptyDigits() } })
    await wrapper.findAll('input')[0]?.setValue('a')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[0]?.[0]).toEqual(['', '', '', '', '', ''])
  })

  it('émet "complete" une fois les 6 chiffres saisis', async () => {
    const wrapper = mount(OtpInput, { props: { modelValue: ['1', '2', '3', '4', '5', ''] } })
    await wrapper.findAll('input')[5]?.setValue('6')

    expect(wrapper.emitted('complete')?.[0]).toEqual(['123456'])
  })

  it('n’émet pas "complete" tant qu’il manque un chiffre (cas limite)', async () => {
    const wrapper = mount(OtpInput, { props: { modelValue: ['1', '2', '', '4', '5', '6'] } })
    await wrapper.findAll('input')[0]?.setValue('9')

    expect(wrapper.emitted('complete')).toBeUndefined()
  })

  it('applique le rôle de groupe et les libellés accessibles', () => {
    const wrapper = mount(OtpInput, { props: { modelValue: emptyDigits() } })
    expect(wrapper.find('[role="group"]').exists()).toBe(true)
    expect(wrapper.findAll('input')[0]?.attributes('aria-label')).toBe('Chiffre 1')
  })
})
