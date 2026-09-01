import RegisterForm, { RegisterPageShell } from '@/components/RegisterForm';

export const metadata = { title: 'Register — Toys2000 Wholesale' };

export default function RegisterPage() {
  return (
    <RegisterPageShell>
      <RegisterForm />
    </RegisterPageShell>
  );
}
