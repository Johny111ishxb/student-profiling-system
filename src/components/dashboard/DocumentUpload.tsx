import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";

interface DocumentUploadProps {
  studentId: string;
}

const DocumentUpload = ({ studentId }: DocumentUploadProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [studentId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("student_id", studentId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!documentType) {
      toast.error("Please specify document type");
      return;
    }

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${studentId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("documents")
        .insert({
          student_id: studentId,
          document_type: documentType,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully!");
      setDocumentType("");
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Delete from database first
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) {
        console.error("Database delete error:", dbError);
        throw dbError;
      }

      // Then delete from storage
      const { error: storageError } = await supabase.storage
        .from("student-documents")
        .remove([doc.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Don't throw - file might already be deleted
      }

      toast.success("Document deleted successfully!");
      await fetchDocuments(); // Wait for refresh
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete document");
    }
  };

  const handleView = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(doc.file_path, 60);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast.error(error.message || "Failed to view document");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="documentType">Document Type</Label>
        <Input
          id="documentType"
          placeholder="e.g., Birth Certificate, Good Morals"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fileUpload">Upload Document</Label>
        <Input
          id="fileUpload"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleUpload}
          disabled={uploading || !documentType}
        />
        <p className="text-xs text-muted-foreground">
          Accepted formats: PDF, JPG, PNG (Max 5MB)
        </p>
      </div>

      <div className="space-y-2 mt-6">
        <Label>Uploaded Documents</Label>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No documents uploaded yet
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{doc.document_type}</p>
                    <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(doc)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
