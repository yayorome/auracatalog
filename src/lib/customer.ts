export interface ClientProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  exterior_number: string | null;
  interior_number: string | null;
  neighborhood: string | null;
  postal_code: string | null;
  municipality: string | null;
  city: string | null;
  state: string | null;
}
