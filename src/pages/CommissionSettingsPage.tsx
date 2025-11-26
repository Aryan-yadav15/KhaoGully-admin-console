import { useState, useEffect } from 'react';
import { 
  commissionApi, 
  type CommissionRate, 
  type CreateCommissionRate,
  type RestaurantWithCommission,
  type Restaurant 
} from '@/lib/commissionApi';
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Percent,
  Store,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function CommissionSettingsPage() {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [assignments, setAssignments] = useState<RestaurantWithCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [editingRate, setEditingRate] = useState<CommissionRate | null>(null);
  const [activeTab, setActiveTab] = useState<'rates' | 'assignments'>('rates');

  const [formData, setFormData] = useState<CreateCommissionRate>({
    rate_name: '',
    rate_percentage: 0,
    description: '',
    is_active: true,
    is_default: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ratesData, restaurantsData, assignmentsData] = await Promise.all([
        commissionApi.getRates(),
        commissionApi.getAllRestaurants(),
        commissionApi.getRestaurantsWithCommission()
      ]);
      setRates(ratesData);
      setRestaurants(restaurantsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching commission data:', error);
      alert('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRate = async () => {
    if (!formData.rate_name || formData.rate_percentage <= 0) {
      alert('Please provide a valid rate name and percentage');
      return;
    }

    try {
      await commissionApi.createRate(formData);
      alert('✓ Commission rate created successfully!');
      setShowCreateModal(false);
      setFormData({
        rate_name: '',
        rate_percentage: 0,
        description: '',
        is_active: true,
        is_default: false
      });
      fetchData();
    } catch (error) {
      console.error('Error creating rate:', error);
      alert('Failed to create commission rate');
    }
  };

  const handleUpdateRate = async () => {
    if (!editingRate) return;

    try {
      await commissionApi.updateRate(editingRate.id, {
        rate_name: editingRate.rate_name,
        rate_percentage: editingRate.rate_percentage,
        description: editingRate.description,
        is_active: editingRate.is_active,
        is_default: editingRate.is_default
      });
      alert('✓ Commission rate updated successfully!');
      setEditingRate(null);
      fetchData();
    } catch (error) {
      console.error('Error updating rate:', error);
      alert('Failed to update commission rate');
    }
  };

  const handleDeleteRate = async (id: number, rateName: string) => {
    if (!confirm(`Are you sure you want to delete "${rateName}"? This will soft-delete the rate.`)) {
      return;
    }

    try {
      await commissionApi.deleteRate(id);
      alert('✓ Commission rate deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting rate:', error);
      alert('Failed to delete commission rate');
    }
  };

  const handleToggleActive = async (rate: CommissionRate) => {
    try {
      await commissionApi.updateRate(rate.id, {
        is_active: !rate.is_active
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling rate:', error);
      alert('Failed to toggle rate status');
    }
  };

  const handleAssignRate = async (restaurantId: number, rateId: number) => {
    try {
      const rateName = rates.find(r => r.id === rateId)?.rate_name || '';
      const restaurantName = selectedRestaurant?.name || '';
      
      await commissionApi.assignRateToRestaurant({
        restaurant_id: restaurantId,
        commission_rate_id: rateId,
        notes: `Assigned via Commission Settings on ${new Date().toLocaleDateString()}`
      });
      
      setShowAssignModal(false);
      setSelectedRestaurant(null);
      
      // Refresh data to show updated assignments
      await fetchData();
      
      alert(`✓ ${rateName} assigned to ${restaurantName} successfully!`);
    } catch (error: any) {
      console.error('Error assigning rate:', error);
      const errorMsg = error?.response?.data?.detail || 'Failed to assign commission rate';
      alert(`❌ ${errorMsg}`);
    }
  };

  const getRestaurantAssignment = (restaurantId: number) => {
    return assignments.find(a => a.restaurant_id === restaurantId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading commission settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Commission Settings</h1>
            <p className="text-gray-600 mt-1">Manage commission rates and restaurant assignments</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Percent className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">Total Rates</span>
          </div>
          <div className="text-3xl font-bold">{rates.length}</div>
          <div className="text-sm opacity-80 mt-1">
            {rates.filter(r => r.is_active).length} active
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Store className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">Restaurants</span>
          </div>
          <div className="text-3xl font-bold">{restaurants.length}</div>
          <div className="text-sm opacity-80 mt-1">
            {assignments.length} with assigned rates
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">Avg Rate</span>
          </div>
          <div className="text-3xl font-bold">
            {rates.length > 0 
              ? (rates.reduce((sum, r) => sum + r.rate_percentage, 0) / rates.length).toFixed(1)
              : '0'
            }%
          </div>
          <div className="text-sm opacity-80 mt-1">Across all rates</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Check className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">Default</span>
          </div>
          <div className="text-3xl font-bold">
            {rates.find(r => r.is_default)?.rate_percentage.toFixed(1) || '0'}%
          </div>
          <div className="text-sm opacity-80 mt-1">
            {rates.find(r => r.is_default)?.rate_name || 'Not set'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-2 px-6">
            <button
              onClick={() => setActiveTab('rates')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'rates'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Commission Rates ({rates.length})
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'assignments'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Restaurant Assignments ({restaurants.length})
            </button>
          </div>
        </div>

        {/* Rates Tab */}
        {activeTab === 'rates' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Commission Rates</h2>
                <p className="text-sm text-gray-500">Create and manage commission rate plans</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Create New Rate
              </button>
            </div>

            <div className="grid gap-4">
              {rates.map((rate) => (
                <div
                  key={rate.id}
                  className={`bg-white border-2 rounded-xl p-6 transition-all ${
                    rate.is_default
                      ? 'border-green-300 shadow-lg shadow-green-100'
                      : rate.is_active
                      ? 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                      : 'border-gray-200 opacity-60'
                  }`}
                >
                  {editingRate?.id === rate.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rate Name</label>
                          <input
                            type="text"
                            value={editingRate.rate_name}
                            onChange={(e) => setEditingRate({ ...editingRate, rate_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={editingRate.rate_percentage}
                            onChange={(e) => setEditingRate({ ...editingRate, rate_percentage: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editingRate.description || ''}
                          onChange={(e) => setEditingRate({ ...editingRate, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingRate.is_active}
                            onChange={(e) => setEditingRate({ ...editingRate, is_active: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700">Active</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingRate.is_default}
                            onChange={(e) => setEditingRate({ ...editingRate, is_default: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700">Set as Default</span>
                        </label>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleUpdateRate}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          <Check className="w-4 h-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingRate(null)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">{rate.rate_name}</h3>
                          <span className="text-3xl font-bold text-purple-600">
                            {rate.rate_percentage}%
                          </span>
                          {rate.is_default && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              DEFAULT
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            rate.is_active 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {rate.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{rate.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Created: {formatDate(rate.created_at)}
                          </div>
                          {rate.updated_at !== rate.created_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Updated: {formatDate(rate.updated_at)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(rate)}
                          className={`p-2 rounded-lg ${
                            rate.is_active
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                          title={rate.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {rate.is_active ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => setEditingRate(rate)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRate(rate.id, rate.rate_name)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {rates.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No commission rates configured yet.</p>
                  <p className="text-sm mt-1">Create your first rate to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800">Restaurant Commission Assignments</h2>
              <p className="text-sm text-gray-500">View which restaurants are assigned to which commission rates</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Restaurant</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Commission Rate</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Percentage</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned On</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned By</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((restaurant) => {
                    const assignment = getRestaurantAssignment(restaurant.id);
                    return (
                      <tr key={restaurant.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{restaurant.name}</div>
                          <div className="text-xs text-gray-500">{restaurant.phone}</div>
                          <div className="text-xs text-gray-400">ID: {restaurant.id}</div>
                        </td>
                        <td className="px-4 py-4">
                          {assignment ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                              {assignment.current_rate_name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {assignment ? (
                            <span className="text-lg font-bold text-purple-600">
                              {assignment.current_rate_percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              {restaurant.commission_rate.toFixed(1)}% <span className="text-xs">(default)</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-700">
                            {assignment ? formatDate(assignment.assigned_at) : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-700">
                            {assignment ? assignment.assigned_by : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {assignment?.assignment_notes || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedRestaurant(restaurant);
                              setShowAssignModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            {assignment ? 'Change' : 'Assign'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {restaurants.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No restaurants with commission assignments yet.</p>
                  <p className="text-sm mt-1">Assign rates from the Restaurant Payments page.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Rate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New Commission Rate</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Name *</label>
                  <input
                    type="text"
                    value={formData.rate_name}
                    onChange={(e) => setFormData({ ...formData, rate_name: e.target.value })}
                    placeholder="e.g., 5% Plan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.rate_percentage}
                    onChange={(e) => setFormData({ ...formData, rate_percentage: parseFloat(e.target.value) })}
                    placeholder="5.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this commission rate..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">Set as Default</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    rate_name: '',
                    rate_percentage: 0,
                    description: '',
                    is_active: true,
                    is_default: false
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRate}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
              >
                Create Rate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Commission Modal */}
      {showAssignModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Assign Commission Rate</h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedRestaurant(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Select a commission rate for <strong>{selectedRestaurant.name}</strong>
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {rates.filter(r => r.is_active).map((rate) => (
                  <button
                    key={rate.id}
                    onClick={() => handleAssignRate(selectedRestaurant.id, rate.id)}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{rate.rate_name}</div>
                        <div className="text-sm text-gray-500">{rate.description}</div>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {rate.rate_percentage}%
                      </div>
                    </div>
                    {rate.is_default && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Default
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {rates.filter(r => r.is_active).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No active commission rates available.</p>
                  <p className="text-sm mt-1">Create a commission rate first.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
