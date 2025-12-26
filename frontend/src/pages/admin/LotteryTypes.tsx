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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, X, AlertTriangle, Layers, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">彩票类型列表</h2>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> 新建彩票类型
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Lottery Types Table */}
      <Card>
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">名称</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">类型</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">价格</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">最高奖金</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">状态</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {lotteryTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    暂无彩票类型
                  </td>
                </tr>
              ) : (
                lotteryTypes.map((type) => (
                  <tr key={type.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        {type.cover_image ? (
                          <img src={type.cover_image} alt={type.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <span className="font-medium">{type.name}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">{getGameTypeLabel(type.game_type)}</td>
                    <td className="p-4 align-middle">{type.price} 积分</td>
                    <td className="p-4 align-middle font-medium text-primary">{type.max_prize} 积分</td>
                    <td className="p-4 align-middle">
                      <Badge variant={
                        type.status === 'available' ? 'default' : 
                        type.status === 'sold_out' ? 'destructive' : 
                        'secondary'
                      } className={cn(
                        type.status === 'available' && "bg-green-600 hover:bg-green-700"
                      )}>
                        {getStatusLabel(type.status)}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(type)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleViewPools(type)}>
                          <Layers className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedType(type); setShowDeleteModal(true); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {showCreateModal ? '新建彩票类型' : '编辑彩票类型'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">名称</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：好运十倍"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">游戏类型</label>
                  <select
                    value={formData.game_type}
                    onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {GAME_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="彩票玩法描述..."
                />
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
                  <label className="text-sm font-medium">最高奖金（积分）</label>
                  <Input
                    type="number"
                    value={formData.max_prize}
                    onChange={(e) => setFormData({ ...formData, max_prize: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">封面图片URL</label>
                <Input
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* Prize Levels */}
              {showCreateModal && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">奖级设置</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPrizeLevel}
                    >
                      <Plus className="w-3 h-3 mr-1" /> 添加奖级
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.prize_levels?.map((level, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <Input
                          value={level.name}
                          onChange={(e) => updatePrizeLevel(index, 'name', e.target.value)}
                          placeholder="奖级名称"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={level.prize_amount}
                          onChange={(e) => updatePrizeLevel(index, 'prize_amount', parseInt(e.target.value) || 0)}
                          placeholder="奖金"
                          className="w-24"
                        />
                        <Input
                          type="number"
                          value={level.quantity}
                          onChange={(e) => updatePrizeLevel(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="数量"
                          className="w-20"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePrizeLevel(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
      {showDeleteModal && selectedType && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader>
               <CardTitle>确认删除</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                确定要删除彩票类型 <span className="font-semibold text-foreground">{selectedType.name}</span> 吗？此操作不可撤销。
              </p>
              <div className="flex gap-3 mt-6 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteModal(false); setSelectedType(null); }}
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

      {/* Prize Pools Modal */}
      {showPoolModal && selectedType && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{selectedType.name} - 奖组管理</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowPoolModal(false); setSelectedType(null); setPools([]); }}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create Pool Form */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-3 text-sm">创建新奖组</h3>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    id="poolTickets"
                    placeholder="彩票数量"
                    className="flex-1"
                    min={1}
                    defaultValue={100}
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById('poolTickets') as HTMLInputElement;
                      handleCreatePool(parseInt(input.value) || 100);
                    }}
                  >
                    创建奖组
                  </Button>
                </div>
              </div>

              {/* Pools List */}
              <div className="space-y-3">
                {pools.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">暂无奖组</p>
                ) : (
                  pools.map((pool) => (
                    <div key={pool.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">奖组 #{pool.id}</span>
                        <Badge variant={
                          pool.status === 'active' ? 'default' : 
                          pool.status === 'sold_out' ? 'destructive' : 
                          'secondary'
                        } className={cn(pool.status === 'active' && 'bg-green-600')}>
                          {pool.status === 'active' ? '活跃' : pool.status === 'sold_out' ? '已售罄' : '已关闭'}
                        </Badge>
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
