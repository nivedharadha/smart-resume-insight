import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, FileText, X, CheckCircle } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  className?: string;
}

const FileUpload = ({
  onFileSelect,
  acceptedTypes = ["application/pdf"],
  maxSizeMB = 10,
  className,
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return "Please upload a PDF file";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB}MB`;
    }
    return null;
  };

  const handleFile = useCallback(
    (selectedFile: File) => {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setFile(selectedFile);
      onFileSelect(selectedFile);
    },
    [onFileSelect, acceptedTypes, maxSizeMB]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer group",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragging && "border-primary bg-primary/10 scale-[1.02]",
          file && "border-success/50 bg-success/5",
          error && "border-destructive/50 bg-destructive/5",
          !file && !error && "border-muted-foreground/20"
        )}
      >
        <input
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="p-8 text-center">
          {file ? (
            <div className="flex items-center justify-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  removeFile();
                }}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
                  "bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110",
                  isDragging && "bg-primary/20 scale-110"
                )}
              >
                {isDragging ? (
                  <FileText className="w-8 h-8 text-primary" />
                ) : (
                  <Upload className="w-8 h-8 text-primary" />
                )}
              </div>
              <p className="font-medium text-foreground mb-1">
                {isDragging ? "Drop your resume here" : "Drag & drop your resume"}
              </p>
              <p className="text-sm text-muted-foreground">
                or <span className="text-primary font-medium">browse files</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                PDF only, max {maxSizeMB}MB
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;