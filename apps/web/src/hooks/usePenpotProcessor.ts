import { useState, useCallback } from 'react';
import { PenpotParser } from '@fir/penpot-parser';
import { ReactGenerator } from '@fir/react-generator';
import type { PenpotFile } from '@fir/penpot-parser';
import type { GenerationOptions, GeneratedProject } from '@fir/react-generator';
import type { GenerationStep } from '../components/GenerationProgress';

export interface ProcessingState {
  isProcessing: boolean;
  currentStep: string | null;
  steps: GenerationStep[];
  error: string | null;
  result: GeneratedProject | null;
}

export const usePenpotProcessor = () => {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    currentStep: null,
    steps: [],
    error: null,
    result: null,
  });

  const createInitialSteps = (): GenerationStep[] => [
    {
      id: 'parse',
      name: 'Parse Penpot File',
      description: 'Extracting design data and assets from your Penpot export',
      status: 'pending',
    },
    {
      id: 'analyze',
      name: 'Analyze Components',
      description: 'Understanding your design structure and elements',
      status: 'pending',
    },
    {
      id: 'generate-components',
      name: 'Generate React Components',
      description: 'Creating functional React components from your designs',
      status: 'pending',
    },
    {
      id: 'generate-spatial',
      name: 'Setup Spatial Navigation',
      description: 'Configuring infinite zoom and smooth transitions',
      status: 'pending',
    },
    {
      id: 'bundle',
      name: 'Bundle Project',
      description: 'Assembling your complete spatial web application',
      status: 'pending',
    },
  ];

  const updateStep = (stepId: string, updates: Partial<GenerationStep>): void => {
    setState(prevState => ({
      ...prevState,
      steps: prevState.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
      currentStep: updates.status === 'processing' ? stepId : prevState.currentStep,
    }));
  };

  const processFile = useCallback(
    async (file: File, options: GenerationOptions): Promise<void> => {
      try {
        const steps = createInitialSteps();
        
        setState({
          isProcessing: true,
          currentStep: null,
          steps,
          error: null,
          result: null,
        });

        const parser = new PenpotParser();
        const generator = new ReactGenerator();

        // Step 1: Parse Penpot File
        updateStep('parse', { status: 'processing', progress: 0 });
        
        let penpotFile: PenpotFile;
        try {
          // Simulate progress for parsing
          for (let i = 0; i <= 100; i += 20) {
            updateStep('parse', { progress: i });
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          penpotFile = await parser.parseFile(file);
          updateStep('parse', { status: 'completed', progress: 100 });
        } catch (error) {
          updateStep('parse', { 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Failed to parse Penpot file'
          });
          throw error;
        }

        // Step 2: Analyze Components
        updateStep('analyze', { status: 'processing', progress: 0 });
        
        try {
          // Simulate analysis
          for (let i = 0; i <= 100; i += 25) {
            updateStep('analyze', { progress: i });
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          updateStep('analyze', { status: 'completed', progress: 100 });
        } catch (error) {
          updateStep('analyze', { 
            status: 'error', 
            error: 'Failed to analyze design components'
          });
          throw error;
        }

        // Step 3: Generate React Components
        updateStep('generate-components', { status: 'processing', progress: 0 });
        
        try {
          // Simulate component generation
          for (let i = 0; i <= 100; i += 10) {
            updateStep('generate-components', { progress: i });
            await new Promise(resolve => setTimeout(resolve, 150));
          }
          
          updateStep('generate-components', { status: 'completed', progress: 100 });
        } catch (error) {
          updateStep('generate-components', { 
            status: 'error', 
            error: 'Failed to generate React components'
          });
          throw error;
        }

        // Step 4: Setup Spatial Navigation (if enabled)
        if (options.spatialNavigation) {
          updateStep('generate-spatial', { status: 'processing', progress: 0 });
          
          try {
            for (let i = 0; i <= 100; i += 20) {
              updateStep('generate-spatial', { progress: i });
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            updateStep('generate-spatial', { status: 'completed', progress: 100 });
          } catch (error) {
            updateStep('generate-spatial', { 
              status: 'error', 
              error: 'Failed to setup spatial navigation'
            });
            throw error;
          }
        } else {
          // Skip spatial navigation step
          updateStep('generate-spatial', { 
            status: 'completed',
            description: 'Spatial navigation disabled - skipped',
            progress: 100
          });
        }

        // Step 5: Bundle Project
        updateStep('bundle', { status: 'processing', progress: 0 });
        
        let project: GeneratedProject;
        try {
          // Generate the actual project
          for (let i = 0; i <= 80; i += 20) {
            updateStep('bundle', { progress: i });
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          project = generator.generateProject(penpotFile, options);
          
          updateStep('bundle', { status: 'completed', progress: 100 });
        } catch (error) {
          updateStep('bundle', { 
            status: 'error', 
            error: 'Failed to bundle project files'
          });
          throw error;
        }

        // Success!
        setState(prevState => ({
          ...prevState,
          isProcessing: false,
          currentStep: null,
          result: project,
        }));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        
        setState(prevState => ({
          ...prevState,
          isProcessing: false,
          currentStep: null,
          error: errorMessage,
        }));
      }
    },
    []
  );

  const reset = useCallback((): void => {
    setState({
      isProcessing: false,
      currentStep: null,
      steps: [],
      error: null,
      result: null,
    });
  }, []);

  return {
    ...state,
    processFile,
    reset,
  };
};