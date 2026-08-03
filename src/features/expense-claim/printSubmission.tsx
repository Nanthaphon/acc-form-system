import { pdf } from '@react-pdf/renderer'
import { ExpenseClaimPdf } from './ExpenseClaimPdf'
import { getFormSettings } from '../../data/formSettings'
import { getCompany } from '../../data/companies'
import { incrementPrint } from '../../data/submissions'
import type { Submission } from '../../types/schema'

// Generate + download the PDF for a saved submission (used by the admin list pages).
// Loads the submission's form settings + company so the document matches the form template,
// then bumps the print count.
export async function downloadSubmissionPdf(s: Submission): Promise<void> {
  const settings = await getFormSettings(s.formType)
  const company = s.header.companyId ? await getCompany(s.header.companyId) : null
  const blob = await pdf(
    <ExpenseClaimPdf company={company} header={s.header} items={s.items} docNumber={s.docNumber} settings={settings} />,
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${s.docNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
  await incrementPrint(s.id)
}
