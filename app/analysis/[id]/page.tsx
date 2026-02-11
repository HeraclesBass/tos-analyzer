'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  FileText, 
  Share2, 
  Download, 
  Home, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Shield,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ShareableAnalysis, Category, Clause } from '@/lib/types';
import { cn } from '@/lib/utils';

const KNOWN_DOMAINS: Record<string, string> = {
  'google': 'google.com',
  'facebook': 'facebook.com',
  'meta': 'meta.com',
  'amazon': 'amazon.com',
  'apple': 'apple.com',
  'microsoft': 'microsoft.com',
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'twitter': 'twitter.com',
  'x': 'x.com',
  'linkedin': 'linkedin.com',
  'instagram': 'instagram.com',
  'whatsapp': 'whatsapp.com',
  'tiktok': 'tiktok.com',
  'snapchat': 'snapchat.com',
  'discord': 'discord.com',
  'slack': 'slack.com',
  'zoom': 'zoom.com',
  'zoom communications': 'zoom.com',
  'dropbox': 'dropbox.com',
  'adobe': 'adobe.com',
  'salesforce': 'salesforce.com',
  'shopify': 'shopify.com',
  'stripe': 'stripe.com',
  'paypal': 'paypal.com',
  'uber': 'uber.com',
  'airbnb': 'airbnb.com',
  'reddit': 'reddit.com',
  'pinterest': 'pinterest.com',
  'twitch': 'twitch.tv',
  'github': 'github.com',
  'gitlab': 'gitlab.com',
  'atlassian': 'atlassian.com',
  'jira': 'atlassian.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'canva': 'canva.com',
  'openai': 'openai.com',
  'anthropic': 'anthropic.com',
  'oracle': 'oracle.com',
  'ibm': 'ibm.com',
  'samsung': 'samsung.com',
  'sony': 'sony.com',
  'nintendo': 'nintendo.com',
  'steam': 'steampowered.com',
  'epic': 'epicgames.com',
  'walmart': 'walmart.com',
  'target': 'target.com',
  'ebay': 'ebay.com',
  'etsy': 'etsy.com',
  'doordash': 'doordash.com',
  'grubhub': 'grubhub.com',
  'lyft': 'lyft.com',
  'jibe': 'jibe.com',
  'jibe mobile': 'jibe.com',
};

function getCompanyDomain(companyName: string | null): string | null {
  if (!companyName) return null;
  const normalized = companyName.toLowerCase().trim();
  if (KNOWN_DOMAINS[normalized]) return KNOWN_DOMAINS[normalized];
  for (const [key, domain] of Object.entries(KNOWN_DOMAINS)) {
    if (normalized.includes(key) || key.includes(normalized)) return domain;
  }
  const words = normalized.split(/\s+/);
  if (words.length > 0) {
    const firstWord = words[0].replace(/[^a-z0-9]/g, '');
    if (firstWord.length > 2) return `${firstWord}.com`;
  }
  return null;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getGradientForName(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

interface FlattenedClause extends Clause {
  categoryName: string;
  id: string;
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [analysis, setAnalysis] = useState<ShareableAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'severity' | 'category'>('severity');
  const [companyName, setCompanyName] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAnalysis(id);
    }
  }, [id]);

  const fetchAnalysis = async (analysisId: string) => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Analysis not found or expired');
        } else {
          toast.error('Failed to load analysis');
        }
        router.push('/');
        return;
      }

      const result = await response.json();
      setAnalysis(result.data);
      
      if (result.data.company_name) {
        setCompanyName(result.data.company_name);
        setIsPublished(result.data.is_public || false);
      }
    } catch (error) {
      toast.error('Failed to load analysis');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const flattenedAndSortedClauses = useMemo(() => {
    if (!analysis?.analysis?.categories) return [];
    
    const flattened: FlattenedClause[] = [];
    analysis.analysis.categories.forEach((category) => {
      category.clauses.forEach((clause, idx) => {
        flattened.push({
          ...clause,
          categoryName: category.name,
          id: `${category.name}-${idx}`
        });
      });
    });

    const severityOrder = { critical: 0, concerning: 1, safe: 2 };
    return flattened.sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );
  }, [analysis]);

  const toggleClause = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId);
    } else {
      newExpanded.add(clauseId);
    }
    setExpandedClauses(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set(flattenedAndSortedClauses.map(c => c.id));
    setExpandedClauses(allIds);
  };

  const collapseAll = () => {
    setExpandedClauses(new Set());
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/analysis/${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleExport = async () => {
    toast.loading('Generating PDF...', { id: 'export' });
    try {
      const response = await fetch(`/api/export/${id}`);
      if (!response.ok) throw new Error('Export failed');
      toast.success('Download feature coming soon!', { id: 'export' });
    } catch (error) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-300">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis || !analysis.analysis) return null;

  const { summary, categories } = analysis.analysis;
  if (!summary || !categories) return null;
  
  const riskScore = Math.round(
    (summary.red_count * 10 + summary.yellow_count * 3 - summary.green_count + 50)
  );

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'CRITICAL',
          cardClass: 'analysis-card--critical',
          badgeClass: 'analysis-badge--critical',
          borderClass: 'border-l-critical-500'
        };
      case 'concerning':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'CONCERNING',
          cardClass: 'analysis-card--concerning',
          badgeClass: 'analysis-badge--concerning',
          borderClass: 'border-l-concerning-500'
        };
      default:
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'SAFE',
          cardClass: 'analysis-card--safe',
          badgeClass: 'analysis-badge--safe',
          borderClass: 'border-l-safe-500'
        };
    }
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'low': return 'analysis-risk--low';
      case 'medium': return 'analysis-risk--medium';
      case 'high': return 'analysis-risk--high';
      default: return '';
    }
  };

  const criticalClauses = flattenedAndSortedClauses.filter(c => c.severity === 'critical');
  const concerningClauses = flattenedAndSortedClauses.filter(c => c.severity === 'concerning');
  const safeClauses = flattenedAndSortedClauses.filter(c => c.severity === 'safe');

  return (
    <main className="analysis-page">
      <div className="analysis-header">
        <div className="analysis-header__inner">
          <div className="analysis-header__left">
            <div className="analysis-header__risk">
              <Shield className="w-5 h-5 text-primary-400" />
              <span className="analysis-header__score">{riskScore}</span>
              <span className="analysis-header__max">/100</span>
              <span className={cn('analysis-header__badge', getRiskBadgeClass(summary.overall_risk))}>
                {summary.overall_risk.toUpperCase()} RISK
              </span>
            </div>
            <div className="analysis-header__counts">
              <span className="analysis-count analysis-count--critical">
                <AlertTriangle className="w-3.5 h-3.5" />
                {summary.red_count}
              </span>
              <span className="analysis-count analysis-count--concerning">
                <AlertCircle className="w-3.5 h-3.5" />
                {summary.yellow_count}
              </span>
              <span className="analysis-count analysis-count--safe">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {summary.green_count}
              </span>
            </div>
          </div>
          <div className="analysis-header__actions">
            <button onClick={handleShare} className="analysis-btn analysis-btn--secondary">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button onClick={handleExport} className="analysis-btn analysis-btn--secondary">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={() => router.push('/')} className="analysis-btn analysis-btn--primary">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>
      </div>

      {analysis.company_name && (
        <div className="analysis-hero">
          <div className="analysis-hero__inner">
            <div className="analysis-hero__logo">
              {!logoError && getCompanyDomain(analysis.company_name) ? (
                <Image
                  src={`https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${getCompanyDomain(analysis.company_name)}&size=128`}
                  alt={`${analysis.company_name} logo`}
                  width={80}
                  height={80}
                  className="analysis-hero__logo-img"
                  onError={() => setLogoError(true)}
                  unoptimized
                />
              ) : (
                <div 
                  className="analysis-hero__logo-initials"
                  style={{ background: getGradientForName(analysis.company_name) }}
                >
                  {getInitials(analysis.company_name)}
                </div>
              )}
            </div>
            <div className="analysis-hero__info">
              <h1 className="analysis-hero__title">{analysis.company_name}</h1>
              <p className="analysis-hero__subtitle">Terms of Service Analysis</p>
            </div>
          </div>
        </div>
      )}

      <div className="analysis-content">
        {summary.key_takeaways.length > 0 && (
          <div className="analysis-takeaways">
            <h2 className="analysis-takeaways__title">
              <Eye className="w-4 h-4" />
              Key Takeaways
            </h2>
            <ul className="analysis-takeaways__list">
              {summary.key_takeaways.map((takeaway, idx) => (
                <li key={idx} className="analysis-takeaways__item">{takeaway}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="analysis-toolbar">
          <div className="analysis-toolbar__tabs">
            <button 
              onClick={() => setViewMode('severity')}
              className={cn('analysis-tab', viewMode === 'severity' && 'analysis-tab--active')}
            >
              By Severity
            </button>
            <button 
              onClick={() => setViewMode('category')}
              className={cn('analysis-tab', viewMode === 'category' && 'analysis-tab--active')}
            >
              By Category
            </button>
          </div>
          <div className="analysis-toolbar__actions">
            <button onClick={expandAll} className="analysis-toolbar__btn">Expand All</button>
            <button onClick={collapseAll} className="analysis-toolbar__btn">Collapse All</button>
          </div>
        </div>

        {viewMode === 'severity' ? (
          <div className="analysis-sections">
            {criticalClauses.length > 0 && (
              <div className="analysis-section">
                <h3 className="analysis-section__title analysis-section__title--critical">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Issues ({criticalClauses.length})
                </h3>
                <div className="analysis-list">
                  {criticalClauses.map((clause) => (
                    <ClauseCard
                      key={clause.id}
                      clause={clause}
                      isExpanded={expandedClauses.has(clause.id)}
                      onToggle={() => toggleClause(clause.id)}
                      config={getSeverityConfig(clause.severity)}
                    />
                  ))}
                </div>
              </div>
            )}

            {concerningClauses.length > 0 && (
              <div className="analysis-section">
                <h3 className="analysis-section__title analysis-section__title--concerning">
                  <AlertCircle className="w-5 h-5" />
                  Concerning Items ({concerningClauses.length})
                </h3>
                <div className="analysis-list">
                  {concerningClauses.map((clause) => (
                    <ClauseCard
                      key={clause.id}
                      clause={clause}
                      isExpanded={expandedClauses.has(clause.id)}
                      onToggle={() => toggleClause(clause.id)}
                      config={getSeverityConfig(clause.severity)}
                    />
                  ))}
                </div>
              </div>
            )}

            {safeClauses.length > 0 && (
              <div className="analysis-section">
                <h3 className="analysis-section__title analysis-section__title--safe">
                  <CheckCircle2 className="w-5 h-5" />
                  Safe Clauses ({safeClauses.length})
                </h3>
                <div className="analysis-list">
                  {safeClauses.map((clause) => (
                    <ClauseCard
                      key={clause.id}
                      clause={clause}
                      isExpanded={expandedClauses.has(clause.id)}
                      onToggle={() => toggleClause(clause.id)}
                      config={getSeverityConfig(clause.severity)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="analysis-sections">
            {categories.map((category) => (
              <div key={category.name} className="analysis-section">
                <h3 className="analysis-section__title">
                  {category.name} ({category.clauses.length})
                </h3>
                <div className="analysis-list">
                  {category.clauses
                    .slice()
                    .sort((a, b) => {
                      const order = { critical: 0, concerning: 1, safe: 2 };
                      return order[a.severity] - order[b.severity];
                    })
                    .map((clause, idx) => {
                      const clauseId = `${category.name}-${idx}`;
                      return (
                        <ClauseCard
                          key={clauseId}
                          clause={{ ...clause, categoryName: category.name, id: clauseId }}
                          isExpanded={expandedClauses.has(clauseId)}
                          onToggle={() => toggleClause(clauseId)}
                          config={getSeverityConfig(clause.severity)}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}

        {analysis.is_public && (
          <div className="analysis-published">
            <div className="analysis-published__info">
              <span className="analysis-published__label">Published to Library</span>
              <span className="analysis-published__company">{analysis.company_name || 'Unknown'}</span>
            </div>
            <a href="/library" className="analysis-btn analysis-btn--primary">
              View in Library
            </a>
          </div>
        )}

        <div className="analysis-footer">
          <span>Created: {new Date(analysis.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>Expires: {new Date(analysis.expires_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>{analysis.word_count.toLocaleString()} words analyzed</span>
        </div>
      </div>
    </main>
  );
}

interface ClauseCardProps {
  clause: FlattenedClause;
  isExpanded: boolean;
  onToggle: () => void;
  config: {
    icon: React.ReactNode;
    label: string;
    cardClass: string;
    badgeClass: string;
    borderClass: string;
  };
}

function ClauseCard({ clause, isExpanded, onToggle, config }: ClauseCardProps) {
  return (
    <div className={cn('analysis-card', config.cardClass)}>
      <div className="analysis-card__header" onClick={onToggle}>
        <div className="analysis-card__left">
          <span className={cn('analysis-badge', config.badgeClass)}>
            {config.icon}
            {config.label}
          </span>
          <span className="analysis-card__category">{clause.categoryName}</span>
        </div>
        <button className="analysis-card__toggle">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      
      <p className="analysis-card__explanation">{clause.explanation}</p>
      
      {isExpanded && (
        <div className="analysis-card__details">
          <div className="analysis-detail">
            <span className="analysis-detail__label">Original Clause</span>
            <div className="analysis-detail__content analysis-detail__content--quote">
              {clause.original_text}
              {clause.quote_reference && (
                <span className="analysis-detail__ref">Ref: {clause.quote_reference}</span>
              )}
            </div>
          </div>
          <div className="analysis-detail">
            <span className="analysis-detail__label">Why This Matters</span>
            <div className="analysis-detail__content analysis-detail__content--matter">
              {clause.why_this_matters}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
