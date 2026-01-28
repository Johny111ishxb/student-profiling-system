import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface StudentProfileFormProps {
  userId: string;
  existingProfile: any;
  onProfileUpdate: () => void;
}

const StudentProfileForm = ({ userId, existingProfile, onProfileUpdate }: StudentProfileFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    enrollment_year: "",
    secondary_school_name: "",
    secondary_school_type: "public",
    secondary_school_municipality: "",
    enrolled_program: "",
    secondary_gpa: "",
    mother_name: "",
    father_name: "",
    guardian_name: "",
    contact_number: "",
    home_address: "",
    sex: "male",
  });

  useEffect(() => {
    if (existingProfile) {
      setFormData({
        first_name: existingProfile.first_name || "",
        middle_name: existingProfile.middle_name || "",
        last_name: existingProfile.last_name || "",
        enrollment_year: existingProfile.enrollment_year || "",
        secondary_school_name: existingProfile.secondary_school_name || "",
        secondary_school_type: existingProfile.secondary_school_type || "public",
        secondary_school_municipality: existingProfile.secondary_school_municipality || "",
        enrolled_program: existingProfile.enrolled_program || "",
        secondary_gpa: existingProfile.secondary_gpa || "",
        mother_name: existingProfile.mother_name || "",
        father_name: existingProfile.father_name || "",
        guardian_name: existingProfile.guardian_name || "",
        contact_number: existingProfile.contact_number || "",
        home_address: existingProfile.home_address || "",
        sex: existingProfile.sex || "male",
      });
    }
  }, [existingProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const profileData = {
        ...formData,
        secondary_gpa: parseFloat(formData.secondary_gpa),
        secondary_school_type: formData.secondary_school_type as "public" | "private",
        sex: formData.sex as "male" | "female",
      };

      const { error } = existingProfile
        ? await supabase
            .from("profiles")
            .update(profileData)
            .eq("id", userId)
        : await supabase
            .from("profiles")
            .insert({
              ...profileData,
              id: userId,
            });

      if (error) throw error;

      toast.success("Profile saved successfully!");
      onProfileUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange("first_name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="middle_name">Middle Name</Label>
          <Input
            id="middle_name"
            value={formData.middle_name}
            onChange={(e) => handleChange("middle_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange("last_name", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sex">Sex *</Label>
          <Select value={formData.sex} onValueChange={(value) => handleChange("sex", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="enrollment_year">Enrollment Year *</Label>
          <Input
            id="enrollment_year"
            placeholder="e.g., 2024-2025"
            value={formData.enrollment_year}
            onChange={(e) => handleChange("enrollment_year", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="secondary_school_name">Secondary School Name *</Label>
        <Input
          id="secondary_school_name"
          placeholder="e.g., Clarin National High School"
          value={formData.secondary_school_name}
          onChange={(e) => handleChange("secondary_school_name", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="secondary_school_type">School Type *</Label>
          <Select
            value={formData.secondary_school_type}
            onValueChange={(value) => handleChange("secondary_school_type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondary_school_municipality">Municipality *</Label>
          <Input
            id="secondary_school_municipality"
            placeholder="e.g., Tubigon"
            value={formData.secondary_school_municipality}
            onChange={(e) => handleChange("secondary_school_municipality", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="enrolled_program">Enrolled Program *</Label>
          <Input
            id="enrolled_program"
            placeholder="e.g., BSCS, BSIT"
            value={formData.enrolled_program}
            onChange={(e) => handleChange("enrolled_program", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondary_gpa">Secondary GPA *</Label>
          <Input
            id="secondary_gpa"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="e.g., 89.1"
            value={formData.secondary_gpa}
            onChange={(e) => handleChange("secondary_gpa", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mother_name">Mother's Name</Label>
          <Input
            id="mother_name"
            value={formData.mother_name}
            onChange={(e) => handleChange("mother_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="father_name">Father's Name</Label>
          <Input
            id="father_name"
            value={formData.father_name}
            onChange={(e) => handleChange("father_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardian_name">Guardian's Name</Label>
          <Input
            id="guardian_name"
            value={formData.guardian_name}
            onChange={(e) => handleChange("guardian_name", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_number">Contact Number *</Label>
          <Input
            id="contact_number"
            type="tel"
            value={formData.contact_number}
            onChange={(e) => handleChange("contact_number", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="home_address">Home Address *</Label>
          <Input
            id="home_address"
            value={formData.home_address}
            onChange={(e) => handleChange("home_address", e.target.value)}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : existingProfile ? "Update Profile" : "Create Profile"}
      </Button>
    </form>
  );
};

export default StudentProfileForm;
