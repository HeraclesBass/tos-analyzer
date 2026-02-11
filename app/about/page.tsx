'use client';

import Link from 'next/link';
import { FileText, Zap, Shield, Eye, Code, AlertTriangle, ExternalLink, ChevronRight, Cpu, Database, Server } from 'lucide-react';

export default function AboutPage() {
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
            <Link href="/about" className="static-nav__link static-nav__link--active">About</Link>
            <Link href="/privacy" className="static-nav__link">Privacy</Link>
          </div>
        </div>
      </nav>

      <div className="static-hero">
        <div className="static-hero__glow static-hero__glow--1" />
        <div className="static-hero__glow static-hero__glow--2" />
        <div className="static-hero__content">
          <h1 className="static-hero__title">About FinePrint</h1>
          <p className="static-hero__subtitle">
            Making legal jargon understandable for everyone
          </p>
        </div>
      </div>

      <div className="static-content">
        <section className="static-section">
          <div className="static-card static-card--highlight">
            <div className="static-card__icon static-card__icon--blue">
              <Zap className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">What is FinePrint?</h2>
            <p className="static-card__text">
              FinePrint is an AI-powered Terms of Service analyzer that transforms dense legal 
              documents into clear, actionable insights. Our tool scans TOS agreements and 
              highlights concerning clauses, categorizing them by risk level so you know exactly 
              what you're agreeing to.
            </p>
            <div className="static-card__badges">
              <span className="static-badge static-badge--safe">
                <Shield className="w-4 h-4" /> Safe Clauses
              </span>
              <span className="static-badge static-badge--concerning">
                <Eye className="w-4 h-4" /> Concerning Terms
              </span>
              <span className="static-badge static-badge--critical">
                <AlertTriangle className="w-4 h-4" /> Critical Issues
              </span>
            </div>
          </div>
        </section>

        <section className="static-section">
          <h2 className="static-section__title">How It Works</h2>
          <div className="static-steps">
            <div className="static-step">
              <div className="static-step__number">1</div>
              <div className="static-step__content">
                <h3>Paste Your TOS</h3>
                <p>Copy and paste the Terms of Service text, or upload a PDF document up to 10MB.</p>
              </div>
            </div>
            <div className="static-step__arrow">
              <ChevronRight className="w-6 h-6" />
            </div>
            <div className="static-step">
              <div className="static-step__number">2</div>
              <div className="static-step__content">
                <h3>AI Analysis</h3>
                <p>Google's Gemini AI reads and analyzes every clause, identifying potential risks and concerns.</p>
              </div>
            </div>
            <div className="static-step__arrow">
              <ChevronRight className="w-6 h-6" />
            </div>
            <div className="static-step">
              <div className="static-step__number">3</div>
              <div className="static-step__content">
                <h3>Get Results</h3>
                <p>Receive a color-coded breakdown with plain-English explanations of what each clause means.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card">
            <div className="static-card__icon static-card__icon--purple">
              <Eye className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">Why We Built This</h2>
            <p className="static-card__text">
              Let's be honest: most people click "I Agree" without reading a single word. And who can 
              blame them? The average Terms of Service is over 7,500 words—that's longer than many 
              short stories. Companies know this and sometimes hide concerning clauses in that wall of text.
            </p>
            <p className="static-card__text">
              We believe transparency matters. Everyone deserves to know what rights they're giving up, 
              what data is being collected, and what they're actually agreeing to—without needing a law 
              degree to understand it.
            </p>
          </div>
        </section>

        <section className="static-section">
          <h2 className="static-section__title">Tech Stack</h2>
          <div className="static-tech-grid">
            <div className="static-tech">
              <Cpu className="w-5 h-5" />
              <span>Google Gemini AI</span>
            </div>
            <div className="static-tech">
              <Code className="w-5 h-5" />
              <span>Next.js 14</span>
            </div>
            <div className="static-tech">
              <Database className="w-5 h-5" />
              <span>PostgreSQL</span>
            </div>
            <div className="static-tech">
              <Server className="w-5 h-5" />
              <span>Redis Cache</span>
            </div>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card static-card--warning">
            <div className="static-card__icon static-card__icon--amber">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">Important Limitations</h2>
            <ul className="static-list">
              <li>
                <strong>Not Legal Advice:</strong> FinePrint is an educational tool, not a law firm. 
                Our analysis should not be treated as legal counsel.
              </li>
              <li>
                <strong>AI Limitations:</strong> While our AI is powerful, it can make mistakes. 
                It may miss nuances or misinterpret complex legal language.
              </li>
              <li>
                <strong>Context Matters:</strong> The same clause might be acceptable in one context 
                and concerning in another. Use your judgment.
              </li>
              <li>
                <strong>Professional Guidance:</strong> For important decisions involving legal agreements, 
                always consult with a qualified attorney.
              </li>
            </ul>
          </div>
        </section>

        <section className="static-section">
          <div className="static-card static-card--highlight">
            <div className="static-card__icon static-card__icon--green">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="static-card__title">About the Creator</h2>
            <p className="static-card__text">
              FinePrint was built by Hercules as part of the{' '}
              <a href="https://herakles.dev" target="_blank" rel="noopener noreferrer" className="static-link">
                Herakles.dev <ExternalLink className="w-4 h-4 inline" />
              </a>{' '}
              portfolio—a collection of AI-powered tools designed to make technology more accessible 
              and transparent for everyone.
            </p>
          </div>
        </section>

        <div className="static-cta">
          <h3>Ready to decode your first TOS?</h3>
          <Link href="/" className="static-button">
            <Zap className="w-5 h-5" />
            Start Analyzing
          </Link>
        </div>
      </div>
    </main>
  );
}
