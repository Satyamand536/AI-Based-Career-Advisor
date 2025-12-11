import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";  // ✅ Import करो
import "../components/Home.css";

export default function Dashboard() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      console.log("📥 Fetching recommendations...");
      
      const res = await fetch("http://localhost:8000/jobs/recommendations", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("📨 Response status:", res.status);
      const data = await res.json();
      console.log("📦 Response data:", data);

      if (data.success) {
        setRecommendations(data.recommendations);
        toast.success("Recommendations loaded!");
      } else {
        toast.error(data.error || "Failed to load recommendations");
      }
    } catch (err) {
      console.error("❌ Error fetching recommendations:", err);
      toast.error("Error loading recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only PDF and DOCX files allowed");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      console.log("📤 Uploading resume:", file.name);

      const res = await fetch("http://localhost:8000/jobs/upload-resume", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      console.log("📨 Upload response status:", res.status);
      const data = await res.json();
      console.log("📦 Upload response data:", data);

      if (data.success) {
        toast.success("✅ Resume uploaded successfully!");
        
        setTimeout(() => {
          fetchRecommendations();
        }, 500);
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("❌ Resume upload error:", err);
      toast.error("Resume upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="home-container">
      {/* USE NAVBAR COMPONENT */}
      <Navbar />

      <div style={{ padding: "40px 80px" }}>
        <h1>Your Career Dashboard</h1>

        {/* Resume Upload Section */}
        <div style={{ 
          marginBottom: "40px",
          padding: "20px",
          background: "#f5f5f5",
          borderRadius: "8px"
        }}>
          <h2>Upload Your Resume</h2>
          <p style={{ color: "#666", marginBottom: "15px" }}>
            Upload PDF or DOCX file to get AI-powered job recommendations
          </p>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleResumeUpload}
            disabled={uploading}
            style={{
              padding: "10px",
              border: "2px solid #ddd",
              borderRadius: "6px",
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
          />
          {uploading && <p style={{ marginTop: "10px" }}>⏳ Uploading...</p>}
        </div>

        {/* Recommendations Section */}
        <div>
          <h2>Recommended Jobs For You</h2>

          {loading ? (
            <p>⏳ Loading recommendations...</p>
          ) : recommendations.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #ddd",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  }}
                >
                  <h3>{rec.job.title}</h3>
                  <p style={{ margin: "5px 0" }}>
                    <strong>{rec.job.company}</strong>
                  </p>
                  <p style={{ margin: "5px 0", color: "#666", fontSize: "0.9rem" }}>
                    📍 {rec.job.location} | {rec.job.jobType}
                  </p>
                  <p style={{ 
                    margin: "10px 0",
                    padding: "10px",
                    background: "#e8f5e9",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    color: "green"
                  }}>
                    ✅ Match Score: {Math.round(rec.matchScore)}%
                  </p>
                  <p style={{ margin: "10px 0", fontSize: "0.9rem", color: "#666" }}>
                    <strong>Why:</strong> {rec.reason}
                  </p>
                  <button
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "royalblue",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>📝 No recommendations yet. Upload your resume to get started!</p>
          )}
        </div>
      </div>
    </div>
  );
}
