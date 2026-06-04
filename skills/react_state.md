# SKILL: Multi-Tenant React State, Currency Calculations, and Styling

This developer skill guide outlines core patterns in the React frontend codebase for managing tenant states, dynamic currency calculations, and premium glassmorphic styling.

---

## 1. Multi-Tenant State Propagation

The [AuthContext.tsx](file:///c:/Users/hadma/development/PROYECTOS/RESTAURANT_INVENTORY_SALES_APP/frontend/src/context/AuthContext.tsx) handles global user login session, available restaurants, and the currently active restaurant context.

### A. Dynamic Tenant Selector & LocalStorage
When a user switches their active restaurant using the UI's sidebar dropdown:
1. The dropdown trigger calls `selectRestaurant(restaurant)`.
2. The context updates the `activeRestaurant` state, causing all components (Dashboard, Billings, Inventory, etc.) to re-render.
3. The selected restaurant ID is saved to `localStorage` under `restaurant_context_id` to persist the choice across page refreshes.

### B. Access Restrictions for Unassigned Users
If a logged-in user has no mapped restaurants:
- The context detects `user.role === 'USER'` and `restaurants.length === 0`.
- The user is automatically redirected to `/onboarding`, which displays a premium "Pending Assignment" panel and blocks access to standard views.
- Superadmins are mapped to a distinct Superadmin dashboard to create restaurants and manage user associations.

---

## 2. API Token & Header Isolation Propagation

All network calls map their requests using the helper [api.ts](file:///c:/Users/hadma/development/PROYECTOS/RESTAURANT_INVENTORY_SALES_APP/frontend/src/services/api.ts). 

### A. The Custom `x-restaurant-id` Header
To ensure strict multi-tenant boundary isolation at the database layer, every single operational request must carry the restaurant context. The API client appends this header automatically on every request:
```typescript
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

// 1. Append Auth Bearer Token if logged in
const token = localStorage.getItem('auth_token');
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

// 2. Append active restaurant context ID
const activeRestaurantId = localStorage.getItem('restaurant_context_id');
if (activeRestaurantId) {
  headers['x-restaurant-id'] = activeRestaurantId;
}
```

---

## 3. Dual-Currency Form Math and Conversion Calculations

Transactions support dual currency entries: US Dollars (**USD / $**) and Venezuelan Bolívares (**VES / Bs**). The frontend implements real-time assistance and strict validation matching the backend.

### A. Form Real-Time Calculated Conversions
When recording standard billing, payments, or manual cash flows, the form fields listen for dates and perform real-time conversions:
1. **Date Listener**: On date changes, a hook triggers `api.getRateByDate(date)`.
2. **Auto-Fill Math**: If a rate is found, typing into one currency field automatically computes and previews the counterpart currency value:
   - $$\text{Local VES (Bs)} = \text{USD} \times \text{Daily Rate}$$
   - $$\text{USD} = \frac{\text{Local VES}}{\text{Daily Rate}}$$
3. **No Rate Fallback**: If no rate is found for that date, a critical notice is rendered: `"No Exchange Rate exists for [Date]. Both values MUST be filled manually!"`

```tsx
// Example from Dashboard.tsx Form Input Handlers
const handleUsdChange = (val: string) => {
  setTxUsdAmount(val);
  if (!val || isNaN(Number(val))) {
    setTxLocalAmount('');
    return;
  }
  const usd = Number(val);
  const activeRate = selectedDateRate || todayRate;
  if (activeRate) {
    setTxLocalAmount((usd * activeRate).toFixed(2));
  }
};
```

### B. Intercepting strict single-currency validation errors
If a user submits a single-currency value on a date without a daily exchange rate, the backend responds with a custom validation payload:
```json
{
  "error": "EXCHANGE_RATE_REQUIRED",
  "message": "Daily USD Exchange Rate is not set for [date]. Please set it to proceed."
}
```
The frontend intercepts this error payload in submit blocks to highlight the USD rate-locking widget and guides the user to lock today's rate before continuing.

---

## 4. CSS Module Variables and Glassmorphism Layouts

The application's theme matches a state-of-the-art dark glassmorphic design system configured in [index.css](file:///c:/Users/hadma/development/PROYECTOS/RESTAURANT_INVENTORY_SALES_APP/frontend/src/index.css):

### A. Typography & Base Theme Variables
- **Font**: Outfit Font (loaded from Google Fonts).
- **Core Currencies Palette**:
  - USD Emerald green: `--color-usd: #10b981;`
  - VES Amber gold: `--color-ves: #f59e0b;`
- **Glassmorphic Tokens**:
  - Transparent Backdrop: `background: rgba(17, 24, 39, 0.4);`
  - Backdrop Blur: `backdrop-filter: blur(12px);`
  - Glowing borders: `border: 1px solid rgba(255, 255, 255, 0.08);`

### B. Standard Component Classes
Any file can leverage these standard global helper utility classes:
- **`glass-panel`**: Standard card wrapper featuring blur and soft shadows.
- **`glow-input`**: Form text/number fields with glowing neon focus states.
- **`badge badge-paid` / `badge-pending`**: Color-coded transaction or billing status badges.
