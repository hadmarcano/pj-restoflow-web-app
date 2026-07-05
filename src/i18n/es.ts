/**
 * Diccionario central de etiquetas en español (es-VE) para RestoFlow.
 * Mapea enums técnicos del backend a texto legible por el usuario.
 */

export const txTypeLabels: Record<string, string> = {
  INFLOW: 'Ingreso',
  OUTFLOW: 'Egreso',
};

export const billingStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  VOID: 'Anulada',
};

export const cashCategoryLabels: Record<string, string> = {
  SALES_REVENUE: 'Ventas',
  INVESTMENT: 'Inversión de capital',
  MANUAL_INFLOW: 'Otro ingreso',
  UTILITIES: 'Servicios (luz, agua)',
  RENT: 'Alquiler',
  SALARIES: 'Nómina',
  INGREDIENTS: 'Compra de ingredientes',
  MARKETING: 'Marketing y promoción',
  TAXES: 'Impuestos',
  OTHER_EXPENSE: 'Otro gasto',
  BILLING_PAYMENT: 'Pago a proveedor',
};

export const paymentMethodLabels: Record<string, string> = {
  BANK_TRANSFER: 'Transferencia bancaria',
  CASH: 'Efectivo',
  PAGO_MOVIL: 'Pago móvil',
  CARD: 'Tarjeta',
};

export const tenantRoleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Personal',
  SUPERADMIN: 'Superadmin',
  USER: 'Usuario',
};

/** Devuelve la etiqueta traducida o el valor crudo si no hay mapeo. */
export const label = (map: Record<string, string>, key?: string | null): string =>
  (key && map[key]) || key || '';
