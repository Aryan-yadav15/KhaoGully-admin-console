import { useState, useEffect } from 'react';
import axios from 'axios';
import { commissionApi, type CommissionRate } from '@/lib/commissionApi';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1';

const RestaurantPaymentsPage = () => {
  const [stats, setStats] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedRestaurantForCommission, setSelectedRestaurantForCommission] = useState<any>(null);
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  const [selectedCommissionRateId, setSelectedCommissionRateId] = useState<number | null>(null);
  const [commissionNotes, setCommissionNotes] = useState('');
  const [bankDetailsForm, setBankDetailsForm] = useState({
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_account_holder_name: '',
    upi_id: ''
  });
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const [contactForm, setContactForm] = useState({
    phone: '',
    email: ''
  });
  const [savingContact, setSavingContact] = useState(false);
  const [payoutData, setPayoutData] = useState({
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: ''
  });
  const [processingPayout, setProcessingPayout] = useState(false);
  const [syncingToPortal, setSyncingToPortal] = useState(false);
  
  // Date Filter State for Restaurant Earnings Modal
  const [restaurantStartDate, setRestaurantStartDate] = useState<string>('');
  const [restaurantEndDate, setRestaurantEndDate] = useState<string>('');
  const [filteredRestaurantEarnings, setFilteredRestaurantEarnings] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [statsRes, restaurantsRes, ratesRes] = await Promise.all([
        axios.get(`${API_URL}/restaurant-earnings/stats`, config),
        axios.get(`${API_URL}/restaurant-earnings/restaurants?status=${filterStatus}`, config),
        commissionApi.getActiveRates()
      ]);

      setStats(statsRes.data);
      setRestaurants(restaurantsRes.data);
      setCommissionRates(ratesRes);
    } catch (error) {
      console.error('Error fetching restaurant payment data:', error);
      alert('Failed to load restaurant payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);
  
  useEffect(() => {
    // Filter restaurant earnings based on date range
    if (!selectedRestaurantDetail?.earnings) {
      setFilteredRestaurantEarnings([]);
      return;
    }
    
    if (!restaurantStartDate && !restaurantEndDate) {
      setFilteredRestaurantEarnings(selectedRestaurantDetail.earnings);
      return;
    }
    
    const filtered = selectedRestaurantDetail.earnings.filter((earning: any) => {
      const earningDate = parseISO(earning.earned_at);
      
      if (restaurantStartDate && restaurantEndDate) {
        return isWithinInterval(earningDate, {
          start: startOfDay(new Date(restaurantStartDate)),
          end: endOfDay(new Date(restaurantEndDate))
        });
      } else if (restaurantStartDate) {
        return earningDate >= startOfDay(new Date(restaurantStartDate));
      } else if (restaurantEndDate) {
        return earningDate <= endOfDay(new Date(restaurantEndDate));
      }
      return true;
    });
    
    setFilteredRestaurantEarnings(filtered);
  }, [restaurantStartDate, restaurantEndDate, selectedRestaurantDetail]);

  const handleSelectAll = () => {
    if (selectedRestaurants.length === restaurants.length) {
      setSelectedRestaurants([]);
    } else {
      setSelectedRestaurants(restaurants.map(r => r.restaurant_id));
    }
  };

  const handleSelectRestaurant = (restaurantId: number) => {
    setSelectedRestaurants(prev =>
      prev.includes(restaurantId)
        ? prev.filter(id => id !== restaurantId)
        : [...prev, restaurantId]
    );
  };

  const handleOpenCommissionModal = (restaurant: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRestaurantForCommission(restaurant);
    setSelectedCommissionRateId(null);
    setCommissionNotes('');
    setShowCommissionModal(true);
  };

  const handleViewDetails = async (restaurantId: number) => {
    try {
      setLoadingDetail(true);
      setShowDetailModal(true);
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(
        `${API_URL}/restaurant-earnings/restaurants/${restaurantId}?show_paid=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedRestaurantDetail(response.data);
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      alert('Failed to load restaurant details');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAssignCommission = async () => {
    if (!selectedRestaurantForCommission || !selectedCommissionRateId) {
      alert('Please select a commission rate');
      return;
    }

    try {
      await commissionApi.assignRateToRestaurant({
        restaurant_id: selectedRestaurantForCommission.restaurant_id,
        commission_rate_id: selectedCommissionRateId,
        notes: commissionNotes || undefined
      });
      
      alert('✓ Commission rate assigned successfully!');
      setShowCommissionModal(false);
      setSelectedRestaurantForCommission(null);
      fetchData();
    } catch (error) {
      console.error('Error assigning commission rate:', error);
      alert('Failed to assign commission rate');
    }
  };

  const handleOpenEditBankDetails = () => {
    if (!selectedRestaurantDetail) return;
    
    setBankDetailsForm({
      bank_account_number: selectedRestaurantDetail.summary.bank_account_number || '',
      bank_ifsc_code: selectedRestaurantDetail.summary.bank_ifsc_code || '',
      bank_account_holder_name: selectedRestaurantDetail.summary.bank_account_holder_name || '',
      upi_id: selectedRestaurantDetail.summary.upi_id || ''
    });
    setShowEditBankModal(true);
  };

  const handleSaveBankDetails = async () => {
    if (!selectedRestaurantDetail) return;

    try {
      setSavingBankDetails(true);
      const token = localStorage.getItem('admin_token');
      
      await axios.patch(
        `${API_URL}/restaurants/${selectedRestaurantDetail.summary.restaurant_id}`,
        bankDetailsForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('✓ Bank details updated successfully!');
      setShowEditBankModal(false);
      
      // Refresh details
      handleViewDetails(selectedRestaurantDetail.summary.restaurant_id);
      // Refresh main list
      fetchData();
    } catch (error) {
      console.error('Error updating bank details:', error);
      alert('Failed to update bank details');
    } finally {
      setSavingBankDetails(false);
    }
  };

  const handleSaveContact = async () => {
    if (!selectedRestaurantDetail) return;

    if (!contactForm.phone) {
      alert('Phone number is required for syncing to portal');
      return;
    }

    try {
      setSavingContact(true);
      const token = localStorage.getItem('admin_token');
      
      await axios.patch(
        `${API_URL}/restaurants/${selectedRestaurantDetail.summary.restaurant_id}`,
        {
          phone: contactForm.phone,
          email: contactForm.email
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('✅ Contact info updated! You can now sync to portal.');
      setShowEditContactModal(false);
      
      // Refresh details
      handleViewDetails(selectedRestaurantDetail.summary.restaurant_id);
      fetchData();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('❌ Failed to update contact info');
    } finally {
      setSavingContact(false);
    }
  };

  const handleSyncToPortal = async (restaurantId: number, restaurantName: string) => {
    if (!confirm(`Sync "${restaurantName}" earnings to restaurant portal?\n\nThis will send:\n- Earnings summary\n- Order statistics\n- Commission info\n\nBank details will NOT be synced.`)) {
      return;
    }

    try {
      setSyncingToPortal(true);
      const token = localStorage.getItem('admin_token');
      const response = await axios.post(
        `${API_URL}/restaurant-earnings/sync-to-restaurant-portal/${restaurantId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`✅ Successfully synced to restaurant portal!\n\nRestaurant: ${response.data.restaurant_name}\nEarnings: ₹${response.data.data_summary.total_lifetime_earnings}\nOrders: ${response.data.data_summary.total_completed_orders}`);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to sync to restaurant portal';
      alert(`❌ Sync Failed\n\n${errorMsg}`);
    } finally {
      setSyncingToPortal(false);
    }
  };

  const handleProcessPayout = async () => {
    if (selectedRestaurants.length === 0) {
      alert('Please select at least one restaurant');
      return;
    }

    if (!payoutData.payment_reference) {
      alert('Please enter a payment reference');
      return;
    }

    try {
      setProcessingPayout(true);
      const token = localStorage.getItem('admin_token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.post(
        `${API_URL}/restaurant-earnings/process-payout`,
        {
          restaurant_ids: selectedRestaurants,
          payment_method: payoutData.payment_method,
          payment_reference: payoutData.payment_reference,
          notes: payoutData.notes
        },
        config
      );

      if (response.data.success) {
        alert(`✓ Payout processed successfully!\nTotal: ₹${response.data.total_amount_paid}\nRestaurants paid: ${response.data.total_restaurants_paid}`);
        setShowPayoutModal(false);
        setSelectedRestaurants([]);
        setPayoutData({ payment_method: 'bank_transfer', payment_reference: '', notes: '' });
        fetchData();
      } else {
        alert(`⚠ Payout completed with issues:\n${response.data.message}`);
        if (response.data.failed_restaurants?.length > 0) {
          console.error('Failed restaurants:', response.data.failed_restaurants);
        }
        fetchData();
      }
    } catch (error) {
      console.error('Error processing payout:', error);
      alert('Failed to process payout');
    } finally {
      setProcessingPayout(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    return `₹${amount?.toFixed(2) || '0.00'}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading restaurant payments...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Restaurant Payments</h1>
        <p className="text-gray-600 mt-1">Manage restaurant earnings and payouts</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Total Pending</div>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.total_pending_amount)}</div>
            <div className="text-xs text-gray-400 mt-1">{stats.total_restaurants_pending} restaurants</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Paid This Month</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_paid_this_month)}</div>
            <div className="text-xs text-gray-400 mt-1">Current month payouts</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Total Commission</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_commission_earned)}</div>
            <div className="text-xs text-gray-400 mt-1">Platform earnings</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Next Payout</div>
            <div className="text-2xl font-bold text-purple-600">{formatDate(stats.next_payout_date)}</div>
            <div className="text-xs text-gray-400 mt-1">{stats.current_cycle_name}</div>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filterStatus === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending Payments
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filterStatus === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Restaurants
            </button>
          </div>

          {selectedRestaurants.length > 0 && (
            <button
              onClick={() => setShowPayoutModal(true)}
              className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center gap-2"
            >
              Process Payout ({selectedRestaurants.length})
            </button>
          )}
        </div>

        {/* Restaurant List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRestaurants.length === restaurants.length && restaurants.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Restaurant</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Commission Rate</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pending Amount</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Orders (Pending)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Lifetime Earnings</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bank Details</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Payment</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((restaurant) => (
                <tr 
                  key={restaurant.restaurant_id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewDetails(restaurant.restaurant_id)}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRestaurants.includes(restaurant.restaurant_id)}
                      onChange={() => handleSelectRestaurant(restaurant.restaurant_id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{restaurant.restaurant_name}</div>
                    <div className="text-xs text-gray-500">ID: {restaurant.restaurant_id}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700">{restaurant.restaurant_phone}</div>
                    <div className="text-xs text-gray-500">{restaurant.restaurant_email}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {(restaurant.commission_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="font-semibold text-orange-600">{formatCurrency(restaurant.total_pending_earnings)}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-sm text-gray-700">{restaurant.pending_orders}</div>
                    <div className="text-xs text-gray-500">of {restaurant.total_orders}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-sm text-gray-700">{formatCurrency(restaurant.lifetime_earnings)}</div>
                    <div className="text-xs text-gray-500">Avg: {formatCurrency(restaurant.avg_earnings_per_order)}</div>
                  </td>
                  <td className="px-4 py-4">
                    {restaurant.has_bank_details ? (
                      <div>
                        {restaurant.bank_account_number && (
                          <div className="text-xs text-gray-700">Acc: •••{restaurant.bank_account_number.slice(-4)}</div>
                        )}
                        {restaurant.upi_id && (
                          <div className="text-xs text-gray-700">UPI: {restaurant.upi_id}</div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ⚠ Missing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {restaurant.last_payment_date ? (
                      <div>
                        <div className="text-xs text-gray-700">{formatDate(restaurant.last_payment_date)}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(restaurant.last_payment_amount)}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No payments yet</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={(e) => handleOpenCommissionModal(restaurant, e)}
                      className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-colors"
                      title="Assign/Change Commission Rate"
                    >
                      Set Rate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {restaurants.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No restaurants found for the selected filter
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Details Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {loadingDetail ? 'Loading...' : selectedRestaurantDetail?.summary.restaurant_name}
                  </h2>
                  {!loadingDetail && selectedRestaurantDetail && (
                    <button
                      onClick={() => {
                        setContactForm({
                          phone: selectedRestaurantDetail.summary.restaurant_phone || '',
                          email: selectedRestaurantDetail.summary.restaurant_email || ''
                        });
                        setShowEditContactModal(true);
                      }}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                      title="Edit contact info"
                    >
                      Edit Contact
                    </button>
                  )}
                </div>
                {!loadingDetail && selectedRestaurantDetail && (
                  <div className="text-sm text-gray-600 mt-1 flex gap-4">
                    <span>ID: {selectedRestaurantDetail.summary.restaurant_id}</span>
                    <span>•</span>
                    <span>{selectedRestaurantDetail.summary.restaurant_phone || '❌ No phone'}</span>
                    <span>•</span>
                    <span>{selectedRestaurantDetail.summary.restaurant_email || '❌ No email'}</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : selectedRestaurantDetail ? (
                <div className="space-y-8">
                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                      <div className="text-sm text-orange-600 font-medium mb-1">Pending Payment</div>
                      <div className="text-2xl font-bold text-orange-700">
                        {formatCurrency(selectedRestaurantDetail.summary.total_pending_earnings)}
                      </div>
                      <div className="text-xs text-orange-500 mt-1">
                        {selectedRestaurantDetail.summary.pending_orders} unpaid orders
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <div className="text-sm text-green-600 font-medium mb-1">Total Paid</div>
                      <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(selectedRestaurantDetail.summary.total_paid_earnings)}
                      </div>
                      <div className="text-xs text-green-500 mt-1">
                        Lifetime earnings paid out
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div className="text-sm text-blue-600 font-medium mb-1">Platform Commission</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {formatCurrency(selectedRestaurantDetail.summary.total_commission)}
                      </div>
                      <div className="text-xs text-blue-500 mt-1">
                        Total revenue for platform
                      </div>
                    </div>
                  </div>

                  {/* Detailed Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Stats */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700">
                        Performance Statistics
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Total Orders</span>
                          <span className="font-medium">{selectedRestaurantDetail.summary.total_orders}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Total Order Value</span>
                          <span className="font-medium">{formatCurrency(selectedRestaurantDetail.summary.total_order_value)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Avg. Earnings / Order</span>
                          <span className="font-medium">{formatCurrency(selectedRestaurantDetail.summary.avg_earnings_per_order)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Current Commission Rate</span>
                          <span className="font-medium px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {(selectedRestaurantDetail.summary.commission_rate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Bank & Payment Info */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 flex justify-between items-center">
                        <span>Payment Information</span>
                        <button
                          onClick={handleOpenEditBankDetails}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          Edit Details
                        </button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Bank Account</span>
                          <span className="font-medium">
                            {selectedRestaurantDetail.summary.bank_account_number || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">IFSC Code</span>
                          <span className="font-medium">
                            {selectedRestaurantDetail.summary.bank_ifsc_code || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Account Holder</span>
                          <span className="font-medium">
                            {selectedRestaurantDetail.summary.bank_account_holder_name || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">UPI ID</span>
                          <span className="font-medium">
                            {selectedRestaurantDetail.summary.upi_id || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Last Payment Date</span>
                          <span className="font-medium">
                            {formatDate(selectedRestaurantDetail.summary.last_payment_date)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Last Payment Amount</span>
                          <span className="font-medium">
                            {formatCurrency(selectedRestaurantDetail.summary.last_payment_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Earnings Table */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Recent Earnings History</h3>
                      
                      {/* Date Filter */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-gray-600" />
                          <input
                            type="date"
                            value={restaurantStartDate}
                            onChange={(e) => setRestaurantStartDate(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Start Date"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="date"
                            value={restaurantEndDate}
                            onChange={(e) => setRestaurantEndDate(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="End Date"
                          />
                          {(restaurantStartDate || restaurantEndDate) && (
                            <button
                              onClick={() => {
                                setRestaurantStartDate('');
                                setRestaurantEndDate('');
                              }}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Clear filter"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Order ID</th>
                            <th className="px-4 py-3 text-center">Order Status</th>
                            <th className="px-4 py-3 text-right">Food Value</th>
                            <th className="px-4 py-3 text-right">Delivery</th>
                            <th className="px-4 py-3 text-right">Commission</th>
                            <th className="px-4 py-3 text-right">Net Earning</th>
                            <th className="px-4 py-3 text-center">Payout Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredRestaurantEarnings.map((earning: any) => (
                            <tr key={earning.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">
                                {new Date(earning.earned_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                #{earning.order_id}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  earning.order_status === 'DELIVERED' 
                                    ? 'bg-green-100 text-green-700' 
                                    : earning.order_status === 'CANCELLED'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {earning.order_status || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-900">
                                {formatCurrency(earning.food_value || (earning.order_total - (earning.delivery_fee || 0)))}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-500">
                                {earning.delivery_fee && earning.delivery_fee > 0 && earning.delivery_fee !== 10 && earning.delivery_fee !== 30
                                  ? formatCurrency(earning.delivery_fee)
                                  : <span className="text-gray-400">N/A</span>
                                }
                                {earning.delivery_fee && earning.delivery_fee > 0 && earning.delivery_fee !== 10 && earning.delivery_fee !== 30 && (
                                  <span className="text-xs block text-gray-400">Platform</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-red-500">
                                -{formatCurrency(earning.platform_commission)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-green-600">
                                {formatCurrency(earning.net_amount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  earning.is_paid 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {earning.is_paid ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredRestaurantEarnings.length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                {(restaurantStartDate || restaurantEndDate) ? 'No earnings found for the selected date range' : 'No earnings records found'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                      <div>
                        {(restaurantStartDate || restaurantEndDate) && (
                          <span>
                            Filtered: {filteredRestaurantEarnings.length} of {selectedRestaurantDetail.earnings.length} records
                          </span>
                        )}
                      </div>
                      <div>
                        {filteredRestaurantEarnings.length > 0 && (
                          <span>
                            Total: ₹{filteredRestaurantEarnings.reduce((sum: number, e: any) => sum + e.net_amount, 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Failed to load details
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => handleSyncToPortal(
                  selectedRestaurantDetail?.summary.restaurant_id,
                  selectedRestaurantDetail?.summary.restaurant_name
                )}
                disabled={syncingToPortal || !selectedRestaurantDetail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                title="Send earnings data to restaurant portal (bank details will NOT be synced)"
              >
                {syncingToPortal ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Sync to Portal
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bank Details Modal */}
      {showEditBankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Edit Bank Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={bankDetailsForm.bank_account_holder_name}
                  onChange={(e) => setBankDetailsForm({ ...bankDetailsForm, bank_account_holder_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Khao Gully Foods Pvt Ltd"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={bankDetailsForm.bank_account_number}
                  onChange={(e) => setBankDetailsForm({ ...bankDetailsForm, bank_account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={bankDetailsForm.bank_ifsc_code}
                  onChange={(e) => setBankDetailsForm({ ...bankDetailsForm, bank_ifsc_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. HDFC0001234"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPI ID
                </label>
                <input
                  type="text"
                  value={bankDetailsForm.upi_id}
                  onChange={(e) => setBankDetailsForm({ ...bankDetailsForm, upi_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. restaurant@upi"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditBankModal(false)}
                disabled={savingBankDetails}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBankDetails}
                disabled={savingBankDetails}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {savingBankDetails ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Edit Contact Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. +91-1234567890"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for syncing to restaurant portal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. restaurant@example.com"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditContactModal(false)}
                disabled={savingContact}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                disabled={savingContact || !contactForm.phone}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
              >
                {savingContact ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Process Restaurant Payout</h2>

            <div className="mb-4">
              <div className="text-sm text-gray-600">
                Processing payment for <span className="font-semibold">{selectedRestaurants.length}</span> restaurant(s)
              </div>
              <div className="text-lg font-bold text-orange-600 mt-1">
                Total: {formatCurrency(
                  restaurants
                    .filter(r => selectedRestaurants.includes(r.restaurant_id))
                    .reduce((sum, r) => sum + r.total_pending_earnings, 0)
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={payoutData.payment_method}
                  onChange={(e) => setPayoutData({ ...payoutData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Reference *
                </label>
                <input
                  type="text"
                  value={payoutData.payment_reference}
                  onChange={(e) => setPayoutData({ ...payoutData, payment_reference: e.target.value })}
                  placeholder="Transaction ID / Reference Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={payoutData.notes}
                  onChange={(e) => setPayoutData({ ...payoutData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPayoutModal(false)}
                disabled={processingPayout}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayout}
                disabled={processingPayout}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
              >
                {processingPayout ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Assignment Modal */}
      {showCommissionModal && selectedRestaurantForCommission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Assign Commission Rate
            </h2>

            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="font-semibold text-gray-800">
                {selectedRestaurantForCommission.restaurant_name}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Current Rate: {(selectedRestaurantForCommission.commission_rate * 100).toFixed(1)}%
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Commission Rate *
                </label>
                <div className="grid gap-2">
                  {commissionRates.map((rate) => (
                    <div
                      key={rate.id}
                      onClick={() => setSelectedCommissionRateId(rate.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedCommissionRateId === rate.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">{rate.rate_name}</div>
                          <div className="text-sm text-gray-600">{rate.description}</div>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          {rate.rate_percentage}%
                        </div>
                      </div>
                      {rate.is_default && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={commissionNotes}
                  onChange={(e) => setCommissionNotes(e.target.value)}
                  placeholder="Reason for assignment or any notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCommissionModal(false);
                  setSelectedRestaurantForCommission(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCommission}
                disabled={!selectedCommissionRateId}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 font-medium"
              >
                Assign Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantPaymentsPage;
