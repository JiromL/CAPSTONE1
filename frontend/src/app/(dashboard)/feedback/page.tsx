'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Star, TrendingUp, MessageCircle, AlertCircle } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { api } from '@/utils/api';

interface FeedbackItem {
  feedback_id: string;
  rating: number;
  category: string;
  content: string;
  would_recommend: string;
  submitted_by: string;
  created_at: string;
}

interface FeedbackData {
  feedback: FeedbackItem[];
  total: number;
  avg_rating: number;
}

export default function FeedbackPage() {
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

  useEffect(() => {
    fetchFeedback();
  }, [selectedCategory]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const endpoint = selectedCategory === 'all' 
        ? `/api/engagement/feedback?type=all&limit=50` 
        : `/api/engagement/feedback?type=${selectedCategory}&limit=50`;
      
      const response = await fetch(api(endpoint), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch feedback');
      
      const data = await response.json();
      setFeedbackData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const getRatingDistribution = () => {
    if (!feedbackData?.feedback) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbackData.feedback.forEach(item => {
      distribution[item.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const getCategoryBreakdown = () => {
    if (!feedbackData?.feedback) return {};
    
    const breakdown: { [key: string]: number } = {};
    feedbackData.feedback.forEach(item => {
      breakdown[item.category] = (breakdown[item.category] || 0) + 1;
    });
    return breakdown;
  };

  const getRecommendationPercentage = () => {
    if (!feedbackData?.feedback || feedbackData.feedback.length === 0) return 0;
    
    const recommendations = feedbackData.feedback.filter(f => f.would_recommend === 'yes').length;
    return Math.round((recommendations / feedbackData.feedback.length) * 100);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600 dark:text-green-400';
    if (rating >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feedback Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Session and program feedback analysis</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Error Loading Feedback</p>
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : feedbackData ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Average Rating */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Avg Rating</h3>
                  <Star className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{feedbackData.avg_rating}/5</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Based on {feedbackData.total} responses</p>
              </div>

              {/* Total Feedback */}
              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Total Feedback</h3>
                  <MessageCircle className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{feedbackData.total}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Responses collected</p>
              </div>

              {/* Recommendation Rate */}
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Would Recommend</h3>
                  <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{getRecommendationPercentage()}%</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Of respondents</p>
              </div>

              {/* Rating Count */}
              <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">5-Star Ratings</h3>
                  <BarChart3 className="text-orange-600 dark:text-orange-400" size={20} />
                </div>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{getRatingDistribution()[5]}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Excellent ratings</p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rating Distribution</h2>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = getRatingDistribution()[rating as keyof ReturnType<typeof getRatingDistribution>];
                  const percentage = feedbackData.total > 0 ? (count / feedbackData.total) * 100 : 0;
                  return (
                    <div key={rating}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rating} Stars</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">({count})</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 dark:bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Breakdown and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Category Breakdown */}
              <div className="md:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">By Category</h2>
                <div className="space-y-2">
                  {Object.entries(getCategoryBreakdown()).map(([category, count]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedCategory === category
                          ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700'
                          : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize text-gray-900 dark:text-gray-50">{category}</span>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Stats */}
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Distribution</h2>
                <div className="space-y-3">
                  {Object.entries(getCategoryBreakdown()).map(([category, count]) => {
                    const percentage = feedbackData.total > 0 ? (count / feedbackData.total) * 100 : 0;
                    return (
                      <div key={`stat-${category}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{category}</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-blue-500 dark:bg-blue-400 h-3 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Feedback List */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedCategory === 'all' ? 'All Feedback' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Feedback`}
              </h2>
              
              {feedbackData.feedback.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No feedback available for this category</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {feedbackData.feedback.map((item) => (
                    <button
                      key={item.feedback_id}
                      onClick={() => setSelectedFeedback(item)}
                      className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex gap-1">
                              {[...Array(item.rating)].map((_, i) => (
                                <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{item.category}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{item.content}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{item.submitted_by}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.would_recommend === 'yes' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              ✓ Recommends
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback Detail Modal */}
            {selectedFeedback && (
              <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feedback Details</h3>
                      <button
                        onClick={() => setSelectedFeedback(null)}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Rating</label>
                        <div className="flex gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={20} 
                              className={i < selectedFeedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'} 
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedFeedback.rating} out of 5</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 capitalize mt-1">{selectedFeedback.category}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Recommendation</label>
                        <p className={`text-sm mt-1 ${selectedFeedback.would_recommend === 'yes' ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400'}`}>
                          {selectedFeedback.would_recommend === 'yes' ? '✓ Would Recommend' : '✗ Would Not Recommend'}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Feedback</label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{selectedFeedback.content}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Submitted By</label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedFeedback.submitted_by}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{new Date(selectedFeedback.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
