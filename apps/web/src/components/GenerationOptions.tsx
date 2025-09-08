import React, { useState } from 'react';
import { Settings, Zap, Code, Globe } from 'lucide-react';
import type { GenerationOptions as GenerationOptionsType } from '@fir/react-generator';

export interface GenerationOptionsProps {
  onGenerate: (options: GenerationOptionsType) => void;
  isGenerating?: boolean;
}

export const GenerationOptions: React.FC<GenerationOptionsProps> = ({
  onGenerate,
  isGenerating = false,
}) => {
  const [options, setOptions] = useState<GenerationOptionsType>({
    projectName: '',
    framework: 'react',
    typescript: true,
    spatialNavigation: true,
    cssFramework: undefined,
    stateManagement: 'zustand',
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    
    if (!options.projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    onGenerate(options);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'white',
    fontSize: '0.9rem',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const checkboxStyle: React.CSSProperties = {
    marginRight: '0.5rem',
    transform: 'scale(1.1)',
  };

  return (
    <div className="generation-options">
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          <Settings size={24} style={{ marginRight: '0.75rem' }} />
          <h2>Generation Options</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Project Name */}
          <div>
            <label htmlFor="project-name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Project Name *
            </label>
            <input
              id="project-name"
              type="text"
              value={options.projectName}
              onChange={(e) => setOptions({ ...options, projectName: e.target.value })}
              placeholder="my-spatial-app"
              style={inputStyle}
              disabled={isGenerating}
              required
            />
          </div>

          {/* Framework */}
          <div>
            <label htmlFor="framework" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Framework
            </label>
            <select
              id="framework"
              value={options.framework}
              onChange={(e) => setOptions({ ...options, framework: e.target.value as any })}
              style={selectStyle}
              disabled={isGenerating}
            >
              <option value="react">React</option>
              <option value="vue" disabled>Vue (Coming Soon)</option>
              <option value="vanilla" disabled>Vanilla JS (Coming Soon)</option>
            </select>
          </div>

          {/* TypeScript */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              id="typescript"
              type="checkbox"
              checked={options.typescript}
              onChange={(e) => setOptions({ ...options, typescript: e.target.checked })}
              style={checkboxStyle}
              disabled={isGenerating}
            />
            <label htmlFor="typescript" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Code size={18} style={{ marginRight: '0.5rem' }} />
              Use TypeScript
            </label>
          </div>

          {/* Spatial Navigation */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              id="spatial-nav"
              type="checkbox"
              checked={options.spatialNavigation}
              onChange={(e) => setOptions({ ...options, spatialNavigation: e.target.checked })}
              style={checkboxStyle}
              disabled={isGenerating}
            />
            <label htmlFor="spatial-nav" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Zap size={18} style={{ marginRight: '0.5rem' }} />
              Enable Spatial Navigation
            </label>
          </div>

          {/* CSS Framework */}
          <div>
            <label htmlFor="css-framework" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              CSS Framework (Optional)
            </label>
            <select
              id="css-framework"
              value={options.cssFramework || ''}
              onChange={(e) => setOptions({ ...options, cssFramework: e.target.value || undefined })}
              style={selectStyle}
              disabled={isGenerating}
            >
              <option value="">None</option>
              <option value="tailwind" disabled>Tailwind CSS (Coming Soon)</option>
              <option value="styled-components" disabled>Styled Components (Coming Soon)</option>
              <option value="css-modules" disabled>CSS Modules (Coming Soon)</option>
            </select>
          </div>

          {/* State Management */}
          {options.spatialNavigation && (
            <div>
              <label htmlFor="state-management" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                State Management
              </label>
              <select
                id="state-management"
                value={options.stateManagement || ''}
                onChange={(e) => setOptions({ ...options, stateManagement: e.target.value as any })}
                style={selectStyle}
                disabled={isGenerating}
              >
                <option value="zustand">Zustand</option>
                <option value="redux" disabled>Redux (Coming Soon)</option>
                <option value="context" disabled>React Context (Coming Soon)</option>
              </select>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="submit"
            disabled={isGenerating || !options.projectName.trim()}
            style={{
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              background: isGenerating 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {isGenerating ? (
              <>
                <div className="spinner" />
                Generating...
              </>
            ) : (
              <>
                <Globe size={20} />
                Generate Spatial App
              </>
            )}
          </button>
        </form>

        {options.spatialNavigation && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: 'rgba(102, 126, 234, 0.1)', 
            borderRadius: '8px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <h4 style={{ marginBottom: '0.5rem', color: '#667eea' }}>✨ Spatial Navigation Features</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', opacity: 0.9 }}>
              <li>Infinite zoom from overview to detail</li>
              <li>Smooth fly-to transitions between elements</li>
              <li>Spatial routing with URL deep linking</li>
              <li>High-performance WebGL rendering</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};