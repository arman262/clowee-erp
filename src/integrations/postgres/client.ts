const API_BASE = import.meta.env.VITE_API_URL || 'https://erp.tolpar.com.bd/api';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('clowee_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const apiCall = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options?.headers
      }
    });
    const result = await response.json();
    return {
      data: result.data || [],
      error: result.error || null
    };
  } catch (error) {
    return { data: [], error: error.message };
  }
};

export const db = {
  from: (table: string) => ({
    select: (columns = '*') => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          const result = await apiCall(`${API_BASE}/${table}`);
          const data = result.data || [];
          const filtered = data.find((item: any) => item[column] === value);
          return { data: filtered || null, error: result.error };
        }
      }),
      order: (column: string, options?: { ascending?: boolean }) => ({
        async execute() {
          const result = await apiCall(`${API_BASE}/${table}`);
          const data = result.data || [];
          data.sort((a: any, b: any) => {
            const aVal = a[column];
            const bVal = b[column];
            return options?.ascending === false ?
              (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
          });
          return data;
        }
      }),
      async execute() {
        const result = await apiCall(`${API_BASE}/${table}`);
        return result.data || [];
      }
    }),

    insert: (data: any) => ({
      select: () => ({
        single: async () => {
          const result = await apiCall(`${API_BASE}/${table}`, {
            method: 'POST',
            body: JSON.stringify(data)
          });
          if (result.error) throw new Error(result.error);
          return { data: result.data, error: null };
        }
      })
    }),

    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: () => ({
          single: async () => {
            const result = await apiCall(`${API_BASE}/${table}/${value}`, {
              method: 'PUT',
              body: JSON.stringify(data)
            });
            if (result.error) throw new Error(result.error);
            return { data: result.data, error: null };
          }
        })
      })
    }),

    delete: () => ({
      eq: (column: string, value: any) => ({
        execute: async () => {
          const result = await apiCall(`${API_BASE}/${table}/${value}`, {
            method: 'DELETE'
          });
          if (result.error) throw new Error(result.error);
          return { error: null };
        }
      })
    })
  })
};

export default db;