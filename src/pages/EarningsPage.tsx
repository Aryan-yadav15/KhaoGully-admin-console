import { useState, useEffect } from 'react';
import api from '../lib/api';
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
} from 'lucide-react';

interface DriverEarningSummary {
  driver_id: number;
  driver_name: string;
  driver_phone: string;
  driver_email: string | null;
  has_bank_details: boolean;
  bank_account_number: string | null;
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
}

export default function EarningsPage() {
  const [drivers, setDrivers] = useState<DriverEarningSummary[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverEarningSummary | null>(null);
  const [earningDetails, setEarningDetails] = useState<EarningDetail[]>([]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

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
    // Only select drivers with pending earnings AND bank details
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
      const response = await api.get(`/earnings/drivers/${driver.driver_id}?show_paid=false`);
      setEarningDetails(response.data.earnings);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch driver details:', error);
      setAlert({ type: 'error', message: 'Failed to load driver details' });
    }
  };

  const handleProcessPayout = async () => {
    if (selectedDrivers.length === 0) {
      setAlert({ type: 'error', message: 'Please select at least one driver' });
      return;
    }

    // Check for drivers without bank details
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
                  }`}
                >
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewDetails(driver)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
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

      {/* Detail Dialog */}
      {detailDialogOpen && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                Earnings Details - {selectedDriver.driver_name}
              </h2>
              <p className="text-sm text-slate-600">{selectedDriver.driver_phone}</p>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {/* Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Summary</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Pending</p>
                    <p className="text-xl font-bold text-slate-900">
                      ₹{selectedDriver.total_pending_earnings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Paid</p>
                    <p className="text-xl font-bold text-slate-900">
                      ₹{selectedDriver.total_paid_earnings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Pending Deliveries</p>
                    <p className="text-xl font-bold text-slate-900">{selectedDriver.pending_deliveries}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Distance</p>
                    <p className="text-xl font-bold text-slate-900">
                      {selectedDriver.total_distance_km?.toFixed(1) || '0'} km
                    </p>
                  </div>
                </div>
              </div>

              {/* Earnings List */}
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Pending Earnings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Order #</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Customer</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Base</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Distance</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Bonus</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Adjustment</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {earningDetails.map((earning) => (
                      <tr key={earning.id}>
                        <td className="px-3 py-2">
                          {new Date(earning.earned_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">#{earning.order_id}</td>
                        <td className="px-3 py-2">{earning.customer_name || 'N/A'}</td>
                        <td className="px-3 py-2 text-right">₹{earning.base_fare.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          ₹{earning.distance_fare.toFixed(2)}
                          {earning.distance_km && ` (${earning.distance_km.toFixed(1)}km)`}
                        </td>
                        <td className="px-3 py-2 text-right">
                          ₹
                          {(
                            earning.peak_hour_bonus +
                            earning.multi_order_bonus +
                            earning.incentive
                          ).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {earning.adjustment_amount !== 0 && (
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                earning.adjustment_amount > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              ₹{earning.adjustment_amount.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          ₹{(earning.total_earning + earning.adjustment_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setDetailDialogOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
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
