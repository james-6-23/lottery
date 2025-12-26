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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div className="space-y-2">
           <h1 className="text-4xl font-extrabold tracking-tight">兑换商城</h1>
           <p className="text-muted-foreground text-lg">使用积分兑换精美礼品</p>
        </div>
        {isAuthenticated && (
          <Card className="px-5 py-3 flex items-center gap-4 shadow-sm border-primary/20 bg-primary/5 backdrop-blur-sm">
             <div className="p-2 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/20">
               <Coins className="w-5 h-5" />
             </div>
             <div>
               <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">当前积分</p>
               <p className="text-2xl font-bold text-primary tabular-nums">{balance}</p>
             </div>
          </Card>
        )}
      </div>

      <Tabs defaultValue="products" className="w-full space-y-8">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-11 bg-muted/50 p-1">
          <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShoppingBag className="w-4 h-4" /> 商品列表
          </TabsTrigger>
          {isAuthenticated && (
             <TabsTrigger value="records" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
               <History className="w-4 h-4" /> 兑换记录
             </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="products" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-3xl bg-muted/10">
              <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">暂无可兑换商品</h3>
              <p className="text-muted-foreground">请稍后再来看看吧</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="glass-card overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full border-border/40">
                    <div className="aspect-[4/3] bg-gradient-to-b from-muted/30 to-muted/10 relative overflow-hidden flex items-center justify-center p-6">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-xl"
                        />
                      ) : (
                        <Gift className="w-20 h-20 text-muted-foreground/20" />
                      )}
                      
                      <div className="absolute top-3 right-3">
                        {product.status === 'available' ? (
                           <Badge className="bg-emerald-500/90 hover:bg-emerald-600 border-0 backdrop-blur-md shadow-sm">可兑换</Badge>
                        ) : (
                           <Badge variant={product.status === 'sold_out' ? "destructive" : "secondary"}>
                             {getProductStatusLabel(product.status)}
                           </Badge>
                        )}
                      </div>
                    </div>
                    
                    <CardHeader className="p-5 pb-2">
                      <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">{product.name}</CardTitle>
                      <CardDescription className="line-clamp-2 h-10 text-sm mt-1 leading-relaxed">
                        {product.description || '暂无描述'}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-5 pt-2 flex-1 flex items-end">
                      <div className="flex items-center justify-between w-full">
                         <div>
                            <span className="text-2xl font-bold text-foreground">{product.price}</span>
                            <span className="text-xs text-muted-foreground font-medium ml-1 uppercase">Points</span>
                         </div>
                         <span className="text-xs text-muted-foreground bg-secondary/50 border border-border/50 px-2.5 py-1 rounded-full">
                           库存: {product.stock}
                         </span>
                      </div>
                    </CardContent>

                    <CardFooter className="p-5 pt-0">
                      <Button 
                        className="w-full h-10 font-medium shadow-sm transition-all duration-300" 
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
                <div className="flex justify-center gap-4 mt-12">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-10 h-10 border border-border/40"
                    onClick={() => fetchProducts(productPage - 1)}
                    disabled={productPage <= 1}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="flex items-center text-sm font-mono text-muted-foreground px-4 bg-muted/30 rounded-full">
                    {productPage} / {productTotalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-10 h-10 border border-border/40"
                    onClick={() => fetchProducts(productPage + 1)}
                    disabled={productPage >= productTotalPages}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>


        {isAuthenticated && (
          <TabsContent value="records" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-3xl bg-muted/10">
                <History className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">暂无兑换记录</h3>
              </div>
            ) : (
              <Card className="glass-card border-border/40 overflow-hidden">
                <div className="divide-y divide-border/40">
                  {records.map((record) => (
                    <div key={record.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors group">
                      <div className="space-y-1.5">
                        <div className="font-semibold text-lg">{record.product_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <History className="w-3.5 h-3.5" />
                          {formatDate(record.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-4 py-2 border border-border/40 group-hover:border-primary/20 transition-colors">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key</span>
                          <code className="text-sm font-mono select-all text-foreground">{record.card_key}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 hover:bg-background/80" onClick={() => copyToClipboard(record.card_key)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="text-right font-bold text-orange-500 whitespace-nowrap tabular-nums">
                          -{record.cost} 积分
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                 {/* Pagination */}
                {recordTotalPages > 1 && (
                  <div className="flex justify-center gap-4 p-6 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => fetchRecords(recordPage - 1)}
                      disabled={recordPage <= 1}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="flex items-center text-sm font-mono text-muted-foreground">
                      {recordPage} / {recordTotalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => fetchRecords(recordPage + 1)}
                      disabled={recordPage >= recordTotalPages}
                    >
                      <ChevronRight className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl border-primary/10">
            <CardHeader>
              <CardTitle>确认兑换</CardTitle>
              <CardDescription>
                您确定要消耗积分兑换此商品吗？
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="bg-muted/50 p-4 rounded-xl flex gap-4 border border-border/50">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} className="w-16 h-16 rounded-lg object-contain bg-background p-1 border" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center border">
                      <Gift className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-lg">{selectedProduct.name}</h4>
                    <p className="text-primary font-bold mt-1 flex items-center gap-1">
                      {selectedProduct.price} <span className="text-xs font-normal text-muted-foreground">积分</span>
                    </p>
                  </div>
               </div>

               {balance < selectedProduct.price && (
                 <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                    <AlertTriangle className="w-4 h-4" />
                    积分不足，当前余额：{balance}
                 </div>
               )}
               
               {redeemError && (
                 <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                    <AlertTriangle className="w-4 h-4" />
                    {redeemError}
                 </div>
               )}
            </CardContent>
            <CardFooter className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={redeeming} className="flex-1">取消</Button>
              <Button onClick={handleConfirmRedeem} disabled={redeeming || balance < selectedProduct.price} className="flex-1">
                {redeeming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                确认兑换
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}


      {/* Result Modal */}
      {showResultModal && redeemResult && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl border-primary/20 bg-card/95">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4 ring-8 ring-green-50 dark:ring-green-500/5">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400">兑换成功！</CardTitle>
              <CardDescription>
                您已成功兑换 {redeemResult.product_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block text-center">您的卡密</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-4 bg-muted/50 rounded-xl font-mono text-lg text-center border-2 border-dashed border-primary/20 select-all tracking-wider text-foreground">
                    {redeemResult.card_key}
                  </code>
                  <Button onClick={() => copyToClipboard(redeemResult.card_key)} size="icon" className="h-14 w-14 shrink-0 rounded-xl">
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground/80 mt-2">
                  请妥善保管您的卡密，可在兑换记录中再次查看
                </p>
              </div>
              
              <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">本次消耗</span>
                  <span className="font-bold">{redeemResult.cost} 积分</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">剩余积分</span>
                  <span className="font-bold text-primary">{redeemResult.balance} 积分</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full h-11 text-base" 
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