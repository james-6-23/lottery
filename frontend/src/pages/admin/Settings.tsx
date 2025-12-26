import { useState, useEffect, useCallback } from 'react';
import {
  getSystemSettings,
  updateSystemSettings,
  type UpdateSettingsRequest,
} from '../../api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, CreditCard, Info, Check, AlertTriangle } from 'lucide-react';

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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> 支付设置
          </CardTitle>
          <CardDescription>
            配置易支付接口，开启积分充值功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-0.5">
              <label className="text-base font-medium">支付功能</label>
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
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* EPay Settings */}
          <div className={`space-y-4 transition-opacity duration-200 ${!paymentEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="space-y-2">
              <label className="text-sm font-medium">商户ID</label>
              <Input
                value={epayMerchantId}
                onChange={(e) => setEpayMerchantId(e.target.value)}
                placeholder="易支付商户ID"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">商户密钥</label>
              <Input
                type="password"
                value={epaySecret}
                onChange={(e) => setEpaySecret(e.target.value)}
                placeholder="易支付商户密钥"
              />
              <p className="text-xs text-muted-foreground">
                留空则保持原密钥不变
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">回调地址</label>
              <Input
                value={epayCallbackUrl}
                onChange={(e) => setEpayCallbackUrl(e.target.value)}
                placeholder="https://your-domain.com/api/wallet/recharge/callback"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> 保存设置
            </>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/20">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" /> 配置说明
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc pl-5">
            <li>支付功能默认关闭，开启前请确保已正确配置易支付参数</li>
            <li>商户ID和密钥可在易支付商户后台获取</li>
            <li>回调地址需要配置为您的服务器可访问的公网地址</li>
            <li>修改密钥时，留空表示保持原密钥不变</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
