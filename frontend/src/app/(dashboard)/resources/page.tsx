'use client';

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Download, FileText, Search, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

interface Resource {
  _id: string;
  title: string;
  description: string;
  file_type: string;
  file_url: string;
  category: string;
  created_by: string;
  created_at: string;
  tags?: string[];
}

function getFileIcon(fileType: string) {
  if (fileType?.includes('pdf'))   return '📄 PDF';
  if (fileType?.includes('image')) return '🖼️ Image';
  if (fileType?.includes('video')) return '🎥 Video';
  if (fileType?.includes('audio')) return '🎵 Audio';
  return '📎 File';
}

export default function WellnessResourcesPage() {
  const [resources, setResources]           = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories]         = useState<string[]>([]);
  const [fSearch, setFSearch]               = useState(false);
  const [hovered, setHovered]               = useState<string | null>(null);

  useEffect(() => { loadResources(); }, []);
  useEffect(() => { filterResources(); }, [searchTerm, selectedCategory, resources]);

  const loadResources = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('No authentication token found'); setLoading(false); return; }
      const r = await fetch(api('/api/resources/student'), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Failed to fetch resources: ${r.status}`);
      const data = await r.json();
      const list: Resource[] = Array.isArray(data.resources) ? data.resources : [];
      setResources(list);
      setCategories([...new Set(list.map((r: any) => r.category || 'General'))] as string[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally { setLoading(false); }
  };

  const filterResources = () => {
    let filtered = resources;
    if (selectedCategory !== 'all') filtered = filtered.filter(r => r.category === selectedCategory);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(t) ||
        r.description?.toLowerCase().includes(t) ||
        r.tags?.some(tag => tag.toLowerCase().includes(t))
      );
    }
    setFilteredResources(filtered);
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Wellness Resources" subtitle="Browse helpful resources for your wellbeing">
        <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Wellness Resources"
      subtitle={`${filteredResources.length} resource${filteredResources.length !== 1 ? 's' : ''} available`}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
          </div>
        )}

        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Search resources…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg outline-none transition"
              style={{ background: 'var(--color-bg)', border: `1px solid ${fSearch ? 'var(--color-primary)' : 'var(--color-border)'}`, color: 'var(--color-text-primary)' }}
              onFocus={() => setFSearch(true)} onBlur={() => setFSearch(false)} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', ...categories]).map(cat => {
              const sel = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition"
                  style={sel
                    ? { background: 'var(--color-primary)', color: 'white' }
                    : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--color-border)'; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'var(--color-bg)'; }}>
                  {cat === 'all' ? 'All' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        {filteredResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={36} className="mb-3" style={{ color: 'var(--color-border)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>No resources found</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {searchTerm || selectedCategory !== 'all' ? 'Try adjusting your search or filter' : 'Check back soon for wellness resources'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map(resource => {
              const isHov = hovered === resource._id;
              return (
                <a key={resource._id} href={resource.file_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-xl p-4 transition cursor-pointer shadow-card"
                  style={{
                    background: 'var(--color-surface)',
                    border: `1px solid ${isHov ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                  onMouseEnter={() => setHovered(resource._id)}
                  onMouseLeave={() => setHovered(null)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1 transition"
                        style={{ color: isHov ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                        {resource.title}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{getFileIcon(resource.file_type)}</p>
                    </div>
                    <Download size={16} className="flex-shrink-0 mt-0.5 transition"
                      style={{ color: isHov ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                  </div>

                  {resource.description && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {resource.description}
                    </p>
                  )}

                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {resource.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded"
                          style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(resource.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
