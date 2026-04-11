/**
 * Organization ID provisório para a fase sem autenticação / tenant.
 * Substitua por `NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID` (mín. 12 caracteres,
 * alfanumérico, _ ou -) quando quiser alinhar a um ambiente específico.
 */
export const PROVISIONAL_ORGANIZATION_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID?.trim() ||
  "org_tfcloud_dev";
