import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Download, Eye, Loader2 } from "lucide-react";

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
    // Simple file handling - return file name as placeholder
    // In a real implementation, you would upload to your file storage service
    return `file://${file.name}`;
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
      const fileNames = files.map(f => `file://${f.name}`);
      
      if (multiple) {
        const currentFiles = Array.isArray(value) ? value : [];
        onChange([...currentFiles, ...fileNames]);
      } else {
        onChange(fileNames[0]);
      }
    } catch (error) {
      console.error('File handling error:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    if (multiple && Array.isArray(value)) {
      const newFiles = value.filter((_, i) => i !== index);
      onChange(newFiles);
    } else {
      onChange(multiple ? [] : '');
    }
  };

  // Combine uploaded files and currently selected files for display
  const uploadedFiles = multiple 
    ? (Array.isArray(value) ? value : []) 
    : (value ? [value as string] : []);
  
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
            multiple={multiple}
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
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
        
        {displayFiles.length > 0 && (
          <div className="space-y-2">
            {displayFiles.map((url, index) => {
              const isUploading = url.startsWith('uploading://');
              const isPlaceholder = url.startsWith('file://');
              const fileName = url.split('://')[1] || url.split('/').pop() || 'file';
              
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
                        onClick={() => window.open(url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = fileName;
                          a.click();
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}