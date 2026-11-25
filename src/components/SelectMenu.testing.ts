import { fireEvent } from '@testing-library/react'

// Test helpers for SelectMenu: its list is drawn on the page only while open.

/** Open the box and pick the option with this value. */
export function pickOption(box: HTMLElement, value: string): void {
  fireEvent.click(box)
  const option = document.body.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`)
  if (!option) throw new Error(`SelectMenu: no option "${value}"`)
  fireEvent.click(option)
}

/** The words of every option, in order (opens the list and shuts it again). */
export function optionLabels(box: HTMLElement): string[] {
  fireEvent.click(box)
  const labels = [...document.body.querySelectorAll('[role="option"]')].map(o => o.textContent ?? '')
  fireEvent.click(box)
  return labels
}
