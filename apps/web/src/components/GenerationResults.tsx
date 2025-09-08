import React, { useState } from 'react';
import { Download, Eye, Code, Folder, ExternalLink, Copy, Check } from 'lucide-react';
import type { GeneratedProject } from '@fir/react-generator';

export interface GenerationResultsProps {
  project: GeneratedProject;
  onStartOver: () => void;
}

export const GenerationResults: React.FC<GenerationResultsProps> = ({
  project,
  onStartOver,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'preview'>('overview');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const handleDownload = (): void => {
    // Create a zip file with all the generated files
    const zip = new (window as any).JSZip();
    
    // Add all files to the zip
    project.files.forEach(file => {
      zip.file(file.path, file.content);
    });

    // Add assets
    project.assets.forEach(asset => {
      zip.file(asset.outputPath, asset.data);
    });

    // Generate and download the zip
    zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.metadata.generatedAt.split('T')[0]}-spatial-app.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleCopyFile = async (file: any): Promise<void> => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedFile(file.path);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (error) {
      console.error('Failed to copy file content:', error);
    }
  };

  const getFileIcon = (fileName: string): React.ReactNode => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) {
      return <Code size={16} style={{ color: '#3178c6' }} />;
    }
    if (fileName.endsWith('.json')) {
      return <Code size={16} style={{ color: '#f1c40f' }} />;
    }
    if (fileName.endsWith('.html')) {
      return <Code size={16} style={{ color: '#e34c26' }} />;
    }
    if (fileName.endsWith('.css')) {
      return <Code size={16} style={{ color: '#1572b6' }} />;
    }
    return <Folder size={16} />;
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s',
    fontWeight: isActive ? '600' : '400',
  });

  return (
    <div className="generation-results">
      <div className="success" style={{ margin: '2rem auto', maxWidth: '800px' }}>
        <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
          <Check size={24} style={{ marginRight: '0.75rem' }} />
          Your spatial app is ready!
        </h2>
        <p>
          Generated {project.files.length} files with {project.metadata.totalComponents} components
          {project.metadata.spatialEngine && ' and spatial navigation'}
        </p>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={tabStyle(activeTab === 'overview')}
          >
            <Eye size={16} style={{ marginRight: '0.5rem' }} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('files')}
            style={tabStyle(activeTab === 'files')}
          >
            <Folder size={16} style={{ marginRight: '0.5rem' }} />
            Files ({project.files.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            style={tabStyle(activeTab === 'preview')}
          >
            <Code size={16} style={{ marginRight: '0.5rem' }} />
            Preview
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Framework</h4>
                <p style={{ opacity: 0.8 }}>{project.metadata.framework}</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Components</h4>
                <p style={{ opacity: 0.8 }}>{project.metadata.totalComponents}</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Pages</h4>
                <p style={{ opacity: 0.8 }}>{project.metadata.totalPages}</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Spatial Engine</h4>
                <p style={{ opacity: 0.8 }}>{project.metadata.spatialEngine ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Next Steps</h3>
              <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li>Download the generated project files</li>
                <li>Extract the zip file to your desired location</li>
                <li>Run <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>npm install</code> to install dependencies</li>
                <li>Run <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>npm run dev</code> to start the development server</li>
                <li>Open your browser and start exploring your spatial app!</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div>
            <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '1rem' }}>
              {project.files.map((file, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {getFileIcon(file.path)}
                    <span style={{ marginLeft: '0.75rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {file.path}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyFile(file)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {copiedFile === file.path ? (
                      <>
                        <Check size={12} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
              Click "Copy" to copy file contents to clipboard
            </p>
          </div>
        )}

        {activeTab === 'preview' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>App.tsx</h4>
              <pre
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1rem',
                  borderRadius: '6px',
                  overflow: 'auto',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                  maxHeight: '300px',
                }}
              >
                <code>{project.files.find(f => f.path === 'src/App.tsx')?.content || 'File not found'}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={handleDownload}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <Download size={20} />
            Download Project
          </button>
          
          <button
            onClick={onStartOver}
            style={{
              padding: '1rem 2rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
};