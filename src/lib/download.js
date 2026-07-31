import { identity } from '../data/content'

export const resumeUrl = `${import.meta.env.BASE_URL}${identity.resumeFile}`

/** Pull down the PDF. Used by the wall-mounted sheet and by the interface. */
export function downloadResume() {
  const a = document.createElement('a')
  a.href = resumeUrl
  a.download = identity.resumeFile
  document.body.appendChild(a)
  a.click()
  a.remove()
}
