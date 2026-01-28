import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ClusterResult,
  ClusterInfo,
  BatchResponse,
} from "@/../../modelInterface/clusteringInterface";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const API_URL = "http://localhost:8000";

const AnalyticsDashboard = () => {
  const [schoolData, setSchoolData] = useState<any[]>([]);
  const [municipalityData, setMunicipalityData] = useState<any[]>([]);
  const [clusterResults, setClusterResults] = useState<ClusterResult[]>([]);
  const [batchSummary, setBatchSummary] = useState<
    BatchResponse["summary"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>("checking");

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
    fetchAnalytics();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data.model_loaded ? "ml_loaded" : "rule_based");
      } else {
        setApiStatus("unavailable");
      }
    } catch (error) {
      console.log("API health check failed:", error);
      setApiStatus("unavailable");
    }
  };

  const fetchAnalytics = async () => {
    try {
      setError(null);

      // Fetch profiles from Supabase
      const { data: profiles, error: supabaseError } = await supabase
        .from("profiles")
        .select("secondary_school_name, secondary_school_municipality");

      if (supabaseError) throw supabaseError;

      if (!profiles || profiles.length === 0) {
        setError("No student data found");
        setLoading(false);
        return;
      }

      console.log(`Found ${profiles.length} student profiles`);

      // Process school data for bar chart
      const schoolCounts = profiles.reduce((acc: any, profile: any) => {
        const school = profile.secondary_school_name || "Unknown";
        acc[school] = (acc[school] || 0) + 1;
        return acc;
      }, {});

      const schoolChartData = Object.entries(schoolCounts)
        .map(([name, count]) => ({
          name: name.length > 30 ? `${name.substring(0, 30)}...` : name,
          students: count,
        }))
        .sort((a: any, b: any) => b.students - a.students)
        .slice(0, 10);

      // Process municipality data for bar chart
      const municipalityCounts = profiles.reduce((acc: any, profile: any) => {
        const municipality = profile.secondary_school_municipality || "Unknown";
        acc[municipality] = (acc[municipality] || 0) + 1;
        return acc;
      }, {});

      const municipalityChartData = Object.entries(municipalityCounts)
        .map(([name, count]) => ({
          name: name.length > 20 ? `${name.substring(0, 20)}...` : name,
          students: count,
        }))
        .sort((a: any, b: any) => b.students - a.students)
        .slice(0, 10);

      // Call clustering API with BATCH request
      console.log(`Sending ${profiles.length} schools to clustering API...`);

      try {
        const batchResponse = await fetch(`${API_URL}/cluster-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schools: profiles.map((p) => ({
              name: p.secondary_school_name || "",
              municipality: p.secondary_school_municipality || "",
            })),
          }),
        });

        if (!batchResponse.ok) {
          const errorText = await batchResponse.text();
          console.error("API Error:", batchResponse.status, errorText);
          throw new Error(`Clustering API error: ${batchResponse.status}`);
        }

        const batchData: BatchResponse = await batchResponse.json();
        console.log("✅ Clustering API response:", batchData.summary);

        setClusterResults(batchData.results || []);
        setBatchSummary(batchData.summary);
      } catch (apiError: any) {
        console.warn("Clustering API unavailable:", apiError.message);
        console.log("Using mock clustering data as fallback...");
        // Generate mock clustering data as fallback
        generateMockClustering(profiles);
      }

      setSchoolData(schoolChartData);
      setMunicipalityData(municipalityChartData);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      setError(error.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const generateMockClustering = (profiles: any[]) => {
    // Enhanced mock clustering that matches API format
    const mockResults: ClusterResult[] = profiles.map((profile) => {
      const text = `${profile.secondary_school_name || ""} ${
        profile.secondary_school_municipality || ""
      }`.toLowerCase();
      let cluster_id = 1; // Default to Clarin

      if (
        text.includes("inabanga") ||
        text.includes("dagohoy") ||
        text.includes("southern")
      ) {
        cluster_id = 0;
      } else if (
        text.includes("tubigon") ||
        text.includes("cawayanan") ||
        text.includes("cabulijan")
      ) {
        cluster_id = 2;
      }

      const cluster_names = [
        "Inabanga Region Schools",
        "Clarin Region Schools",
        "Tubigon Region Schools",
      ];

      const cluster_colors = ["#0088FE", "#00C49F", "#FFBB28"];

      return {
        school: profile.secondary_school_name || "Unknown",
        municipality: profile.secondary_school_municipality || "Unknown",
        cluster_id,
        cluster_name: cluster_names[cluster_id],
        cluster_color: cluster_colors[cluster_id],
        model_used: "mock_fallback",
        success: true,
      };
    });

    const clusterCounts = { 0: 0, 1: 0, 2: 0 };
    mockResults.forEach((result) => {
      if (result.success) {
        clusterCounts[result.cluster_id]++;
      }
    });

    const total = mockResults.length;
    const successful = total;

    // Calculate percentages
    const clusterPercentages = {
      0: Math.round((clusterCounts[0] / successful) * 100 * 10) / 10,
      1: Math.round((clusterCounts[1] / successful) * 100 * 10) / 10,
      2: Math.round((clusterCounts[2] / successful) * 100 * 10) / 10,
    };

    // Find dominant cluster
    const dominantCluster = Object.entries(clusterCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    const dominantNames = [
      "Inabanga Region Schools",
      "Clarin Region Schools",
      "Tubigon Region Schools",
    ];

    const mockClusters: ClusterInfo[] = [0, 1, 2].map((id) => ({
      id,
      name: dominantNames[id],
      count: clusterCounts[id],
      percentage: clusterPercentages[id],
      color: ["#0088FE", "#00C49F", "#FFBB28"][id],
    }));

    setClusterResults(mockResults);
    setBatchSummary({
      total_schools: total,
      successful_predictions: successful,
      failed_predictions: 0,
      processing_time_seconds: 0.1,
      clusters: mockClusters,
      dominant_cluster: parseInt(dominantCluster),
      dominant_cluster_name: dominantNames[parseInt(dominantCluster)],
      model_used: "mock_fallback",
      performance: "0.100s (mock data)",
    });
  };

  const getApiStatusMessage = () => {
    switch (apiStatus) {
      case "ml_loaded":
        return { text: "✅ ML Model Active", color: "text-green-600" };
      case "rule_based":
        return { text: "⚠️ Rule-Based Fallback", color: "text-amber-600" };
      case "unavailable":
        return { text: "❌ API Unavailable", color: "text-red-600" };
      default:
        return { text: "⏳ Checking...", color: "text-gray-600" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading analytics data...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            API Status:{" "}
            <span className={getApiStatusMessage().color}>
              {getApiStatusMessage().text}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Prepare data for pie chart from the new API format
  const pieChartData =
    batchSummary?.clusters
      .filter((cluster) => cluster.count > 0)
      .map((cluster) => ({
        name: cluster.name,
        value: cluster.count,
        percentage: cluster.percentage,
        color: cluster.color,
      })) || [];

  return (
    <div className="space-y-6">
      {/* API Status Banner */}
      {apiStatus === "unavailable" && (
        <Alert variant="warning" className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Clustering API is unavailable. Using mock data for visualization.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Clustering Analysis Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>School Clustering Analysis</CardTitle>
              <CardDescription>
                Geographic distribution of enrolled students using{" "}
                {batchSummary?.model_used === "ml"
                  ? "Machine Learning"
                  : batchSummary?.model_used.includes("mock")
                  ? "Mock Data"
                  : "Rule-Based"}{" "}
                model
              </CardDescription>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                batchSummary?.model_used === "ml"
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {batchSummary?.model_used === "ml"
                ? "ML ACTIVE"
                : "FALLBACK MODE"}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {batchSummary ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Student Distribution by Region
                  </h3>
                  {pieChartData.length > 0 ? (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) =>
                              `${name}: ${percentage}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [
                              `${value} students`,
                              "Count",
                            ]}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white p-3 border rounded-lg shadow-lg">
                                    <p className="font-medium">{data.name}</p>
                                    <p className="text-sm">
                                      Students:{" "}
                                      <span className="font-bold">
                                        {data.value}
                                      </span>
                                    </p>
                                    <p className="text-sm">
                                      Percentage:{" "}
                                      <span className="font-bold">
                                        {data.percentage}%
                                      </span>
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center space-x-6 mt-4">
                        {pieChartData.map((cluster, index) => (
                          <div key={index} className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: cluster.color }}
                            />
                            <span className="text-sm">{cluster.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No clustering data available
                    </div>
                  )}
                </div>

                {/* Region Statistics */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Region Breakdown
                  </h3>
                  <div className="space-y-4">
                    {batchSummary.clusters
                      .filter((cluster) => cluster.count > 0)
                      .sort((a, b) => b.count - a.count)
                      .map((cluster, index) => (
                        <div key={cluster.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: cluster.color }}
                              />
                              <div>
                                <span className="font-medium">
                                  {cluster.name}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  Cluster {cluster.id}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold">
                                {cluster.percentage}%
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {cluster.count} students
                              </p>
                            </div>
                          </div>
                          {cluster.id === batchSummary.dominant_cluster && (
                            <div className="mt-2 inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Dominant Region
                            </div>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Performance Metrics */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">
                      Performance Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Processing Time
                        </p>
                        <p className="font-semibold">
                          {batchSummary.processing_time_seconds}s
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Success Rate
                        </p>
                        <p className="font-semibold">
                          {Math.round(
                            (batchSummary.successful_predictions /
                              batchSummary.total_schools) *
                              100
                          )}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {batchSummary.total_schools}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enrolled students
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Dominant Region
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold truncate">
                      {batchSummary.dominant_cluster_name}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {
                        batchSummary.clusters.find(
                          (c) => c.id === batchSummary.dominant_cluster
                        )?.percentage
                      }
                      % of students
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Model Mode
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-xl font-bold ${
                        batchSummary.model_used === "ml"
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {batchSummary.model_used.toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {batchSummary.successful_predictions} successful
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {batchSummary.processing_time_seconds}s
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For {batchSummary.total_schools} schools
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>No clustering data available</p>
              <button
                onClick={fetchAnalytics}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Retry Analysis
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Enrollment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Student Enrollment Summary</CardTitle>
          <CardDescription>
            Detailed breakdown of student enrollment by geographic region
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batchSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {batchSummary.total_schools}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total Students
                  </p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {batchSummary.successful_predictions}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Successfully Analyzed
                  </p>
                </div>

                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-3xl font-bold text-amber-600">
                    {batchSummary.failed_predictions}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Failed Analysis
                  </p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(
                      (batchSummary.successful_predictions /
                        batchSummary.total_schools) *
                        100
                    )}
                    %
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Analysis Success Rate
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Region Enrollment Details</h3>
                <div className="space-y-3">
                  {batchSummary.clusters
                    .filter((cluster) => cluster.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .map((cluster) => (
                      <div
                        key={cluster.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: cluster.color }}
                          />
                          <div>
                            <p className="font-medium">{cluster.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Cluster {cluster.id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {cluster.count} students
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {cluster.percentage}% of total enrollment
                          </p>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Summary calculation */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Calculation:</span>
                    {batchSummary.clusters
                      .map((c) => `${c.count} from ${c.name}`)
                      .join(" + ")}{" "}
                    = {batchSummary.total_schools} total students
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Secondary Schools</CardTitle>
          <CardDescription>
            Schools with highest number of enrolled students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={schoolData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={150}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="students"
                fill="hsl(var(--primary))"
                name="Number of Students"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Municipalities</CardTitle>
          <CardDescription>
            Municipalities with highest number of enrolled students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={municipalityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="students"
                fill="hsl(var(--secondary))"
                name="Number of Students"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
