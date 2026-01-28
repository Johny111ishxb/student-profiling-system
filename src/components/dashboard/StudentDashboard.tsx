import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  User as UserIcon,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import StudentProfileForm from "./StudentProfileForm";
import DocumentUpload from "./DocumentUpload";

interface StudentDashboardProps {
  user: User;
}

const StudentDashboard = ({ user }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <img src="/bisu-logo2.jpg" alt="" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Student Portal</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Application Status Card */}
        {profile && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    {profile.status === "approved" && (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    )}
                    {profile.status === "pending" && (
                      <Clock className="h-8 w-8 text-yellow-500" />
                    )}
                    {profile.status === "rejected" && (
                      <XCircle className="h-8 w-8 text-red-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Application Status
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profile.status === "approved" &&
                        "Your application has been approved! You can now upload documents."}
                      {profile.status === "pending" &&
                        "Your application is under review by the registrar."}
                      {profile.status === "rejected" &&
                        "Your application has been rejected. Please contact the registrar for details."}
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    profile.status === "approved"
                      ? "bg-green-500"
                      : profile.status === "pending"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }
                >
                  {profile.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Complete your profile to continue with enrollment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentProfileForm
                userId={user.id}
                existingProfile={profile}
                onProfileUpdate={fetchProfile}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Document Upload
              </CardTitle>
              <CardDescription>
                Upload required documents (Birth Certificate, Good Morals, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile ? (
                <DocumentUpload studentId={user.id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Please complete your profile first before uploading documents.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
