import React from 'react';
import { CheckCircle, Circle, Loader } from 'lucide-react';

export interface GenerationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

export interface GenerationProgressProps {
  steps: GenerationStep[];
  currentStep?: string;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  steps,
  currentStep,
}) => {
  const getStepIcon = (step: GenerationStep): React.ReactNode => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle size={20} style={{ color: '#51cf66' }} />;
      case 'processing':
        return <Loader size={20} className="spinner" />;
      case 'error':
        return <Circle size={20} style={{ color: '#ff6b6b' }} />;
      default:
        return <Circle size={20} style={{ opacity: 0.3 }} />;
    }
  };

  const getStepColor = (step: GenerationStep): string => {
    switch (step.status) {
      case 'completed':
        return '#51cf66';
      case 'processing':
        return '#74b9ff';
      case 'error':
        return '#ff6b6b';
      default:
        return 'rgba(255, 255, 255, 0.3)';
    }
  };

  return (
    <div className="generation-progress">
      <h3 style={{ marginBottom: '2rem', textAlign: 'center' }}>
        Generating your spatial app...
      </h3>

      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '1.5rem',
              position: 'relative',
            }}
          >
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '30px',
                  width: '1px',
                  height: '24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
            )}

            {/* Step icon */}
            <div
              style={{
                marginRight: '1rem',
                flexShrink: 0,
                zIndex: 1,
                background: '#242424',
                padding: '2px',
              }}
            >
              {getStepIcon(step)}
            </div>

            {/* Step content */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.25rem',
                }}
              >
                <h4
                  style={{
                    color: getStepColor(step),
                    fontWeight: '500',
                    fontSize: '0.9rem',
                  }}
                >
                  {step.name}
                </h4>
                {step.progress !== undefined && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      opacity: 0.6,
                    }}
                  >
                    {Math.round(step.progress)}%
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: '0.8rem',
                  opacity: 0.7,
                  marginBottom: '0.5rem',
                }}
              >
                {step.description}
              </p>

              {/* Progress bar for current step */}
              {step.status === 'processing' && step.progress !== undefined && (
                <div className="progress-bar" style={{ height: '4px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              )}

              {/* Error message */}
              {step.status === 'error' && step.error && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#ff6b6b',
                    marginTop: '0.25rem',
                  }}
                >
                  {step.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};