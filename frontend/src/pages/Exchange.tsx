import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getBalance } from '../api/wallet';
import {
  getProducts,
  getExchangeRecords,
  redeemProduct,
  getProductStatusLabel,
  getProductStatusColor,
  type Product,
  type ExchangeRecord,
  type RedeemResponse,
} from '../api/exchange';
import { ApiError } from '../api/client';

const PAGE_SIZE = 12;

type TabType = 'products' | 'records';

export function Exchange() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [balance, setBalance] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [records, setRecords] = useState<ExchangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const [recordTotalPages, setRecordTotalPages] = useState(1);
  
  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResponse | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getBalance();
      setBalance(data.balance);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [isAuthenticated]);

  // Fetch products
  const fetchProducts = useCallback(async (page: number) => {
    try {
      const data = await getProducts({ page, limit: PAGE_SIZE });
      setProducts(data.products);
      setProductTotalPages(data.total_pages);
      setProductPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品列表失败');
    }
  }, []);

  // Fetch exchange records
  const fetchRecords = useCallback(async (page: number) => {
    if (!isAuthenticated) return;
    try {
      const data = await getExchangeRecords({ page, limit: PAGE_SIZE });
      setRecords(data.records);
      setRecordTotalPages(data.total_pages);
      setRecordPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取兑换记录失败');
    }
  }, [isAuthenticated]);


  // Initial load
  useEffect(() => {
    if (authLoading) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      await fetchProducts(1);
      if (isAuthenticated) {
        await Promise.all([fetchBalance(), fetchRecords(1)]);
      }
      setLoading(false);
    };

    loadData();
  }, [isAuthenticated, authLoading, fetchProducts, fetchBalance, fetchRecords]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'records' && isAuthenticated) {
      fetchRecords(1);
    }
  };

  // Handle redeem click
  const handleRedeemClick = (product: Product) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSelectedProduct(product);
    setRedeemError(null);
    setShowConfirmModal(true);
  };

  // Handle confirm redeem
  const handleConfirmRedeem = async () => {
    if (!selectedProduct) return;
    
    setRedeeming(true);
    setRedeemError(null);
    
    try {
      const result = await redeemProduct(selectedProduct.id);
      setRedeemResult(result);
      setBalance(result.balance);
      setShowConfirmModal(false);
      setShowResultModal(true);
      // Refresh products and records
      fetchProducts(productPage);
      fetchRecords(1);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 4002) {
          setRedeemError('商品已兑完');
        } else if (err.code === 4003) {
          setRedeemError('积分不足');
        } else {
          setRedeemError(err.message);
        }
      } else {
        setRedeemError(err instanceof Error ? err.message : '兑换失败');
      }
    } finally {
      setRedeeming(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          重试
        </button>
      </div>
    );
  }


  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">兑换商城</h1>
        {isAuthenticated && (
          <div className="bg-primary/10 px-4 py-2 rounded-lg">
            <span className="text-sm text-muted-foreground">当前积分：</span>
            <span className="text-lg font-bold text-primary ml-1">{balance}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => handleTabChange('products')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'products'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          商品列表
        </button>
        {isAuthenticated && (
          <button
            onClick={() => handleTabChange('records')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'records'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            兑换记录
          </button>
        )}
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无可兑换商品
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Product Image */}
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-6xl">🎁</span>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <span className={`text-sm ${getProductStatusColor(product.status)}`}>
                          {getProductStatusLabel(product.status)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {product.description || '暂无描述'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-primary">{product.price}</span>
                          <span className="text-sm text-muted-foreground ml-1">积分</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          库存: {product.stock}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRedeemClick(product)}
                        disabled={product.status !== 'available' || product.stock <= 0}
                        className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                      >
                        {product.status === 'sold_out' ? '已兑完' : '立即兑换'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {productTotalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => fetchProducts(productPage - 1)}
                    disabled={productPage <= 1}
                    className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="px-4 py-2 text-muted-foreground">
                    {productPage} / {productTotalPages}
                  </span>
                  <button
                    onClick={() => fetchProducts(productPage + 1)}
                    disabled={productPage >= productTotalPages}
                    className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}


      {/* Records Tab */}
      {activeTab === 'records' && isAuthenticated && (
        <>
          {records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无兑换记录
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="divide-y">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{record.product_name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(record.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">卡密：</span>
                          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                            {record.card_key}
                          </code>
                          <button
                            onClick={() => copyToClipboard(record.card_key)}
                            className="text-primary hover:text-primary/80 text-sm"
                          >
                            复制
                          </button>
                        </div>
                        <span className="text-orange-500 font-medium">
                          -{record.cost} 积分
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {recordTotalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => fetchRecords(recordPage - 1)}
                    disabled={recordPage <= 1}
                    className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="px-4 py-2 text-muted-foreground">
                    {recordPage} / {recordTotalPages}
                  </span>
                  <button
                    onClick={() => fetchRecords(recordPage + 1)}
                    disabled={recordPage >= recordTotalPages}
                    className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">确认兑换</h2>
            
            <div className="mb-6">
              <p className="text-muted-foreground mb-4">
                确定要兑换以下商品吗？
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-semibold mb-2">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedProduct.description}
                </p>
                <p className="text-lg">
                  需要 <span className="font-bold text-primary">{selectedProduct.price}</span> 积分
                </p>
              </div>
              
              {balance < selectedProduct.price && (
                <p className="text-red-500 text-sm mt-2">
                  积分不足，当前余额：{balance} 积分
                </p>
              )}
              
              {redeemError && (
                <p className="text-red-500 text-sm mt-2">{redeemError}</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
                disabled={redeeming}
              >
                取消
              </button>
              <button
                onClick={handleConfirmRedeem}
                disabled={redeeming || balance < selectedProduct.price}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {redeeming ? '兑换中...' : '确认兑换'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Result Modal */}
      {showResultModal && redeemResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-xl font-bold mb-2">兑换成功！</h2>
              <p className="text-muted-foreground">
                您已成功兑换 {redeemResult.product_name}
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">您的卡密：</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-background rounded font-mono text-lg break-all">
                  {redeemResult.card_key}
                </code>
                <button
                  onClick={() => copyToClipboard(redeemResult.card_key)}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  复制
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                请妥善保管您的卡密，可在兑换记录中再次查看
              </p>
            </div>
            
            <div className="text-center text-sm text-muted-foreground mb-4">
              消耗 {redeemResult.cost} 积分，剩余 {redeemResult.balance} 积分
            </div>
            
            <button
              onClick={() => {
                setShowResultModal(false);
                setRedeemResult(null);
                setSelectedProduct(null);
              }}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
