import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-[640px] px-5 py-10 md:px-0">
      <h1 className="mb-6 font-headline text-3xl text-aura-on-surface">
        Crear cuenta
      </h1>
      <RegisterForm next={next && next.startsWith("/") ? next : "/"} />
    </div>
  );
}
