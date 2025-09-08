import React, { useState, useCallback } from 'react';
import { Upload, File, CheckCircle, AlertCircle } from 'lucide-react';

export interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  error?: string | null;
  accept?: string;
  maxSize?: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  isProcessing = false,
  error,
  accept = '.zip',
  maxSize = 100 * 1024 * 1024, // 100MB
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const file = files[0];

      if (file && validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      
      if (file && validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize) {
      alert(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return false;
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please select a .zip file exported from Penpot');
      return false;
    }

    return true;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-uploader">
      <div
        className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.getElementById('file-input') as HTMLInputElement;
          input?.click();
        }}
      >
        <input
          id="file-input"
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />

        {!selectedFile && !isProcessing && (
          <>
            <Upload size={48} style={{ marginBottom: '1rem', opacity: 0.6 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Upload your Penpot design</h3>
            <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
              Drag and drop a .zip file here, or click to select
            </p>
            <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
              Maximum file size: {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </>
        )}

        {selectedFile && !isProcessing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <File size={32} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <CheckCircle size={24} style={{ color: '#51cf66' }} />
          </div>
        )}

        {isProcessing && (
          <div className="loading">
            <div className="spinner" />
            <span>Processing your design...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error">
          <AlertCircle size={20} style={{ marginRight: '0.5rem' }} />
          {error}
        </div>
      )}
    </div>
  );
};