'use client';

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Download, ExternalLink, FileText, Search, Loader2, Plus, Trash2, X } from 'lucide-react';
import { api } from '@/utils/api';

interface Resource {
  _id: string;
  title: string;
  description: string;
  file_type: string;
  file_name?: string;
  has_file?: boolean;
  url?: string;
  category: string;
  audience?: 'all' | 'my_students';
  uploaded_by_user_id?: string;
  created_at: string;
  tags?: string[];
}

// Roles that can share resources; ADMIN and CASE_MANAGER always share with every student
const SHARE_ROLES = ['ADMIN', 'CASE_MANAGER', 'COUNSELOR', 'PSYCHOLOGIST', 'IC'];
const EVERYONE_ROLES = ['ADMIN', 'CASE_MANAGER'];
const CATEGORIES = ['General', 'Stress', 'Anxiety', 'Depression', 'Sleep', 'Relationships', 'Academic', 'Mindfulness', 'Crisis Support'];
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif';

const IC  = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition disabled:opacity-50';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

function getFileIcon(fileType: string) {
  if (fileType === 'link')         return '🔗 Link';
  if (fileType?.includes('pdf'))   return '📄 PDF';
  if (fileType?.includes('image')) return '🖼️ Image';
  if (fileType?.includes('video')) return '🎥 Video';
  if (fileType?.includes('audio')) return '🎵 Audio';
  return '📎 File';
}

function storedUser(): { role: string; user_id: string } {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return { role: (u.role || '').toUpperCase(), user_id: u.user_id || u._id || '' };
  } catch { return { role: '', user_id: '' }; }
}

export default function WellnessResourcesPage() {
  const [resources, setResources]           = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [notice, setNotice]                 = useState('');
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories]         = useState<string[]>([]);
  const [fSearch, setFSearch]               = useState(false);
  const [hovered, setHovered]               = useState<string | null>(null);
  const [opening, setOpening]               = useState<string | null>(null);
  const [me, setMe]                         = useState({ role: '', user_id: '' });

  // Share form (staff)
  const [showShare, setShowShare]   = useState(false);
  const [kind, setKind]             = useState<'file' | 'link'>('file');
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('General');
  const [link, setLink]             = useState('');
  const [file, setFile]             = useState<File | null>(null);
  const [audience, setAudience]     = useState<'my_students' | 'all'>('my_students');
  const [sharing, setSharing]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const canShare = SHARE_ROLES.includes(me.role);
  const isStudent = me.role === 'STUDENT';

  useEffect(() => { setMe(storedUser()); loadResources(); }, []);
  useEffect(() => { filterResources(); }, [searchTerm, selectedCategory, resources]);

  const token = () => localStorage.getItem('token') || '';

  const loadResources = async () => {
    try {
      if (!token()) { setError('No authentication token found'); setLoading(false); return; }
      const r = await fetch(api('/api/resources/student'), { headers: { Authorization: `Bearer ${token()}` } });
      if (!r.ok) throw new Error(`Failed to fetch resources: ${r.status}`);
      const data = await r.json();
      const list: Resource[] = Array.isArray(data.resources) ? data.resources : [];
      setResources(list);
      setCategories([...new Set(list.map(r => r.category || 'General'))]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally { setLoading(false); }
  };

  const filterResources = () => {
    let filtered = resources;
    if (selectedCategory !== 'all') filtered = filtered.filter(r => (r.category || 'General') === selectedCategory);
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

  // Uploaded files need the sign-in token, so they are fetched and opened from memory.
  // The tab is opened first, inside the click, so pop-up blockers allow it.
  const openFile = async (resource: Resource) => {
    setOpening(resource._id); setError(null);
    const tab = window.open('', '_blank');
    try {
      const r = await fetch(api(`/api/resources/${resource._id}/file`), { headers: { Authorization: `Bearer ${token()}` } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Could not open the file (${r.status})`);
      const url = URL.createObjectURL(await r.blob());
      if (tab) tab.location.href = url;
      else {
        const a = document.createElement('a');
        a.href = url; a.download = resource.file_name || resource.title; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : 'Could not open the file');
    } finally { setOpening(null); }
  };

  const resetShare = () => {
    setTitle(''); setDescription(''); setCategory('General'); setLink(''); setFile(null);
    setAudience('my_students'); setKind('file');
  };

  const share = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setNotice('');
    if (!title.trim()) { setError('Enter a title'); return; }
    if (kind === 'file' && !file) { setError('Choose a file to upload'); return; }
    if (kind === 'link' && !/^https?:\/\//.test(link.trim())) { setError('Enter a link that starts with https://'); return; }
    if (file && file.size > 10 * 1024 * 1024) { setError('The file is larger than 10 MB'); return; }
    setSharing(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim()); fd.append('description', description.trim()); fd.append('category', category);
      fd.append('audience', EVERYONE_ROLES.includes(me.role) ? 'all' : audience);
      if (kind === 'file' && file) fd.append('file', file); else fd.append('url', link.trim());
      const r = await fetch(api('/api/resources/upload'), { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not share the resource');
      setNotice(`"${title.trim()}" is shared with ${EVERYONE_ROLES.includes(me.role) || audience === 'all' ? 'every student' : 'your students'}.`);
      resetShare(); setShowShare(false);
      loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share the resource');
    } finally { setSharing(false); }
  };

  const remove = async (id: string) => {
    setConfirmDelete(null); setError(null);
    const r = await fetch(api(`/api/resources/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error || 'Could not delete the resource'); return; }
    setNotice('Resource deleted.');
    setResources(rs => rs.filter(x => x._id !== id));
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
        {notice && (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
            <p className="text-sm" style={{ color: 'var(--color-success)' }}>{notice}</p>
          </div>
        )}

        {/* Share a resource (staff) */}
        {canShare && (
          showShare ? (
            <form onSubmit={share} className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Share a resource</h3>
                <button type="button" onClick={() => { setShowShare(false); resetShare(); }} aria-label="Close"
                  style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
              </div>
              <div className="flex gap-2">
                {(['file', 'link'] as const).map(k => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={kind === k ? { background: 'var(--color-primary)', color: 'white' }
                      : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                    {k === 'file' ? 'Upload a file' : 'Share a link'}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Title *</span>
                  <input id="res-title" value={title} onChange={e => setTitle(e.target.value)} className={IC} style={ICS} disabled={sharing} />
                </label>
                <label className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Category</span>
                  <select id="res-category" value={category} onChange={e => setCategory(e.target.value)} className={IC} style={ICS} disabled={sharing}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label className="text-xs space-y-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Description</span>
                <textarea id="res-description" value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className={`${IC} resize-none`} style={ICS} disabled={sharing} />
              </label>
              {kind === 'file' ? (
                <label className="text-xs space-y-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>File * (PDF, Word, PowerPoint, text or image, up to 10 MB)</span>
                  <input id="res-file" type="file" accept={ACCEPT} onChange={e => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm" style={{ color: 'var(--color-text-primary)' }} disabled={sharing} />
                </label>
              ) : (
                <label className="text-xs space-y-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Link *</span>
                  <input id="res-link" value={link} onChange={e => setLink(e.target.value)} placeholder="https://"
                    className={IC} style={ICS} disabled={sharing} />
                </label>
              )}
              {!EVERYONE_ROLES.includes(me.role) && (
                <label className="text-xs space-y-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Who can see it</span>
                  <select id="res-audience" value={audience} onChange={e => setAudience(e.target.value as 'my_students' | 'all')}
                    className={IC} style={ICS} disabled={sharing}>
                    <option value="my_students">My students only</option>
                    <option value="all">Every student</option>
                  </select>
                </label>
              )}
              <button type="submit" disabled={sharing}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: 'white' }}>
                {sharing ? 'Sharing…' : 'Share resource'}
              </button>
            </form>
          ) : (
            <button onClick={() => { setShowShare(true); setNotice(''); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--color-primary)', color: 'white' }}>
              <Plus size={16} /> Share a resource
            </button>
          )
        )}

        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Search resources…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg outline-none transition"
              style={{ background: 'var(--color-surface)', border: `1px solid ${fSearch ? 'var(--color-primary)' : 'var(--color-border)'}`, color: 'var(--color-text-primary)' }}
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
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-primary-surface)' }}>
              <FileText size={22} style={{ color: 'var(--color-primary-text)' }} />
            </div>
            <p className="font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>No resources found</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {searchTerm || selectedCategory !== 'all' ? 'Try adjusting your search or filter' : 'Check back soon for wellness resources'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map(resource => {
              const isHov = hovered === resource._id;
              const isFile = !!resource.has_file;
              const mine = resource.uploaded_by_user_id && resource.uploaded_by_user_id === me.user_id;
              const canDelete = canShare && (mine || me.role === 'ADMIN');
              const cardStyle: React.CSSProperties = {
                background: 'var(--color-surface)',
                border: `1px solid ${isHov ? 'var(--color-primary)' : 'var(--color-border)'}`,
              };
              const body = (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1 transition"
                        style={{ color: isHov ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                        {resource.title}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{getFileIcon(resource.file_type)}</p>
                    </div>
                    {opening === resource._id
                      ? <Loader2 size={16} className="animate-spin flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                      : isFile
                        ? <Download size={16} className="flex-shrink-0 mt-0.5 transition" style={{ color: isHov ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                        : <ExternalLink size={16} className="flex-shrink-0 mt-0.5 transition" style={{ color: isHov ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />}
                  </div>

                  {resource.description && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {resource.description}
                    </p>
                  )}

                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {resource.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              );
              return (
                <div key={resource._id} className="rounded-xl shadow-card transition flex flex-col" style={cardStyle}
                  onMouseEnter={() => setHovered(resource._id)} onMouseLeave={() => setHovered(null)}>
                  {isFile ? (
                    <button type="button" onClick={() => openFile(resource)} disabled={opening === resource._id}
                      className="text-left p-4 pb-0 flex-1 cursor-pointer">{body}</button>
                  ) : (
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="p-4 pb-0 flex-1 cursor-pointer block">{body}</a>
                  )}
                  <div className="mx-4 mt-4 py-3 flex items-center justify-between gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(resource.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}
                      {!isStudent && resource.uploaded_by_user_id && (
                        <> · {resource.audience === 'all' ? 'Every student' : 'Uploader’s students'}</>
                      )}
                    </p>
                    {canDelete && (confirmDelete === resource._id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <button onClick={() => remove(resource._id)} className="font-semibold" style={{ color: 'var(--color-danger)' }}>Delete</button>
                        <button onClick={() => setConfirmDelete(null)} style={{ color: 'var(--color-text-muted)' }}>Keep</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(resource._id)} aria-label={`Delete ${resource.title}`}
                        style={{ color: 'var(--color-text-muted)' }}><Trash2 size={14} /></button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
