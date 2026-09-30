import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-[440px] px-5 py-10 md:px-0">
      <h1 className="mb-6 font-headline text-3xl text-aura-on-surface">
        Restablecer contraseña
      </h1>
      <ForgotPasswordForm />
    </div>
  );
}
