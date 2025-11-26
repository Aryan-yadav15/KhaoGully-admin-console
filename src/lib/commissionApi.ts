import api from './api';

export interface CommissionRate {
  id: number;
  rate_name: string;
  rate_percentage: number;
  description: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCommissionRate {
  rate_name: string;
  rate_percentage: number;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateCommissionRate {
  rate_name?: string;
  rate_percentage?: number;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface RestaurantCommissionAssignment {
  id: number;
  restaurant_id: number;
  commission_rate_id: number;
  assigned_at: string;
  assigned_by: string;
  notes?: string;
  commission_rate: CommissionRate;
}

export interface RestaurantWithCommission {
  restaurant_id: number;
  restaurant_name: string;
  current_commission_rate_id: number;
  current_rate_name: string;
  current_rate_percentage: number;
  assigned_at: string;
  assigned_by: string;
  assignment_notes?: string;
}

export interface AssignCommissionRequest {
  restaurant_id: number;
  commission_rate_id: number;
  notes?: string;
}

export interface ChangeCommissionRequest {
  commission_rate_id: number;
  notes?: string;
}

export interface CommissionHistory {
  id: number;
  restaurant_id: number;
  commission_rate_id: number;
  rate_name: string;
  rate_percentage: number;
  assigned_at: string;
  assigned_by: string;
  notes?: string;
}

export interface PlatformConfig {
  id: number;
  config_key: string;
  config_value: Record<string, any>;
  description?: string;
  updated_at: string;
}

export interface Restaurant {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  is_active: boolean;
  commission_rate: number;
  total_orders: number;
  rating: number;
  created_at: string;
}

// Commission Rate APIs
export const commissionApi = {
  // Get all commission rates
  getRates: async (): Promise<CommissionRate[]> => {
    const response = await api.get('/commission/rates');
    return response.data;
  },

  // Get active commission rates only
  getActiveRates: async (): Promise<CommissionRate[]> => {
    const response = await api.get('/commission/rates?active_only=true');
    return response.data;
  },

  // Create new commission rate
  createRate: async (data: CreateCommissionRate): Promise<CommissionRate> => {
    const response = await api.post('/commission/rates', data);
    return response.data;
  },

  // Update commission rate
  updateRate: async (id: number, data: UpdateCommissionRate): Promise<CommissionRate> => {
    const response = await api.patch(`/commission/rates/${id}`, data);
    return response.data;
  },

  // Delete commission rate (soft delete)
  deleteRate: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/commission/rates/${id}`);
    return response.data;
  },

  // Restaurant Commission Assignments
  
  // Get all restaurants with their commission rates
  getRestaurantsWithCommission: async (): Promise<RestaurantWithCommission[]> => {
    const response = await api.get('/commission/restaurants');
    return response.data;
  },

  // Get all restaurants from database
  getAllRestaurants: async (): Promise<Restaurant[]> => {
    const response = await api.get('/restaurant-earnings/restaurants');
    return response.data;
  },

  // Assign commission rate to restaurant
  assignRateToRestaurant: async (data: AssignCommissionRequest): Promise<RestaurantCommissionAssignment> => {
    const response = await api.post('/commission/restaurants/assign', data);
    return response.data;
  },

  // Change restaurant's commission rate
  changeRestaurantCommission: async (restaurantId: number, data: ChangeCommissionRequest): Promise<RestaurantCommissionAssignment> => {
    const response = await api.patch(`/commission/restaurants/${restaurantId}/commission`, data);
    return response.data;
  },

  // Get commission history for a restaurant
  getRestaurantCommissionHistory: async (restaurantId: number): Promise<CommissionHistory[]> => {
    const response = await api.get(`/commission/restaurants/${restaurantId}/history`);
    return response.data;
  },

  // Platform Config
  
  // Get platform configuration
  getPlatformConfig: async (): Promise<PlatformConfig> => {
    const response = await api.get('/commission/config');
    return response.data;
  },

  // Update platform configuration
  updatePlatformConfig: async (configKey: string, configValue: Record<string, any>): Promise<PlatformConfig> => {
    const response = await api.patch('/commission/config', {
      config_key: configKey,
      config_value: configValue
    });
    return response.data;
  }
};
