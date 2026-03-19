'use client';

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Download, FileText, Image, Plus, Search } from 'lucide-react';
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

export default function WellnessResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [searchTerm, selectedCategory, resources]);

  const loadResources = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(api('/api/resources/student'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch resources: ${response.status}`);
      }

      const data = await response.json();
      const resourceList = Array.isArray(data.resources) ? data.resources : [];
      setResources(resourceList);

      // Extract unique categories
      const uniqueCategories = [...new Set(resourceList.map((r: any) => r.category || 'General'))];
      setCategories(uniqueCategories as string[]);
      
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load resources';
      console.error('Error loading resources:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = resources;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredResources(filtered);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('pdf')) return '📄 PDF';
    if (fileType?.includes('image')) return '🖼️ Image';
    if (fileType?.includes('video')) return '🎥 Video';
    if (fileType?.includes('audio')) return '🎵 Audio';
    return '📎 File';
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Wellness Resources" subtitle="Browse helpful resources for your wellbeing">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Wellness Resources" subtitle={`${filteredResources.length} resource${filteredResources.length !== 1 ? 's' : ''} available`}>
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 bg-red-50 dark:bg-red-900/30 rounded p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto mb-3 text-gray-400" size={40} />
            <p className="text-gray-500 dark:text-gray-400 mb-1">No resources found</p>
            {searchTerm || selectedCategory !== 'all' ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your search or filter</p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">Check back soon for wellness resources</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map(resource => (
              <a
                key={resource._id}
                href={resource.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg dark:hover:shadow-gray-800 transition group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {resource.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{getFileIcon(resource.file_type)}</p>
                  </div>
                  <Download className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" size={18} />
                </div>

                {resource.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{resource.description}</p>
                )}

                {resource.tags && resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(resource.created_at).toLocaleDateString()}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
