import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getBalance } from '../api/wallet';
import {
  getProducts,
  getExchangeRecords,
  redeemProduct,
  getProductStatusLabel,
  type Product,
  type ExchangeRecord,
  type RedeemResponse,
} from '../api/exchange';
import { ApiError } from '../api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShoppingBag, History, Gift, Copy, Check, AlertTriangle, Loader2, Coins, Package, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 12;

export function Exchange() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
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
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">兑换商城</h1>
           <p className="text-muted-foreground">使用积分兑换精美礼品</p>
        </div>
        {isAuthenticated && (
          <Card className="px-4 py-2 flex items-center gap-3 shadow-sm">
             <div className="p-2 bg-primary/10 rounded-full">
               <Coins className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-xs text-muted-foreground">当前积分</p>
               <p className="text-xl font-bold text-primary">{balance}</p>
             </div>
          </Card>
        )}
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="products" className="gap-2">
            <ShoppingBag className="w-4 h-4" /> 商品列表
          </TabsTrigger>
          {isAuthenticated && (
             <TabsTrigger value="records" className="gap-2">
               <History className="w-4 h-4" /> 兑换记录
             </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/10 border-dashed">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">暂无可兑换商品</h3>
              <p className="text-muted-foreground">请稍后再来看看吧</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                    <div className="aspect-video bg-muted relative overflow-hidden flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <Gift className="w-16 h-16 text-muted-foreground/30" />
                      )}
                      
                      <div className="absolute top-2 right-2">
                        {product.status === 'available' ? (
                           <Badge className="bg-green-600">可兑换</Badge>
                        ) : (
                           <Badge variant={product.status === 'sold_out' ? "destructive" : "secondary"}>
                             {getProductStatusLabel(product.status)}
                           </Badge>
                        )}
                      </div>
                    </div>
                    
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="line-clamp-1 text-lg">{product.name}</CardTitle>
                      <CardDescription className="line-clamp-2 h-10 text-xs mt-1">
                        {product.description || '暂无描述'}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-4 pt-2">
                      <div className="flex items-center justify-between">
                         <div>
                            <span className="text-lg font-bold text-primary">{product.price}</span>
                            <span className="text-xs text-muted-foreground ml-1">积分</span>
                         </div>
                         <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                           库存: {product.stock}
                         </span>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0">
                      <Button 
                        className="w-full" 
                        onClick={() => handleRedeemClick(product)}
                        disabled={product.status !== 'available' || product.stock <= 0}
                        variant={product.status === 'available' ? "default" : "secondary"}
                      >
                         {product.status === 'sold_out' ? '已兑完' : '立即兑换'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {productTotalPages > 1 && (
                <div className="flex justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchProducts(productPage - 1)}
                    disabled={productPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex items-center text-sm text-muted-foreground">
                    {productPage} / {productTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchProducts(productPage + 1)}
                    disabled={productPage >= productTotalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>


        {isAuthenticated && (
          <TabsContent value="records">
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/10 border-dashed">
                <History className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">暂无兑换记录</h3>
              </div>
            ) : (
              <Card>
                <div className="divide-y">
                  {records.map((record) => (
                    <div key={record.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="font-semibold">{record.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(record.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 border">
                          <span className="text-xs text-muted-foreground">卡密:</span>
                          <code className="text-sm font-mono select-all">{record.card_key}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => copyToClipboard(record.card_key)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="text-right font-medium text-orange-500 whitespace-nowrap">
                          -{record.cost} 积分
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                 {/* Pagination */}
                {recordTotalPages > 1 && (
                  <div className="flex justify-center gap-4 p-4 border-t">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fetchRecords(recordPage - 1)}
                      disabled={recordPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      {recordPage} / {recordTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fetchRecords(recordPage + 1)}
                      disabled={recordPage >= recordTotalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Confirm Modal */}
      {showConfirmModal && selectedProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle>确认兑换</CardTitle>
              <CardDescription>
                您确定要消耗积分兑换此商品吗？
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="bg-muted p-4 rounded-lg flex gap-4">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} className="w-16 h-16 rounded object-cover bg-background" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-background flex items-center justify-center">
                      <Gift className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold">{selectedProduct.name}</h4>
                    <p className="text-primary font-bold mt-1">{selectedProduct.price} <span className="text-xs font-normal text-muted-foreground">积分</span></p>
                  </div>
               </div>

               {balance < selectedProduct.price && (
                 <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded">
                    <AlertTriangle className="w-4 h-4" />
                    积分不足，当前余额：{balance}
                 </div>
               )}
               
               {redeemError && (
                 <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded">
                    <AlertTriangle className="w-4 h-4" />
                    {redeemError}
                 </div>
               )}
            </CardContent>
            <CardFooter className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={redeeming}>取消</Button>
              <Button onClick={handleConfirmRedeem} disabled={redeeming || balance < selectedProduct.price}>
                {redeeming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                确认兑换
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}


      {/* Result Modal */}
      {showResultModal && redeemResult && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 border-primary/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400">兑换成功！</CardTitle>
              <CardDescription>
                您已成功兑换 {redeemResult.product_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">您的卡密：</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-lg text-center border-2 border-dashed border-primary/20 select-all">
                    {redeemResult.card_key}
                  </code>
                  <Button onClick={() => copyToClipboard(redeemResult.card_key)} size="icon">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  请妥善保管您的卡密，可在兑换记录中再次查看
                </p>
              </div>
              
              <div className="flex justify-between text-sm pt-4 border-t">
                <span className="text-muted-foreground">本次消耗</span>
                <span className="font-medium">{redeemResult.cost} 积分</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">剩余积分</span>
                <span className="font-medium">{redeemResult.balance} 积分</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => {
                  setShowResultModal(false);
                  setRedeemResult(null);
                  setSelectedProduct(null);
                }}
              >
                完成
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}