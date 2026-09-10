import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-[440px] px-5 py-10 md:px-0">
      <h1 className="mb-6 font-headline text-3xl text-aura-on-surface">
        Nueva contraseña
      </h1>
      <ResetPasswordForm />
    </div>
  );
}
