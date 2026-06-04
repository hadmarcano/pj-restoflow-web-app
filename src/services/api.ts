function normalizeApiUrl(url?: string): string {
  if (!url?.trim()) return '';
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withProtocol.replace(/\/$/, '');
}

/** Dev: rutas relativas (/api) → proxy de webpack. Prod: URL absoluta desde .env */
const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? normalizeApiUrl(process.env.REACT_APP_API_URL)
    : '';

interface FetchOptions extends RequestInit {
  useTenantHeader?: boolean;
}

class ApiService {
  private getHeaders(useTenantHeader: boolean = true): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (useTenantHeader) {
      const activeRestaurantId = localStorage.getItem('activeRestaurantId');
      if (activeRestaurantId) {
        headers['x-restaurant-id'] = activeRestaurantId;
      }
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { useTenantHeader = true, ...fetchOptions } = options;
    const url = `${BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(useTenantHeader),
        ...(fetchOptions.headers || {}),
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorPayload;
      try {
        errorPayload = await response.json();
      } catch (e) {
        errorPayload = { message: response.statusText };
      }

      // If auth error, clear session
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('activeRestaurantId');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      throw errorPayload;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // =========================================================================
  // AUTH
  // =========================================================================
  async loginBypass(email: string) {
    return this.request<any>('/api/auth/bypass', {
      method: 'POST',
      body: JSON.stringify({ email }),
      useTenantHeader: false,
    });
  }

  async loginWithGoogle(idToken: string) {
    return this.request<any>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      useTenantHeader: false,
    });
  }

  async getMe() {
    return this.request<any>('/api/auth/me', {
      method: 'GET',
      useTenantHeader: false,
    });
  }

  // =========================================================================
  // SUPERADMIN
  // =========================================================================
  async createRestaurant(name: string, slug: string, localCurrencyCode?: string, localCurrencySymbol?: string) {
    return this.request<any>('/api/superadmin/restaurants', {
      method: 'POST',
      body: JSON.stringify({ name, slug, localCurrencyCode, localCurrencySymbol }),
      useTenantHeader: false,
    });
  }

  async getSuperadminRestaurants() {
    return this.request<any[]>('/api/superadmin/restaurants', {
      method: 'GET',
      useTenantHeader: false,
    });
  }

  async getSuperadminUsers() {
    return this.request<any[]>('/api/superadmin/users', {
      method: 'GET',
      useTenantHeader: false,
    });
  }

  async assignUser(userId: string, restaurantId: string, role: 'ADMIN' | 'STAFF') {
    return this.request<any>('/api/superadmin/assignments', {
      method: 'POST',
      body: JSON.stringify({ userId, restaurantId, role }),
      useTenantHeader: false,
    });
  }

  async removeAssignment(userId: string, restaurantId: string) {
    return this.request<any>(`/api/superadmin/assignments/${userId}/${restaurantId}`, {
      method: 'DELETE',
      useTenantHeader: false,
    });
  }

  // =========================================================================
  // EXCHANGE RATES
  // =========================================================================
  async setExchangeRate(date: string, rate: number) {
    return this.request<any>('/api/exchange-rates', {
      method: 'POST',
      body: JSON.stringify({ date, rate }),
    });
  }

  async getExchangeRates() {
    return this.request<any[]>('/api/exchange-rates', {
      method: 'GET',
    });
  }

  async getRateByDate(date: string) {
    return this.request<any>(`/api/exchange-rates/${date}`, {
      method: 'GET',
    });
  }

  // =========================================================================
  // PROVIDERS
  // =========================================================================
  async getProviders() {
    return this.request<any[]>('/api/providers', {
      method: 'GET',
    });
  }

  async createProvider(data: { name: string; taxId: string; contactName?: string; phone?: string; email?: string; address?: string }) {
    return this.request<any>('/api/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProvider(id: string, data: { name: string; taxId: string; contactName?: string; phone?: string; email?: string; address?: string; active?: boolean }) {
    return this.request<any>(`/api/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProvider(id: string) {
    return this.request<any>(`/api/providers/${id}`, {
      method: 'DELETE',
    });
  }

  // =========================================================================
  // BILLINGS
  // =========================================================================
  async getBillings() {
    return this.request<any[]>('/api/billings', {
      method: 'GET',
    });
  }

  async createBilling(data: { providerId: string; billingNumber: string; issueDate: string; dueDate: string; currencyLocalAmount: number | null; currencyUsdAmount: number | null; description?: string }) {
    return this.request<any>('/api/billings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBilling(id: string, data: { issueDate: string; dueDate: string; currencyLocalAmount: number | null; currencyUsdAmount: number | null; status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'VOID'; description?: string }) {
    return this.request<any>(`/api/billings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBilling(id: string) {
    return this.request<any>(`/api/billings/${id}`, {
      method: 'DELETE',
    });
  }

  
  // =========================================================================
  // PAYMENTS
  // =========================================================================
  async createPayment(data: { billingId: string; paymentDate: string; currencyLocalAmount: number | null; currencyUsdAmount: number | null; paymentMethod: string; referenceNumber?: string; notes?: string }) {
    return this.request<any>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayments() {
    return this.request<any[]>('/api/payments', {
      method: 'GET',
    });
  }

  async getPaymentsByBilling(billingId: string) {
    return this.request<any[]>(`/api/payments/billing/${billingId}`, {
      method: 'GET',
    });
  }

  // =========================================================================
  // CASH FLOW
  // =========================================================================
  async getCashFlowTransactions() {
    return this.request<any[]>('/api/cash-flows', {
      method: 'GET',
    });
  }

  async getCashFlowSummary(startDate: string, endDate: string) {
    return this.request<any>(`/api/cash-flows/summary?startDate=${startDate}&endDate=${endDate}`, {
      method: 'GET',
    });
  }

  async recordManualCashFlow(data: { type: 'INFLOW' | 'OUTFLOW'; date: string; category: string; currencyLocalAmount: number | null; currencyUsdAmount: number | null; description?: string }) {
    return this.request<any>('/api/cash-flows/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCashFlowTransaction(id: string) {
    return this.request<any>(`/api/cash-flows/${id}`, {
      method: 'DELETE',
    });
  }

  async updateCashFlowTransaction(id: string, data: { type: 'INFLOW' | 'OUTFLOW'; date: string; category: string; currencyLocalAmount: number | null; currencyUsdAmount: number | null; description?: string }) {
    return this.request<any>(`/api/cash-flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // =========================================================================
  // INVENTORY
  // =========================================================================
  async getInventoryItems() {
    return this.request<any[]>('/api/inventory', {
      method: 'GET',
    });
  }

  async createInventoryItem(data: { name: string; sku: string; unitOfMeasure: string; unitCostLocal?: number; unitCostUsd?: number; reorderLevel?: number; description?: string; category?: string }) {
    return this.request<any>('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInventoryItem(id: string, data: { name: string; sku: string; unitOfMeasure: string; unitCostLocal?: number; unitCostUsd?: number; reorderLevel?: number; description?: string; category?: string }) {
    return this.request<any>(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adjustStock(id: string, adjustment: number) {
    return this.request<any>(`/api/inventory/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ adjustment }),
    });
  }

  async deleteInventoryItem(id: string) {
    return this.request<any>(`/api/inventory/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
export default api;
