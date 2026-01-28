import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StudentListProps {
  onUpdate: () => void;
}

const StudentList = ({ onUpdate }: StudentListProps) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("student_id", studentId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleViewStudent = (student: any) => {
    setSelectedStudent(student);
    setDocuments([]); // Clear old documents
    fetchDocuments(student.id);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", studentId);

      if (error) throw error;

      toast.success("Student deleted successfully!");
      fetchStudents();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete student");
    }
  };

  const handleUpdateStatus = async (studentId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", studentId);

      if (error) throw error;

      toast.success(`Status updated to ${newStatus}`);

      // Update the selected student state
      setSelectedStudent((prev: any) => prev ? { ...prev, status: newStatus } : null);

      // Update the students list locally
      setStudents((prev) => prev.map(student =>
        student.id === studentId ? { ...student, status: newStatus } : student
      ));

      // Trigger parent refresh for stats
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleViewDocument = async (doc: any) => {
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

  const handleDeleteDocument = async (doc: any) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("student-documents")
        .remove([doc.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      toast.success("Document deleted successfully!");

      // Refresh documents for the selected student
      if (selectedStudent) {
        fetchDocuments(selectedStudent.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading students...</div>;
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {students.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No students found
              </p>
            ) : (
              students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">
                        {student.first_name} {student.middle_name} {student.last_name}
                      </h3>
                      <Badge className={getStatusColor(student.status)}>
                        {student.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <p>Program: {student.enrolled_program}</p>
                      <p>Year: {student.enrollment_year}</p>
                      <p>School: {student.secondary_school_name}</p>
                      <p>Municipality: {student.secondary_school_municipality}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewStudent(student)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteStudent(student.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
            <DialogDescription>Complete student information and documents</DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.first_name} {selectedStudent.middle_name} {selectedStudent.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Sex</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedStudent.sex}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Enrollment Year</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.enrollment_year}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Enrolled Program</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.enrolled_program}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Secondary School</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.secondary_school_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">School Type</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedStudent.secondary_school_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Municipality</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.secondary_school_municipality}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Secondary GPA</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.secondary_gpa}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Mother's Name</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.mother_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Father's Name</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.father_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Guardian's Name</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.guardian_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contact Number</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.contact_number}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium">Home Address</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.home_address}</p>
                </div>
              </div>

              {/* Status Control Section */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Application Status</h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Current Status:</p>
                    <Badge className={getStatusColor(selectedStudent.status)}>
                      {selectedStudent.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                      onClick={() => handleUpdateStatus(selectedStudent.id, 'pending')}
                      disabled={selectedStudent.status === 'pending'}
                    >
                      Set Pending
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => handleUpdateStatus(selectedStudent.id, 'approved')}
                      disabled={selectedStudent.status === 'approved'}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => handleUpdateStatus(selectedStudent.id, 'rejected')}
                      disabled={selectedStudent.status === 'rejected'}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Uploaded Documents</h4>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{doc.document_type}</p>
                          <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDocument(doc)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteDocument(doc)}
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentList;
