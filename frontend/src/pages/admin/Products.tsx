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

  const getStatusColor = (status: string) => {
    if (status === 'available') return 'bg-green-100 text-green-700';
    if (status === 'sold_out') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">商品列表</h2>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          + 新建商品
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            暂无商品
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-card rounded-xl border overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🎁</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(product.status)}`}>
                    {getStatusLabel(product.status)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {product.description || '暂无描述'}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-primary">{product.price} 积分</span>
                  <span className="text-sm text-muted-foreground">库存: {product.stock}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleViewKeys(product)}
                    className="flex-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
                  >
                    卡密
                  </button>
                  <button
                    onClick={() => { setSelectedProduct(product); setShowDeleteModal(true); }}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchProducts(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => fetchProducts(page + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {showCreateModal ? '新建商品' : '编辑商品'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">商品名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="如：Steam 充值卡"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  placeholder="商品描述..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">图片URL</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">价格（积分）</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={showCreateModal ? handleCreate : handleUpdate}
                disabled={submitting || !formData.name}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">确认删除</h2>
            <p className="text-muted-foreground mb-6">
              确定要删除商品 <span className="font-semibold text-foreground">{selectedProduct.name}</span> 吗？此操作不可撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedProduct(null); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Keys Modal */}
      {showKeysModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedProduct.name} - 卡密管理</h2>
              <button
                onClick={() => { setShowImportModal(true); }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm"
              >
                导入卡密
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                总计: {cardKeys.length} 个卡密
              </span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600">
                  可用: {cardKeys.filter(k => k.status === 'available').length}
                </span>
                <span className="text-gray-500">
                  已兑换: {cardKeys.filter(k => k.status === 'redeemed').length}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {cardKeys.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无卡密，请导入</p>
              ) : (
                cardKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {key.key_content}
                    </code>
                    <span className={`text-xs px-2 py-1 rounded ${
                      key.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {key.status === 'available' ? '可用' : '已兑换'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => { setShowKeysModal(false); setSelectedProduct(null); setCardKeys([]); }}
              className="w-full mt-6 px-4 py-2 border rounded-lg hover:bg-muted"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Import Keys Modal */}
      {showImportModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">导入卡密</h2>
            <p className="text-sm text-muted-foreground mb-4">
              每行一个卡密，支持批量导入
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm"
              rows={10}
              placeholder="XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY&#10;..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowImportModal(false); setImportText(''); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleImportKeys}
                disabled={submitting || !importText.trim()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
