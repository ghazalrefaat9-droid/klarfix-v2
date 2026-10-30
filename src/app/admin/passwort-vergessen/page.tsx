import PasswordResetForm from '@/components/PasswordResetForm'

export default function AdminPasswordResetPage() {
  return <PasswordResetForm accountType="admin" loginHref="/admin/login" />
}
