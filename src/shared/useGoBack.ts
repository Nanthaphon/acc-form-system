import { useLocation, useNavigate } from 'react-router-dom'

// "กลับ" goes back to the page the person came from — the history list they
// pressed แก้ไข on, not the form picker. Opened straight from a link (a mail,
// a bookmark), there is nothing in this app to go back to, so it goes to the
// fallback instead of leaving the app. React Router gives the first page of a
// visit the key 'default'.
export function useGoBack(): (fallback: string) => void {
  const nav = useNavigate()
  const location = useLocation()
  return fallback => (location.key !== 'default' ? nav(-1) : nav(fallback))
}
