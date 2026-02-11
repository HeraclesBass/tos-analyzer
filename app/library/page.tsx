'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Search, X, Sparkles, TrendingUp, Clock, AlertTriangle, Shield, Database, Building2, Zap } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { TOSCard } from '@/components/TOSCard';
import { FloatingLogos } from '@/components/FloatingLogos';
import type { RiskLevel, CategoryName } from '@/lib/types';

interface LibraryAnalysis {
  id: string;
  companyName: string | null;
  overallRisk: RiskLevel;
  clauseCount: number;
  viewCount: number;
  categories: CategoryName[];
  createdAt: string;
  score: number;
}

interface LibraryResponse {
  success: boolean;
  data: {
    analyses: LibraryAnalysis[];
    total: number;
    hasMore: boolean;
  };
}

export default function LibraryPage() {
  const [analyses, setAnalyses] = useState<LibraryAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('popular');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        sort,
        filter,
        limit: '50'
      });
      
      if (search) params.append('search', search);
      if (category) params.append('category', category);

      const response = await fetch(`/api/library?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch library');
      }

      const result: LibraryResponse = await response.json();
      setAnalyses(result.data.analyses);
      setHasMore(result.data.hasMore);
      setTotalCount(result.data.total);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load library');
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, [sort, filter, search, category]);

  useEffect(() => {
    if (search) {
      const timer = setTimeout(() => {
        fetchLibrary();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      fetchLibrary();
    }
  }, [fetchLibrary, search]);

  const clearFilters = () => {
    setSearch('');
    setSort('popular');
    setFilter('all');
    setCategory('');
  };

  const activeFilterCount = [
    filter !== 'all',
    category !== '',
    search !== ''
  ].filter(Boolean).length;

  const loadMore = async () => {
    try {
      const params = new URLSearchParams({
        sort,
        filter,
        limit: '50',
        offset: analyses.length.toString()
      });
      
      if (search) params.append('search', search);
      if (category) params.append('category', category);

      const response = await fetch(`/api/library?${params}`);
      const result: LibraryResponse = await response.json();
      
      setAnalyses([...analyses, ...result.data.analyses]);
      setHasMore(result.data.hasMore);
    } catch (error) {
      toast.error('Failed to load more');
    }
  };

  const uniqueCompanies = new Set(analyses.map(a => a.companyName).filter(Boolean)).size;

  return (
    <main className="library-page">
      <nav className="library-nav">
        <div className="library-nav__inner">
          <Link href="/" className="library-nav__logo">
            <FileText className="w-6 h-6" />
            <span>FinePrint</span>
          </Link>
          <div className="library-nav__links">
            <Link href="/" className="library-nav__link">Home</Link>
            <Link href="/library" className="library-nav__link library-nav__link--active">Library</Link>
            <Link href="/about" className="library-nav__link">About</Link>
            <Link href="/privacy" className="library-nav__link">Privacy</Link>
          </div>
        </div>
      </nav>

      <div className="library-hero">
        <div className="library-hero__glow library-hero__glow--1" />
        <div className="library-hero__glow library-hero__glow--2" />
        
        <FloatingLogos companies={analyses.map(a => a.companyName)} />
        
        <div className="library-hero__content">
          <h1 className="library-hero__title">
            TOS Library
          </h1>
          
          <p className="library-hero__subtitle">
            AI-powered analysis of Terms of Service from <span className="library-hero__highlight">{uniqueCompanies || 150}+ companies</span>
          </p>

          <div className="library-stats">
            <div className="library-stat">
              <div className="library-stat__icon library-stat__icon--blue">
                <Database className="w-5 h-5" />
              </div>
              <div className="library-stat__info">
                <div className="library-stat__value">{totalCount.toLocaleString()}</div>
                <div className="library-stat__label">Analyses</div>
              </div>
            </div>

            <div className="library-stat">
              <div className="library-stat__icon library-stat__icon--purple">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="library-stat__info">
                <div className="library-stat__value">{uniqueCompanies || 150}</div>
                <div className="library-stat__label">Companies</div>
              </div>
            </div>

            <div className="library-stat">
              <div className="library-stat__icon library-stat__icon--green">
                <Zap className="w-5 h-5" />
              </div>
              <div className="library-stat__info">
                <div className="library-stat__value">Live</div>
                <div className="library-stat__label">Updates</div>
              </div>
            </div>
          </div>

          <div className="library-search">
            <Search className="library-search__icon" />
            <input
              type="text"
              placeholder="Search companies, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="library-search__input"
              aria-label="Search companies"
            />
            {search && !searchLoading && (
              <button onClick={() => setSearch('')} className="library-search__clear" aria-label="Clear search">
                <X className="w-5 h-5" />
              </button>
            )}
            {searchLoading && (
              <div className="library-search__spinner" />
            )}
          </div>
        </div>
      </div>

      <div className="library-content">
        <div className="library-filters">
          <div className="library-filters__group">
            <button
              onClick={() => setSort('popular')}
              className={`library-filter ${sort === 'popular' ? 'library-filter--active' : ''}`}
            >
              <TrendingUp className="w-4 h-4" />
              Popular
            </button>
            <button
              onClick={() => setSort('recent')}
              className={`library-filter ${sort === 'recent' ? 'library-filter--active' : ''}`}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
            <button
              onClick={() => setSort('risk-high')}
              className={`library-filter library-filter--danger ${sort === 'risk-high' ? 'library-filter--active' : ''}`}
            >
              <AlertTriangle className="w-4 h-4" />
              High Risk
            </button>
            <button
              onClick={() => setSort('risk-low')}
              className={`library-filter library-filter--success ${sort === 'risk-low' ? 'library-filter--active' : ''}`}
            >
              <Shield className="w-4 h-4" />
              Low Risk
            </button>
          </div>
          
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="library-filters__clear">
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="library-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="library-skeleton">
                <div className="library-skeleton__header">
                  <div className="library-skeleton__badge" />
                  <div className="library-skeleton__grade" />
                </div>
                <div className="library-skeleton__title" />
                <div className="library-skeleton__date" />
                <div className="library-skeleton__tags">
                  <div className="library-skeleton__tag" />
                  <div className="library-skeleton__tag" />
                </div>
                <div className="library-skeleton__footer" />
              </div>
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="library-empty">
            <div className="library-empty__card">
              <Sparkles className="library-empty__icon" />
              <h3 className="library-empty__title">
                {search ? 'No results found' : 'No analyses yet'}
              </h3>
              <p className="library-empty__text">
                {search ? `No analyses matching "${search}"` : 'Be the first to analyze a TOS'}
              </p>
              <Link href="/" className="library-empty__button">
                <FileText className="w-5 h-5" />
                Analyze TOS
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="library-grid">
              {analyses.map((analysis) => (
                <TOSCard key={analysis.id} analysis={analysis} />
              ))}
            </div>

            {hasMore && (
              <div className="library-loadmore">
                <button onClick={loadMore} className="library-loadmore__button">
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
