import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-[440px] px-5 py-10 md:px-0">
      <h1 className="mb-6 font-headline text-3xl text-aura-on-surface">
        Iniciar sesión
      </h1>
      <LoginForm next={next && next.startsWith("/") ? next : "/"} />
    </div>
  );
}
