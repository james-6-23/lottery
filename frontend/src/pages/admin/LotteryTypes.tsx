import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLotteryTypes, type LotteryType } from '../../api/lottery';
import {
  createLotteryType,
  updateLotteryType,
  deleteLotteryType,
  createPrizePool,
  getPrizePools,
  type CreateLotteryTypeRequest,
  type UpdateLotteryTypeRequest,
  type PrizePool,
  type PrizeLevel,
} from '../../api/admin';

const GAME_TYPES = [
  { value: 'number_match', label: '数字匹配型' },
  { value: 'symbol_match', label: '符号匹配型' },
  { value: 'amount_sum', label: '金额累加型' },
  { value: 'multiplier', label: '翻倍型' },
  { value: 'pattern', label: '图案型' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: '可用' },
  { value: 'sold_out', label: '已售罄' },
  { value: 'offline', label: '已下架' },
];

export function AdminLotteryTypes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [selectedType, setSelectedType] = useState<LotteryType | null>(null);
  const [pools, setPools] = useState<PrizePool[]>([]);
  
  // Form states
  const [formData, setFormData] = useState<CreateLotteryTypeRequest>({
    name: '',
    description: '',
    price: 10,
    max_prize: 1000,
    game_type: 'number_match',
    cover_image: '',
    prize_levels: [{ level: 1, name: '一等奖', prize_amount: 1000, quantity: 1 }],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchLotteryTypes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLotteryTypes();
      setLotteryTypes(data.lottery_types || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取彩票类型失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotteryTypes();
  }, [fetchLotteryTypes]);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      await createLotteryType(formData);
      setShowCreateModal(false);
      resetForm();
      fetchLotteryTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedType) return;
    try {
      setSubmitting(true);
      const updateData: UpdateLotteryTypeRequest = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        max_prize: formData.max_prize,
        game_type: formData.game_type,
        cover_image: formData.cover_image,
      };
      await updateLotteryType(selectedType.id, updateData);
      setShowEditModal(false);
      resetForm();
      fetchLotteryTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedType) return;
    try {
      setSubmitting(true);
      await deleteLotteryType(selectedType.id);
      setShowDeleteModal(false);
      setSelectedType(null);
      fetchLotteryTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPools = async (type: LotteryType) => {
    setSelectedType(type);
    try {
      const data = await getPrizePools(type.id);
      setPools(data || []);
      setShowPoolModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取奖组失败');
    }
  };

  const handleCreatePool = async (totalTickets: number) => {
    if (!selectedType) return;
    try {
      await createPrizePool(selectedType.id, { total_tickets: totalTickets });
      const data = await getPrizePools(selectedType.id);
      setPools(data || []);
      fetchLotteryTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建奖组失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 10,
      max_prize: 1000,
      game_type: 'number_match',
      cover_image: '',
      prize_levels: [{ level: 1, name: '一等奖', prize_amount: 1000, quantity: 1 }],
    });
    setSelectedType(null);
  };

  const openEditModal = (type: LotteryType) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      description: type.description,
      price: type.price,
      max_prize: type.max_prize,
      game_type: type.game_type,
      cover_image: type.cover_image,
      prize_levels: type.prize_levels || [],
    });
    setShowEditModal(true);
  };

  const addPrizeLevel = () => {
    const newLevel = (formData.prize_levels?.length || 0) + 1;
    setFormData({
      ...formData,
      prize_levels: [
        ...(formData.prize_levels || []),
        { level: newLevel, name: `${newLevel}等奖`, prize_amount: 100, quantity: 10 },
      ],
    });
  };

  const removePrizeLevel = (index: number) => {
    const newLevels = [...(formData.prize_levels || [])];
    newLevels.splice(index, 1);
    setFormData({ ...formData, prize_levels: newLevels });
  };

  const updatePrizeLevel = (index: number, field: keyof PrizeLevel, value: string | number) => {
    const newLevels = [...(formData.prize_levels || [])];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setFormData({ ...formData, prize_levels: newLevels });
  };

  const getGameTypeLabel = (type: string) => GAME_TYPES.find(t => t.value === type)?.label || type;
  const getStatusLabel = (status: string) => STATUS_OPTIONS.find(s => s.value === status)?.label || status;

  if (loading) {
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
        <h2 className="text-lg font-semibold">彩票类型列表</h2>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          + 新建彩票类型
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {/* Lottery Types Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium">价格</th>
              <th className="px-4 py-3 text-left text-sm font-medium">最高奖金</th>
              <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lotteryTypes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  暂无彩票类型
                </td>
              </tr>
            ) : (
              lotteryTypes.map((type) => (
                <tr key={type.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {type.cover_image ? (
                        <img src={type.cover_image} alt={type.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">🎰</div>
                      )}
                      <span className="font-medium">{type.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{getGameTypeLabel(type.game_type)}</td>
                  <td className="px-4 py-3 text-sm">{type.price} 积分</td>
                  <td className="px-4 py-3 text-sm text-primary font-medium">{type.max_prize} 积分</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      type.status === 'available' ? 'bg-green-100 text-green-700' :
                      type.status === 'sold_out' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getStatusLabel(type.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(type)}
                        className="text-sm text-primary hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleViewPools(type)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        奖组
                      </button>
                      <button
                        onClick={() => { setSelectedType(type); setShowDeleteModal(true); }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-card rounded-xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {showCreateModal ? '新建彩票类型' : '编辑彩票类型'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="如：好运十倍"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">游戏类型</label>
                  <select
                    value={formData.game_type}
                    onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {GAME_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  placeholder="彩票玩法描述..."
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
                  <label className="block text-sm font-medium mb-1">最高奖金（积分）</label>
                  <input
                    type="number"
                    value={formData.max_prize}
                    onChange={(e) => setFormData({ ...formData, max_prize: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min={1}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">封面图片URL</label>
                <input
                  type="text"
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://..."
                />
              </div>

              {/* Prize Levels */}
              {showCreateModal && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">奖级设置</label>
                    <button
                      type="button"
                      onClick={addPrizeLevel}
                      className="text-sm text-primary hover:underline"
                    >
                      + 添加奖级
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.prize_levels?.map((level, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <input
                          type="text"
                          value={level.name}
                          onChange={(e) => updatePrizeLevel(index, 'name', e.target.value)}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          placeholder="奖级名称"
                        />
                        <input
                          type="number"
                          value={level.prize_amount}
                          onChange={(e) => updatePrizeLevel(index, 'prize_amount', parseInt(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border rounded text-sm"
                          placeholder="奖金"
                        />
                        <input
                          type="number"
                          value={level.quantity}
                          onChange={(e) => updatePrizeLevel(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          placeholder="数量"
                        />
                        <button
                          type="button"
                          onClick={() => removePrizeLevel(index)}
                          className="text-red-500 hover:text-red-700 px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
      {showDeleteModal && selectedType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">确认删除</h2>
            <p className="text-muted-foreground mb-6">
              确定要删除彩票类型 <span className="font-semibold text-foreground">{selectedType.name}</span> 吗？此操作不可撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedType(null); }}
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

      {/* Prize Pools Modal */}
      {showPoolModal && selectedType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{selectedType.name} - 奖组管理</h2>
            
            {/* Create Pool Form */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-3">创建新奖组</h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  id="poolTickets"
                  placeholder="彩票数量"
                  className="flex-1 px-3 py-2 border rounded-lg"
                  min={1}
                  defaultValue={100}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('poolTickets') as HTMLInputElement;
                    handleCreatePool(parseInt(input.value) || 100);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  创建奖组
                </button>
              </div>
            </div>

            {/* Pools List */}
            <div className="space-y-3">
              {pools.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">暂无奖组</p>
              ) : (
                pools.map((pool) => (
                  <div key={pool.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">奖组 #{pool.id}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        pool.status === 'active' ? 'bg-green-100 text-green-700' :
                        pool.status === 'sold_out' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {pool.status === 'active' ? '活跃' : pool.status === 'sold_out' ? '已售罄' : '已关闭'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">总数：</span>
                        <span className="font-medium">{pool.total_tickets}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">已售：</span>
                        <span className="font-medium">{pool.sold_tickets}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">已兑奖：</span>
                        <span className="font-medium">{pool.claimed_prizes}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">返奖率：</span>
                        <span className="font-medium">{(pool.return_rate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(pool.sold_tickets / pool.total_tickets) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        销售进度：{((pool.sold_tickets / pool.total_tickets) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => { setShowPoolModal(false); setSelectedType(null); setPools([]); }}
              className="w-full mt-6 px-4 py-2 border rounded-lg hover:bg-muted"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
