import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCardKeys,
  importCardKeys,
  type AdminProduct,
  type CreateProductRequest,
  type UpdateProductRequest,
  type CardKey,
} from '../../api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, Key, Upload, X, Package, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'available', label: '上架' },
  { value: 'offline', label: '下架' },
];

export function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [cardKeys, setCardKeys] = useState<CardKey[]>([]);
  
  // Form states
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    description: '',
    image: '',
    price: 100,
    status: 'available',
  });
  const [importText, setImportText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const data = await getAllProducts({ page: pageNum, limit: 20 });
      setProducts(data.products || []);
      setPage(data.page);
      setTotalPages(data.total_pages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      await createProduct(formData);
      setShowCreateModal(false);
      resetForm();
      fetchProducts(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProduct) return;
    try {
      setSubmitting(true);
      const updateData: UpdateProductRequest = {
        name: formData.name,
        description: formData.description,
        image: formData.image,
        price: formData.price,
        status: formData.status,
      };
      await updateProduct(selectedProduct.id, updateData);
      setShowEditModal(false);
      resetForm();
      fetchProducts(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      setSubmitting(true);
      await deleteProduct(selectedProduct.id);
      setShowDeleteModal(false);
      setSelectedProduct(null);
      fetchProducts(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewKeys = async (product: AdminProduct) => {
    setSelectedProduct(product);
    try {
      const data = await getCardKeys(product.id);
      setCardKeys(data.card_keys || []);
      setShowKeysModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取卡密失败');
    }
  };

  const handleImportKeys = async () => {
    if (!selectedProduct || !importText.trim()) return;
    try {
      setSubmitting(true);
      const keys = importText.split('\n').map(k => k.trim()).filter(k => k);
      const result = await importCardKeys(selectedProduct.id, keys);
      setShowImportModal(false);
      setImportText('');
      // Refresh card keys
      const data = await getCardKeys(selectedProduct.id);
      setCardKeys(data.card_keys || []);
      fetchProducts(page);
      alert(`成功导入 ${result.imported} 个卡密`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: '',
      price: 100,
      status: 'available',
    });
    setSelectedProduct(null);
  };

  const openEditModal = (product: AdminProduct) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.price,
      status: product.status,
    });
    setShowEditModal(true);
  };

  const getStatusLabel = (status: string) => {
    if (status === 'available') return '上架';
    if (status === 'sold_out') return '已兑完';
    if (status === 'offline') return '下架';
    return status;
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">商品列表</h2>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> 新建商品
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
            <Package className="w-12 h-12 mb-4 opacity-50" />
            <p>暂无商品</p>
          </div>
        ) : (
          products.map((product) => (
            <Card key={product.id} className="overflow-hidden flex flex-col group">
              <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Package className="w-16 h-16 text-muted-foreground/30" />
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={
                    product.status === 'available' ? 'default' : 
                    product.status === 'sold_out' ? 'destructive' : 
                    'secondary'
                  } className={cn(product.status === 'available' && 'bg-green-600')}>
                    {getStatusLabel(product.status)}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4 flex-1">
                <div className="mb-2">
                  <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 h-10">
                  {product.description || '暂无描述'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">{product.price} <span className="text-xs font-normal text-muted-foreground">积分</span></span>
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    库存: {product.stock}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditModal(product)}>
                  <Edit className="w-4 h-4 mr-2" /> 编辑
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewKeys(product)}>
                  <Key className="w-4 h-4 mr-2" /> 卡密
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setSelectedProduct(product); setShowDeleteModal(true); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchProducts(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchProducts(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {showCreateModal ? '新建商品' : '编辑商品'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">商品名称</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：Steam 充值卡"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="商品描述..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">图片URL</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">价格（积分）</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                 <Button variant="outline" onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} disabled={submitting}>
                    取消
                 </Button>
                 <Button onClick={showCreateModal ? handleCreate : handleUpdate} disabled={submitting || !formData.name}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {showCreateModal ? '创建' : '保存'}
                 </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
               <CardTitle>确认删除</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                确定要删除商品 <span className="font-semibold text-foreground">{selectedProduct.name}</span> 吗？此操作不可撤销。
              </p>
              <div className="flex gap-3 mt-6 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteModal(false); setSelectedProduct(null); }}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  确认删除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Card Keys Modal */}
      {showKeysModal && selectedProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>{selectedProduct.name} - 卡密管理</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setShowImportModal(true)}>
                  <Upload className="w-4 h-4 mr-2" /> 导入卡密
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setShowKeysModal(false); setSelectedProduct(null); setCardKeys([]); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
              <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                <span className="text-sm font-medium">
                  总计: {cardKeys.length} 个
                </span>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    可用: {cardKeys.filter(k => k.status === 'available').length}
                  </Badge>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    已兑换: {cardKeys.filter(k => k.status === 'redeemed').length}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {cardKeys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                    <Key className="w-10 h-10 mb-2 opacity-20" />
                    <p>暂无卡密，请导入</p>
                  </div>
                ) : (
                  cardKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded select-all">
                        {key.key_content}
                      </code>
                      <Badge variant={key.status === 'available' ? 'default' : 'secondary'} className={cn(key.status === 'available' && 'bg-green-600 hover:bg-green-700')}>
                        {key.status === 'available' ? '可用' : '已兑换'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Keys Modal */}
      {showImportModal && selectedProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
               <CardTitle>导入卡密</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                每行一个卡密，支持批量导入
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full min-h-[200px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm resize-none"
                placeholder="XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY&#10;..."
              />
              <div className="flex gap-3 mt-4 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setShowImportModal(false); setImportText(''); }}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button
                  onClick={handleImportKeys}
                  disabled={submitting || !importText.trim()}
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  确认导入
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
