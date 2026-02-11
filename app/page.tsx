'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { countWords } from '@/lib/utils';
import { FloatingLogos } from '@/components/FloatingLogos';

export default function HomePage() {
  const router = useRouter();
  const [tosText, setTosText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [addToLibrary, setAddToLibrary] = useState(false);
  const [companies, setCompanies] = useState<(string | null)[]>([]);

  useEffect(() => {
    fetch('/api/library?sort=popular&limit=50')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCompanies(data.data.analyses.map((a: any) => a.companyName));
        }
      })
      .catch(() => {});
  }, []);

  const wordCount = countWords(tosText);
  const charCount = tosText.length;
  const isValidInput = wordCount >= 10 && wordCount <= 50000;

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF file must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    toast.loading('Uploading and extracting text from PDF...', { id: 'upload' });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast.success(`PDF processed: ${result.data.word_count} words extracted`, { id: 'upload' });
      setTosText(result.data.text);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process PDF', { id: 'upload' });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
  });

  const handleAnalyze = async () => {
    if (!isValidInput) {
      if (wordCount < 10) {
        toast.error('Please enter at least 10 words');
      } else {
        toast.error('Text exceeds 50,000 word limit');
      }
      return;
    }

    setAnalyzing(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 95));
    }, (wordCount / 10000) * 150);

    toast.loading('Analyzing your TOS...', { id: 'analyze' });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: tosText,
          source_type: 'paste',
          add_to_library: !addToLibrary,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      const companyName = result.data.detected_company?.name || 'Unknown Company';
      const confidence = result.data.detected_company?.confidence || 'low';
      
      if (result.data.is_public) {
        toast.success(`Analysis complete! Published as "${companyName}" (${confidence} confidence)`, { id: 'analyze' });
      } else {
        toast.success(`Analysis complete! Company detected: ${companyName}`, { id: 'analyze' });
      }

      router.push(`/analysis/${result.data.id}`);
    } catch (error: any) {
      clearInterval(progressInterval);
      
      if (error.message.includes("doesn't appear to be")) {
        toast.error(error.message, { id: 'analyze', duration: 6000 });
      } else {
        toast.error(error.message || 'Analysis failed. Please try again.', { id: 'analyze' });
      }
    } finally {
      setAnalyzing(false);
      setProgress(0);
    }
  };

  return (
    <main className="home-page">
      <div className="home-page__glow home-page__glow--1" />
      <div className="home-page__glow home-page__glow--2" />

      <FloatingLogos companies={companies} />

      <nav className="home-nav">
        <div className="home-nav__inner">
          <Link href="/" className="home-nav__logo">
            <FileText className="w-6 h-6" />
            <span>FinePrint</span>
          </Link>
          <div className="home-nav__links">
            <Link href="/library" className="home-nav__link">Library</Link>
            <Link href="/about" className="home-nav__link">About</Link>
            <Link href="/privacy" className="home-nav__link">Privacy</Link>
          </div>
        </div>
      </nav>

      <div className="home-content">
        <div className="home-hero">
          <h1 className="home-hero__title">
            Don't Sign Your Rights <span>Away</span>
          </h1>
          <p className="home-hero__subtitle">
            Decode the fine print. Know what you're <span>actually</span> agreeing to.
          </p>
        </div>

        <div className="home-card">
          <button
            onClick={handleAnalyze}
            disabled={!isValidInput || analyzing}
            className="home-button home-button--primary"
          >
            {analyzing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Analyze TOS</span>
              </>
            )}
          </button>

          {analyzing && (
            <div className="home-progress">
              <div className="home-progress__bar">
                <div className="home-progress__fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="home-progress__text">
                {progress < 20 ? 'Validating document...' : 
                 progress < 40 ? 'Detecting company...' :
                 progress < 70 ? 'Analyzing clauses...' : 
                 'Finalizing report...'}
              </p>
            </div>
          )}

          <div className="home-textarea-wrapper">
            <label htmlFor="tos-textarea" className="home-textarea-label">
              Paste your Terms of Service
            </label>
            <textarea
              id="tos-textarea"
              value={tosText}
              onChange={(e) => setTosText(e.target.value)}
              placeholder="Paste your Terms of Service text here..."
              className={`home-textarea ${isValidInput ? 'home-textarea--valid' : ''}`}
              disabled={analyzing}
            />
            <div className="home-counter">
              <span>{wordCount.toLocaleString()} / 50,000 words</span>
              <span>{charCount.toLocaleString()} characters</span>
            </div>
          </div>

          <div className="home-divider">
            <span>OR</span>
          </div>

          <div
            {...getRootProps()}
            className={`home-upload ${isDragActive ? 'home-upload--active' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 home-upload__icon mx-auto" />
            <p className="home-upload__title">
              {isDragActive ? 'Drop PDF here' : 'Upload PDF'}
            </p>
            <p className="home-upload__subtitle">
              Drag & drop or click to browse • Max 10MB
            </p>
          </div>

          <div className="home-library-box">
            <div className="home-library-box__toggle">
              <div className="home-library-box__info">
                <div className="home-library-box__icon">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="home-library-box__title">Share with Community</div>
                  <div className="home-library-box__desc">Help others by adding to our public library</div>
                </div>
              </div>
              <label className="home-toggle">
                <input
                  type="checkbox"
                  checked={!addToLibrary}
                  onChange={(e) => setAddToLibrary(!e.target.checked)}
                  disabled={analyzing}
                />
                <span className="home-toggle__slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
