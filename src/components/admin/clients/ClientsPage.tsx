import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FolderOpen, User, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { ClientModal } from './ClientModal';
import { formatNumber, formatDateArabic } from '../../../lib/formatters';
import type { Client } from '../../../types/database';

interface ClientWithProjects extends Client {
  projects_count?: number;
}

interface ClientsPageProps {
  onViewClient?: (clientId: string) => void;
}

type SortOption = 'name' | 'updated' | 'projects';

export const ClientsPage = ({ onViewClient }: ClientsPageProps) => {
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    let filtered = clients;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          (client.email && client.email.toLowerCase().includes(query))
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortBy === 'projects') {
        return (b.projects_count || 0) - (a.projects_count || 0);
      }
      return 0;
    });

    setFilteredClients(sorted);
  }, [searchQuery, clients, sortBy]);

  const loadClients = async () => {
    try {
      setLoading(true);

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      const clientsWithCounts = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { count } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', client.id);

          return {
            ...client,
            projects_count: count || 0,
          };
        })
      );

      setClients(clientsWithCounts);
      setFilteredClients(clientsWithCounts);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`هل أنت متأكد من حذف العميل "${client.name}"؟`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      loadClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      if (error.code === '23503') {
        alert('لا يمكن حذف هذا العميل لأنه مرتبط بمشاريع أخرى');
      } else {
        alert('حدث خطأ أثناء حذف العميل');
      }
    }
  };

  const handleEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClient(client);
    setShowModal(true);
  };

  const handleRowClick = (clientId: string) => {
    if (onViewClient) {
      onViewClient(clientId);
    }
  };

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'name':
        return 'الاسم';
      case 'updated':
        return 'آخر تحديث';
      case 'projects':
        return 'عدد المشاريع';
      default:
        return 'آخر تحديث';
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">العملاء</h1>
        <button
          onClick={() => {
            setSelectedClient(null);
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-all font-medium"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus className="w-5 h-5" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن عميل..."
            className="w-full pr-10 pl-4 py-3 border border-slate-300 dark:border-dark-border rounded-lg
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
              focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-4 py-3 border border-slate-300 dark:border-dark-border
              rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
              hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-w-[200px] justify-between"
          >
            <span className="text-sm">ترتيب حسب: {getSortLabel(sortBy)}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showSortMenu && (
            <div className="absolute left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200
              dark:border-dark-border rounded-lg shadow-lg z-10 overflow-hidden">
              {(['name', 'updated', 'projects'] as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSortBy(option);
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-right text-sm hover:bg-slate-50 dark:hover:bg-slate-700
                    transition-colors ${
                      sortBy === option
                        ? 'bg-[#0A2A66]/10 dark:bg-[#0A2A66]/20 text-[#0A2A66] dark:text-[#47A1FF] font-medium'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                >
                  {getSortLabel(option)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-8">
          <div className="text-center text-slate-600 dark:text-slate-300">جاري التحميل...</div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-8">
          <div className="text-center text-slate-600 dark:text-slate-300">
            {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد عملاء'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleRowClick(client.id)}
              className="bg-white dark:bg-dark-card rounded-[24px] shadow-sm border border-slate-200
                dark:border-dark-border p-6 hover:shadow-lg hover:border-[#0A2A66]/30
                dark:hover:border-[#0A2A66]/50 transition-all duration-300 cursor-pointer
                hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg overflow-hidden"
                    style={{ backgroundColor: 'var(--color-primary)' }}>
                    {client.client_image ? (
                      <img
                        src={client.client_image}
                        alt={client.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                    {client.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{client.email || 'لا يوجد بريد إلكتروني'}</p>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-[#0A2A66] dark:text-[#47A1FF]" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {formatNumber(client.projects_count || 0)} مشروع
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      آخر تحديث {formatDateArabic(client.updated_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleEdit(client, e)}
                    className="p-2.5 text-[#0A2A66] hover:bg-[#0A2A66]/10 dark:text-[#47A1FF]
                      dark:hover:bg-[#0A2A66]/20 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(client, e)}
                    className="p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400
                      dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ClientModal
          client={selectedClient}
          onClose={() => {
            setShowModal(false);
            setSelectedClient(null);
          }}
          onSuccess={loadClients}
        />
      )}
    </div>
  );
};
