import { redirect } from "next/navigation";

import { AccountForm } from "@/components/account-form";
import { BackLink } from "@/components/back-link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lookupPostalCode } from "@/lib/postal-code";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, email, phone, street, exterior_number, interior_number, neighborhood, postal_code, municipality, city, state"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) redirect("/");

  const postalCodeInfo = client.postal_code
    ? await lookupPostalCode(supabase, client.postal_code)
    : null;

  return (
    <div className="mx-auto max-w-[640px] px-5 py-6 md:px-16">
      <BackLink href="/" label="Volver al catálogo" />
      <h1 className="mb-6 font-headline text-3xl text-aura-on-surface">
        Mi cuenta
      </h1>
      <AccountForm client={client} initialColonias={postalCodeInfo?.colonias ?? []} />
    </div>
  );
}
