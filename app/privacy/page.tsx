'use client';

import Link from 'next/link';
import { FileText, Database, Shield, Clock, Users, Mail, ExternalLink, XCircle, CheckCircle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main className="static-page">
      <nav className="static-nav">
        <div className="static-nav__inner">
          <Link href="/" className="static-nav__logo">
            <FileText className="w-6 h-6" />
            <span>FinePrint</span>
          </Link>
          <div className="static-nav__links">
            <Link href="/" className="static-nav__link">Home</Link>
            <Link href="/library" className="static-nav__link">Library</Link>
            <Link href="/about" className="static-nav__link">About</Link>
            <Link href="/privacy" className="static-nav__link static-nav__link--active">Privacy</Link>
          </div>
        </div>
      </nav>

      <div className="static-hero">
        <div className="static-hero__glow static-hero__glow--1" />
        <div className="static-hero__glow static-hero__glow--2" />
        <div className="static-hero__content">
          <h1 className="static-hero__title">Privacy Policy</h1>
          <p className="static-hero__subtitle">
            We practice what we preach—here's exactly what we do with your data
          </p>
        </div>
      </div>

      <div className="static-content">
        <section className="static-section">
          <div className="static-card">
            <div className="static-card__icon static-card__icon--blue">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">What We Collect</h2>
            <ul className="static-list static-list--spaced">
              <li>
                <strong>TOS Text:</strong> The Terms of Service text you submit for analysis. 
                This is processed by our AI and temporarily stored to generate your report.
              </li>
              <li>
                <strong>Company Names:</strong> If you choose to share your analysis with the 
                community library, the detected company name is stored publicly.
              </li>
              <li>
                <strong>View Counts:</strong> We track anonymous view counts on public analyses 
                to show popularity.
              </li>
            </ul>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card static-card--highlight">
            <div className="static-card__icon static-card__icon--green">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">What We DON'T Collect</h2>
            <div className="static-no-collect">
              <div className="static-no-item">
                <CheckCircle className="w-5 h-5" />
                <span>No personal information or accounts</span>
              </div>
              <div className="static-no-item">
                <CheckCircle className="w-5 h-5" />
                <span>No email addresses</span>
              </div>
              <div className="static-no-item">
                <CheckCircle className="w-5 h-5" />
                <span>No tracking cookies</span>
              </div>
              <div className="static-no-item">
                <CheckCircle className="w-5 h-5" />
                <span>No third-party analytics (Google Analytics, etc.)</span>
              </div>
              <div className="static-no-item">
                <CheckCircle className="w-5 h-5" />
                <span>No advertising trackers</span>
              </div>
              <div className="static-no-item">
                <CheckCircle className="w-5 h-5" />
                <span>No selling or sharing data with third parties</span>
              </div>
            </div>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card">
            <div className="static-card__icon static-card__icon--purple">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">Data Retention</h2>
            <ul className="static-list static-list--spaced">
              <li>
                <strong>Private Analyses:</strong> Analyses not shared to the library are stored 
                for 30 days, then automatically deleted.
              </li>
              <li>
                <strong>Cached Results:</strong> We use Redis caching to improve performance. 
                Cached data is temporary and automatically expires.
              </li>
              <li>
                <strong>Public Library:</strong> Analyses shared to the community library are 
                stored indefinitely to benefit other users.
              </li>
            </ul>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card">
            <div className="static-card__icon static-card__icon--amber">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">Third-Party Services</h2>
            <p className="static-card__text">
              To analyze your TOS documents, we use Google's Gemini AI. When you submit text for 
              analysis, it is sent to Google's servers for processing.
            </p>
            <p className="static-card__text">
              Please review{' '}
              <a 
                href="https://policies.google.com/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="static-link"
              >
                Google's Privacy Policy <ExternalLink className="w-4 h-4 inline" />
              </a>{' '}
              to understand how they handle data.
            </p>
            <p className="static-card__text static-card__text--note">
              Note: Google Gemini processes text but does not store it for training purposes when 
              used through their API.
            </p>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card">
            <div className="static-card__icon static-card__icon--blue">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">Community Library</h2>
            <ul className="static-list static-list--spaced">
              <li>
                <strong>Public by Choice:</strong> Sharing to the library is optional and opt-in. 
                By default, analyses can be shared unless you toggle the option off.
              </li>
              <li>
                <strong>Permanent Records:</strong> Once shared, analyses become part of our public 
                database to help other users research companies.
              </li>
              <li>
                <strong>No Personal Data:</strong> Public analyses contain only the company name, 
                risk assessment, and clause analysis—no information about who submitted it.
              </li>
            </ul>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card static-card--highlight">
            <div className="static-card__icon static-card__icon--green">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">Contact & Data Removal</h2>
            <p className="static-card__text">
              To request removal of a public analysis or ask questions about this policy, 
              email us at{' '}
              <a 
                href="mailto:hello@herakles.dev"
                className="static-link"
              >
                hello@herakles.dev
              </a>.
            </p>
            <p className="static-card__text static-card__text--note">
              Include the company name and analysis URL in your request for faster processing.
            </p>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card static-card--muted">
            <h2 className="static-card__title">Updates to This Policy</h2>
            <p className="static-card__text">
              We may update this privacy policy from time to time. Changes will be reflected on 
              this page with an updated revision date.
            </p>
            <p className="static-card__meta">
              Last updated: December 2025
            </p>
          </div>
        </section>

        <div className="static-cta">
          <h3>Questions about privacy?</h3>
          <p className="static-cta__text">
            If you have concerns, feel free to analyze our own Terms of Service!
          </p>
          <Link href="/" className="static-button static-button--secondary">
            <FileText className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
