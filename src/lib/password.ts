export const PASSWORD_REQUIREMENTS_TEXT =
  "Mínimo 8 caracteres, con al menos una mayúscula y un número.";

/**
 * Shared rule for every place a customer sets/changes their password
 * (registerAction and ResetPasswordForm) so the requirement can't drift
 * between the two. Special characters are allowed but not required.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe incluir al menos una letra mayúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un número.";
  }
  return null;
}
