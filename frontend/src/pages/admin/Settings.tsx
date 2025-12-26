import { useState, useEffect, useCallback } from 'react';
import {
  getSystemSettings,
  updateSystemSettings,
  type UpdateSettingsRequest,
} from '../../api/admin';

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [epayMerchantId, setEpayMerchantId] = useState('');
  const [epaySecret, setEpaySecret] = useState('');
  const [epayCallbackUrl, setEpayCallbackUrl] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSystemSettings();
      setPaymentEnabled(data.payment_enabled);
      setEpayMerchantId(data.epay_merchant_id || '');
      setEpaySecret(data.epay_secret || '');
      setEpayCallbackUrl(data.epay_callback_url || '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const req: UpdateSettingsRequest = {
        payment_enabled: paymentEnabled,
        epay_merchant_id: epayMerchantId,
        epay_callback_url: epayCallbackUrl,
      };
      
      // Only send secret if it's changed (doesn't contain mask)
      if (epaySecret && !epaySecret.includes('*')) {
        req.epay_secret = epaySecret;
      }
      
      await updateSystemSettings(req);
      setSuccess('设置已保存');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg">{success}</div>
      )}

      {/* Payment Settings */}
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">💳 支付设置</h2>
        
        <div className="space-y-4">
          {/* Payment Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">支付功能</p>
              <p className="text-sm text-muted-foreground">
                开启后用户可以通过易支付充值积分
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paymentEnabled}
                onChange={(e) => setPaymentEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* EPay Settings */}
          <div className={`space-y-4 ${!paymentEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium mb-1">商户ID</label>
              <input
                type="text"
                value={epayMerchantId}
                onChange={(e) => setEpayMerchantId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="易支付商户ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">商户密钥</label>
              <input
                type="password"
                value={epaySecret}
                onChange={(e) => setEpaySecret(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="易支付商户密钥"
              />
              <p className="text-xs text-muted-foreground mt-1">
                留空则保持原密钥不变
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">回调地址</label>
              <input
                type="text"
                value={epayCallbackUrl}
                onChange={(e) => setEpayCallbackUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://your-domain.com/api/wallet/recharge/callback"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-800 mb-2">💡 配置说明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 支付功能默认关闭，开启前请确保已正确配置易支付参数</li>
          <li>• 商户ID和密钥可在易支付商户后台获取</li>
          <li>• 回调地址需要配置为您的服务器可访问的公网地址</li>
          <li>• 修改密钥时，留空表示保持原密钥不变</li>
        </ul>
      </div>
    </div>
  );
}
