import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'http://202.59.208.112:3008/api';

interface FileUploadProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  value?: string | string[];
  onChange: (files: string | string[]) => void;
  fileType: 'agreement_copy' | 'trade_nid_copy';
}

export function FileUpload({ 
  label, 
  accept = ".pdf", 
  multiple = false, 
  value, 
  onChange, 
  fileType 
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.url;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
      throw error; // Re-throw to handle in calling function
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Show files immediately
    if (multiple) {
      setSelectedFiles(prev => [...prev, ...files]);
    } else {
      setSelectedFiles([files[0]]);
    }

    setUploading(true);
    try {
      const uploadPromises = files.map(file => uploadFile(file));
      const fileUrls = await Promise.all(uploadPromises);
      
      // Only update if all uploads succeeded
      if (fileType === 'agreement_copy') {
        // agreement_copy is a single string field
        onChange(fileUrls[0]);
        toast.success('Agreement file uploaded successfully');
      } else {
        // trade_nid_copy is an array field
        const currentFiles = Array.isArray(value) ? value : [];
        onChange([...currentFiles, ...fileUrls]);
        toast.success(`${files.length} file(s) uploaded successfully`);
      }
      
      // Clear selected files after upload
      setSelectedFiles([]);
    } catch (error) {
      console.error('File upload error:', error);
      // Clear selected files on error
      setSelectedFiles([]);
      // Don't update the form data if upload failed
    } finally {
      setUploading(false);
      // Clear the input
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    if (fileType === 'trade_nid_copy' && Array.isArray(value)) {
      const validFiles = value.filter(url => url && typeof url === 'string' && url.startsWith('http'));
      const newFiles = validFiles.filter((_, i) => i !== index);
      onChange(newFiles);
    } else {
      onChange('');
    }
  };

  // Combine uploaded files and currently selected files for display
  const uploadedFiles = fileType === 'trade_nid_copy'
    ? (Array.isArray(value) ? value.filter(url => url && typeof url === 'string' && url.startsWith('http')) : []) 
    : (value && typeof value === 'string' && value.startsWith('http') ? [value as string] : []);
  
  const displayFiles = [...uploadedFiles];
  
  // Add selected files that are being uploaded
  if (uploading && selectedFiles.length > 0) {
    const pendingFiles = selectedFiles.map(f => `uploading://${f.name}`);
    displayFiles.push(...pendingFiles);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept={accept}
            multiple={fileType === 'trade_nid_copy'}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id={`file-${fileType}`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById(`file-${fileType}`)?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
        
        {displayFiles.length > 0 && (
          <div className="space-y-2">
            {displayFiles.map((url, index) => {
              if (!url || typeof url !== 'string') return null;
              
              const isUploading = url.startsWith('uploading://');
              const isPlaceholder = url.startsWith('file://');
              const fileName = url.includes('/') ? url.split('/').pop() || 'file' : url.split('://')[1] || 'file';
              
              return (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span className="flex-1 text-sm truncate">
                    {fileName}
                    {isUploading && <span className="text-muted-foreground ml-1">(uploading...)</span>}
                  </span>
                  {!isUploading && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (url && url.startsWith('http')) {
                            window.open(url, '_blank');
                          } else {
                            console.warn('Cannot view file with invalid URL:', url);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (url && url.startsWith('http')) {
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            a.click();
                          } else {
                            console.warn('Cannot download file with invalid URL:', url);
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            }).filter(Boolean)}
          </div>
        )}
      </div>
    </div>
  );
}