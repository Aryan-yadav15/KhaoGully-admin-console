import { useState, useEffect } from 'react';
import api from '../lib/api';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Eye,
  CheckCircle,
  AlertCircle,
  X,
  Check,
  CalendarDays,
} from 'lucide-react';

interface DriverEarningSummary {
  driver_id: number;
  driver_name: string;
  driver_phone: string;
  driver_email: string | null;
  has_bank_details: boolean;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  bank_account_holder_name: string | null;
  upi_id: string | null;
  total_pending_earnings: number;
  total_paid_earnings: number;
  current_cycle_earnings: number;
  lifetime_earnings: number;
  total_deliveries: number;
  pending_deliveries: number;
  paid_deliveries: number;
  avg_earnings_per_delivery: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  last_payout_cycle: string | null;
  total_distance_km: number | null;
  driver_rating: number;
}

interface PaymentStats {
  total_pending_amount: number;
  total_paid_this_month: number;
  total_drivers_pending: number;
  current_cycle_name: string;
  current_cycle_end_date: string;
  next_payout_date: string;
}

interface EarningDetail {
  id: number;
  order_id: number | null;
  customer_name: string | null;
  delivery_address: string | null;
  base_fare: number;
  distance_fare: number;
  peak_hour_bonus: number;
  multi_order_bonus: number;
  incentive: number;
  adjustment_amount: number;
  total_earning: number;
  distance_km: number | null;
  earned_at: string;
  is_paid: boolean;
}

export default function EarningsPageEnhanced() {
  const [drivers, setDrivers] = useState<DriverEarningSummary[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverEarningSummary | null>(null);
  const [earningDetails, setEarningDetails] = useState<EarningDetail[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Bank Details Editing State
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_account_holder_name: '',
    upi_id: ''
  });
  const [savingBank, setSavingBank] = useState(false);
  
  // Date Filter State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filteredEarningDetails, setFilteredEarningDetails] = useState<EarningDetail[]>([]);

  useEffect(() => {
    fetchData();
  }, []);
  
  useEffect(() => {
    // Filter earnings based on date range
    if (!startDate && !endDate) {
      setFilteredEarningDetails(earningDetails);
      return;
    }
    
    const filtered = earningDetails.filter((earning) => {
      const earningDate = parseISO(earning.earned_at);
      
      if (startDate && endDate) {
        return isWithinInterval(earningDate, {
          start: startOfDay(new Date(startDate)),
          end: endOfDay(new Date(endDate))
        });
      } else if (startDate) {
        return earningDate >= startOfDay(new Date(startDate));
      } else if (endDate) {
        return earningDate <= endOfDay(new Date(endDate));
      }
      return true;
    });
    
    setFilteredEarningDetails(filtered);
  }, [startDate, endDate, earningDetails]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [driversRes, statsRes] = await Promise.all([
        api.get('/earnings/drivers?status=all'),
        api.get('/earnings/stats'),
      ]);

      setDrivers(driversRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
      setAlert({ type: 'error', message: 'Failed to load earnings data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDriver = (driverId: number) => {
    setSelectedDrivers((prev) =>
      prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId]
    );
  };

  const handleSelectAll = () => {
    const driversWithPending = drivers.filter(
      (d) => d.total_pending_earnings > 0 && d.has_bank_details
    );
    if (selectedDrivers.length === driversWithPending.length) {
      setSelectedDrivers([]);
    } else {
      setSelectedDrivers(driversWithPending.map((d) => d.driver_id));
    }
  };

  const handleViewDetails = async (driver: DriverEarningSummary) => {
    try {
      setSelectedDriver(driver);
      setDetailDialogOpen(true);
      setLoadingDetail(true);
      const response = await api.get(`/earnings/drivers/${driver.driver_id}?show_paid=true`);
      setEarningDetails(response.data.earnings);
    } catch (error) {
      console.error('Failed to fetch driver details:', error);
      setAlert({ type: 'error', message: 'Failed to load driver details' });
      setDetailDialogOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleProcessPayout = async () => {
    if (selectedDrivers.length === 0) {
      setAlert({ type: 'error', message: 'Please select at least one driver' });
      return;
    }

    const driversWithoutBank = drivers.filter(
      (d) => selectedDrivers.includes(d.driver_id) && !d.has_bank_details
    );
    
    if (driversWithoutBank.length > 0) {
      const driverNames = driversWithoutBank.map((d) => d.driver_name).join(', ');
      setAlert({
        type: 'error',
        message: `Cannot process payout: The following drivers are missing bank details: ${driverNames}. Please update their profiles first.`,
      });
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post('/earnings/process-payout', {
        driver_ids: selectedDrivers,
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        notes: notes || undefined,
      });

      setAlert({
        type: 'success',
        message: `Successfully paid ${response.data.total_drivers_paid} drivers. Total: ₹${response.data.total_amount_paid}`,
      });
      setPayoutDialogOpen(false);
      setSelectedDrivers([]);
      setPaymentReference('');
      setNotes('');
      fetchData();
    } catch (error: any) {
      console.error('Failed to process payout:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to process payout',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEditBank = () => {
    if (!selectedDriver) return;
    setBankForm({
      bank_account_number: selectedDriver.bank_account_number || '',
      bank_ifsc_code: selectedDriver.bank_ifsc_code || '',
      bank_account_holder_name: selectedDriver.bank_account_holder_name || '',
      upi_id: selectedDriver.upi_id || ''
    });
    setIsEditingBank(true);
  };

  const handleCancelBank = () => {
    setIsEditingBank(false);
    setBankForm({
      bank_account_number: '',
      bank_ifsc_code: '',
      bank_account_holder_name: '',
      upi_id: ''
    });
  };

  const handleSaveBank = async () => {
    if (!selectedDriver) return;
    
    try {
      setSavingBank(true);
      // Call the new admin endpoint
      const response = await api.patch(`/drivers/${selectedDriver.driver_id}`, {
        bank_account_number: bankForm.bank_account_number,
        bank_ifsc_code: bankForm.bank_ifsc_code,
        bank_account_holder_name: bankForm.bank_account_holder_name,
        upi_id: bankForm.upi_id
      });

      // Update local state
      const updatedDriver = {
        ...selectedDriver,
        bank_account_number: response.data.bank_account_number,
        bank_ifsc_code: response.data.bank_ifsc_code,
        bank_account_holder_name: response.data.bank_account_holder_name,
        upi_id: response.data.upi_id,
        has_bank_details: !!(response.data.bank_account_number || response.data.upi_id)
      };

      setSelectedDriver(updatedDriver);
      
      // Update in the main list as well
      setDrivers(prev => prev.map(d => 
        d.driver_id === updatedDriver.driver_id ? updatedDriver : d
      ));

      setAlert({ type: 'success', message: 'Bank details updated successfully' });
      setIsEditingBank(false);
    } catch (error: any) {
      console.error('Failed to update bank details:', error);
      setAlert({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Failed to update bank details' 
      });
    } finally {
      setSavingBank(false);
    }
  };

  const totalSelectedAmount = drivers
    .filter((d) => selectedDrivers.includes(d.driver_id))
    .reduce((sum, d) => sum + d.total_pending_earnings, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Driver Earnings & Payments</h1>
      </div>

      {/* Alert */}
      {alert && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between ${
            alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-current">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Pending</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{stats.total_pending_amount.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Paid This Month</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{stats.total_paid_this_month.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Drivers Pending</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_drivers_pending}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Current Cycle</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">{stats.current_cycle_name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Ends: {new Date(stats.current_cycle_end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPayoutDialogOpen(true)}
          disabled={selectedDrivers.length === 0}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
        >
          <DollarSign className="w-5 h-5" />
          Pay Selected ({selectedDrivers.length}) - ₹{totalSelectedAmount.toFixed(2)}
        </button>
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
        >
          {selectedDrivers.length === drivers.filter((d) => d.total_pending_earnings > 0 && d.has_bank_details).length
            ? 'Deselect All'
            : 'Select All Ready'}
        </button>
        <div className="text-sm text-slate-600">
          {drivers.filter((d) => d.total_pending_earnings > 0 && !d.has_bank_details).length > 0 && (
            <span className="text-red-600">
              ⚠ {drivers.filter((d) => d.total_pending_earnings > 0 && !d.has_bank_details).length} driver(s) missing bank details
            </span>
          )}
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedDrivers.length > 0 &&
                      selectedDrivers.length === drivers.filter((d) => d.total_pending_earnings > 0).length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Driver</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Phone</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Pending</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Paid (Total)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">This Cycle</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Deliveries</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Avg/Delivery</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Last Paid</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Bank Details</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {drivers.map((driver) => (
                <tr
                  key={driver.driver_id}
                  className={`${
                    driver.total_pending_earnings > 0
                      ? driver.has_bank_details
                        ? 'bg-orange-50'
                        : 'bg-red-50'
                      : ''
                  } cursor-pointer hover:bg-slate-100`}
                  onClick={() => handleViewDetails(driver)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedDrivers.includes(driver.driver_id)}
                      onChange={() => handleSelectDriver(driver.driver_id)}
                      disabled={driver.total_pending_earnings <= 0 || !driver.has_bank_details}
                      className="rounded border-slate-300"
                      title={
                        !driver.has_bank_details && driver.total_pending_earnings > 0
                          ? 'Bank details required'
                          : ''
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{driver.driver_name}</p>
                      <p className="text-sm text-slate-500">Rating: {driver.driver_rating.toFixed(1)} ⭐</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{driver.driver_phone}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-sm font-medium ${
                        driver.total_pending_earnings > 0
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      ₹{driver.total_pending_earnings.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    ₹{driver.total_paid_earnings.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    ₹{driver.current_cycle_earnings.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {driver.pending_deliveries} / {driver.total_deliveries}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    ₹{driver.avg_earnings_per_delivery.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {driver.last_payment_date ? (
                      <div>
                        <p className="text-sm text-slate-700">
                          {new Date(driver.last_payment_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">₹{driver.last_payment_amount?.toFixed(2)}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Never paid</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {driver.has_bank_details ? (
                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        ⚠ Missing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleViewDetails(driver)}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5 text-slate-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Dialog */}
      {payoutDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">Process Payout</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-slate-600">
                  <strong>Selected Drivers:</strong> {selectedDrivers.length}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Total Amount:</strong> ₹{totalSelectedAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="razorpay">Razorpay</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., TXN123456789"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this payout..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setPayoutDialogOpen(false)}
                disabled={processing}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayout}
                disabled={processing}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Detail Dialog */}
      {detailDialogOpen && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedDriver.driver_name}
                </h2>
                <div className="text-sm text-slate-600 mt-1 flex gap-4">
                  <span>ID: {selectedDriver.driver_id}</span>
                  <span>•</span>
                  <span>{selectedDriver.driver_phone}</span>
                  {selectedDriver.driver_email && (
                    <>
                      <span>•</span>
                      <span>{selectedDriver.driver_email}</span>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setDetailDialogOpen(false)}
                className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                      <div className="text-sm text-orange-600 font-medium mb-1">Pending Payment</div>
                      <div className="text-2xl font-bold text-orange-700">
                        ₹{selectedDriver.total_pending_earnings.toFixed(2)}
                      </div>
                      <div className="text-xs text-orange-500 mt-1">
                        {selectedDriver.pending_deliveries} unpaid deliveries
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <div className="text-sm text-green-600 font-medium mb-1">Total Paid</div>
                      <div className="text-2xl font-bold text-green-700">
                        ₹{selectedDriver.total_paid_earnings.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-500 mt-1">
                        Lifetime earnings paid out
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div className="text-sm text-blue-600 font-medium mb-1">Total Distance</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {selectedDriver.total_distance_km?.toFixed(1) || '0'} km
                      </div>
                      <div className="text-xs text-blue-500 mt-1">
                        Total distance covered
                      </div>
                    </div>
                  </div>

                  {/* Detailed Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Performance Stats */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700">
                        Performance Statistics
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600">Total Deliveries</span>
                          <span className="font-medium">{selectedDriver.total_deliveries}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600">Completed Deliveries</span>
                          <span className="font-medium">{selectedDriver.paid_deliveries}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600">Pending Deliveries</span>
                          <span className="font-medium text-orange-600">{selectedDriver.pending_deliveries}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600">Avg. Earnings / Delivery</span>
                          <span className="font-medium">₹{selectedDriver.avg_earnings_per_delivery.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600">Driver Rating</span>
                          <span className="font-medium flex items-center gap-1">
                            {selectedDriver.driver_rating.toFixed(1)} ⭐
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600">Current Cycle Earnings</span>
                          <span className="font-medium">₹{selectedDriver.current_cycle_earnings.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Bank & Payment Info */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center">
                        <span>Payment Information</span>
                        {!isEditingBank && (
                          <button
                            onClick={handleEditBank}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <div className="p-4 space-y-4">
                        {isEditingBank ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Bank Account Number</label>
                              <input
                                type="text"
                                value={bankForm.bank_account_number}
                                onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Enter account number"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">IFSC Code</label>
                              <input
                                type="text"
                                value={bankForm.bank_ifsc_code}
                                onChange={(e) => setBankForm({ ...bankForm, bank_ifsc_code: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Enter IFSC code"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Account Holder Name</label>
                              <input
                                type="text"
                                value={bankForm.bank_account_holder_name}
                                onChange={(e) => setBankForm({ ...bankForm, bank_account_holder_name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Enter account holder name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">UPI ID</label>
                              <input
                                type="text"
                                value={bankForm.upi_id}
                                onChange={(e) => setBankForm({ ...bankForm, upi_id: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Enter UPI ID"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={handleSaveBank}
                                disabled={savingBank}
                                className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                              >
                                {savingBank ? 'Saving...' : 'Save Details'}
                              </button>
                              <button
                                onClick={handleCancelBank}
                                disabled={savingBank}
                                className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                              <span className="text-slate-600">Bank Account</span>
                              <span className="font-medium">
                                {selectedDriver.bank_account_number 
                                  ? `•••${selectedDriver.bank_account_number.slice(-4)}` 
                                  : 'Not provided'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                              <span className="text-slate-600">UPI ID</span>
                              <span className="font-medium">
                                {selectedDriver.upi_id || 'Not provided'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                              <span className="text-slate-600">Bank Details Status</span>
                              {selectedDriver.has_bank_details ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  ✓ Verified
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                  ⚠ Missing
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                              <span className="text-slate-600">Last Payment Date</span>
                              <span className="font-medium">
                                {selectedDriver.last_payment_date 
                                  ? new Date(selectedDriver.last_payment_date).toLocaleDateString('en-IN', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })
                                  : 'Never paid'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                              <span className="text-slate-600">Last Payment Amount</span>
                              <span className="font-medium">
                                {selectedDriver.last_payment_amount 
                                  ? `₹${selectedDriver.last_payment_amount.toFixed(2)}` 
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                              <span className="text-slate-600">Last Payout Cycle</span>
                              <span className="font-medium text-sm">
                                {selectedDriver.last_payout_cycle || 'N/A'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Earnings History Table */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Earnings History</h3>
                      
                      {/* Date Filter */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-slate-600" />
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Start Date"
                          />
                          <span className="text-slate-500">to</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="End Date"
                          />
                          {(startDate || endDate) && (
                            <button
                              onClick={() => {
                                setStartDate('');
                                setEndDate('');
                              }}
                              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Clear filter"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Order ID</th>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Delivery Address</th>
                            <th className="px-4 py-3 text-right">Base Fare</th>
                            <th className="px-4 py-3 text-right">Distance</th>
                            <th className="px-4 py-3 text-right">Bonuses</th>
                            <th className="px-4 py-3 text-right">Adjustment</th>
                            <th className="px-4 py-3 text-right">Total Earning</th>
                            <th className="px-4 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredEarningDetails.map((earning) => (
                            <tr key={earning.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-600">
                                {new Date(earning.earned_at).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                #{earning.order_id}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {earning.customer_name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate" title={earning.delivery_address || 'N/A'}>
                                {earning.delivery_address || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                ₹{earning.base_fare.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {earning.distance_km ? (
                                  <div>
                                    <div>₹{earning.distance_fare.toFixed(2)}</div>
                                    <div className="text-xs text-slate-400">{earning.distance_km.toFixed(1)} km</div>
                                  </div>
                                ) : (
                                  <span>₹{earning.distance_fare.toFixed(2)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {(earning.peak_hour_bonus + earning.multi_order_bonus + earning.incentive) > 0 ? (
                                  <span className="text-green-600">₹{(
                                    earning.peak_hour_bonus +
                                    earning.multi_order_bonus +
                                    earning.incentive
                                  ).toFixed(2)}</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {earning.adjustment_amount !== 0 ? (
                                  <span
                                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                      earning.adjustment_amount > 0
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {earning.adjustment_amount > 0 ? '+' : ''}₹{earning.adjustment_amount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-green-600">
                                ₹{(earning.total_earning + earning.adjustment_amount).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    earning.is_paid
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}
                                >
                                  {earning.is_paid ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredEarningDetails.length === 0 && (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                {(startDate || endDate) ? 'No earnings found for the selected date range' : 'No earnings records found'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm text-slate-500">
                      <div>
                        {(startDate || endDate) && (
                          <span>
                            Filtered: {filteredEarningDetails.length} of {earningDetails.length} records
                          </span>
                        )}
                      </div>
                      <div>
                        {filteredEarningDetails.length > 0 && (
                          <span>
                            Total: ₹{filteredEarningDetails.reduce((sum, e) => sum + e.total_earning + e.adjustment_amount, 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetailDialogOpen(false)}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
