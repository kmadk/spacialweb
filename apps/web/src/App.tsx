import React, { useState } from 'react';
import { Zap, Github, BookOpen } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { GenerationOptions } from './components/GenerationOptions';
import { GenerationProgress } from './components/GenerationProgress';
import { GenerationResults } from './components/GenerationResults';
import { usePenpotProcessor } from './hooks/usePenpotProcessor';
import type { GenerationOptions as GenerationOptionsType } from '@fir/react-generator';

type AppState = 'upload' | 'options' | 'processing' | 'results';

function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const processor = usePenpotProcessor();

  const handleFileSelect = (file: File): void => {
    setUploadedFile(file);
    setAppState('options');
  };

  const handleGenerate = async (options: GenerationOptionsType): Promise<void> => {
    if (!uploadedFile) return;

    setAppState('processing');
    await processor.processFile(uploadedFile, options);
    
    // Wait a moment then show results
    setTimeout(() => {
      if (processor.result) {
        setAppState('results');
      }
    }, 500);
  };

  const handleStartOver = (): void => {
    setAppState('upload');
    setUploadedFile(null);
    processor.reset();
  };

  const renderHeader = (): React.ReactNode => (
    <header style={{ textAlign: 'center', padding: '2rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        <Zap size={32} style={{ marginRight: '0.75rem', color: '#667eea' }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          FIR Spatial
        </h1>
      </div>
      <p style={{ fontSize: '1.1rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
        Transform your Penpot designs into spatial web applications with infinite zoom, 
        smooth transitions, and generated React components.
      </p>
      
      {appState === 'upload' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <a 
            href="https://github.com/your-org/fir-spatial" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
          >
            <Github size={16} />
            GitHub
          </a>
          <a 
            href="https://docs.fir-spatial.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: 'rgba(255, 255, 255, 0.7)', 
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
          >
            <BookOpen size={16} />
            Documentation
          </a>
        </div>
      )}
    </header>
  );

  const renderContent = (): React.ReactNode => {
    switch (appState) {
      case 'upload':
        return (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <FileUploader onFileSelect={handleFileSelect} />
            
            {/* How it works */}
            <div className="card" style={{ marginTop: '3rem' }}>
              <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>How it works</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                  <h4 style={{ marginBottom: '0.5rem' }}>1. Upload</h4>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Export your design from Penpot as a .zip file and upload it here</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
                  <h4 style={{ marginBottom: '0.5rem' }}>2. Configure</h4>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Choose your framework, enable spatial navigation, and customize options</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚀</div>
                  <h4 style={{ marginBottom: '0.5rem' }}>3. Generate</h4>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Get a fully functional web app with your designs and spatial navigation</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'options':
        return (
          <GenerationOptions 
            onGenerate={handleGenerate}
            isGenerating={processor.isProcessing}
          />
        );

      case 'processing':
        return (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <GenerationProgress 
              steps={processor.steps}
              currentStep={processor.currentStep}
            />
            
            {processor.error && (
              <div className="error" style={{ marginTop: '2rem' }}>
                <h4>Generation Failed</h4>
                <p>{processor.error}</p>
                <button 
                  onClick={handleStartOver}
                  style={{ marginTop: '1rem' }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        );

      case 'results':
        return processor.result ? (
          <GenerationResults 
            project={processor.result}
            onStartOver={handleStartOver}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '1rem' }}>
      {renderHeader()}
      <main>{renderContent()}</main>
      
      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '2rem 0', marginTop: '4rem' }}>
        <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
          Built with ❤️ for the design-to-code community
        </p>
      </footer>
    </div>
  );
}

export default App;