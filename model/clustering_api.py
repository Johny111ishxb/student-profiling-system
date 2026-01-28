from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import joblib
import re
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI()

# Add CORS middleware - THIS IS CRITICAL FOR REACT
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS
    allow_headers=["*"],
)

# Load model ONCE at startup
print("⏳ Loading ML model...")
start_time = time.time()

try:
    model = joblib.load('kmeans_model.pkl')
    vectorizer = joblib.load('tfidf_vectorizer.pkl')
    MODEL_LOADED = True
    load_time = time.time() - start_time
    print(f"ML Model loaded successfully in {load_time:.2f} seconds!")
    print(f"   Model has {model.n_clusters} clusters")
    print(f"   Vectorizer has {len(vectorizer.get_feature_names_out())} features")
except Exception as e:
    MODEL_LOADED = False
    print(f"Warning: Could not load ML model: {str(e)[:100]}...")
    print("Using rule-based fallback.")

class School(BaseModel):
    name: str
    municipality: str

class BatchRequest(BaseModel):
    schools: List[School]

def clean_text(text: str) -> str:
    """Clean and normalize text data"""
    if not text:
        return ""
    
    text = text.lower()
    text = re.sub(r'[^\w\s.,-]', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = text.replace('high school', 'highschool')
    text = text.replace('national', 'nat')
    text = text.replace('school', 'sch')
    text = text.replace('highschool', 'highsch')  # Combine replacements
    return text.strip()

def get_cluster_name(cluster_id: int) -> str:
    """Get human-readable cluster name"""
    clusters = [
        "Inabanga  Schools",
        "Clarin Schools", 
        "Tubigon  Schools"
    ]
    return clusters[cluster_id] if cluster_id < len(clusters) else f"Cluster {cluster_id}"

def get_cluster_color(cluster_id: int) -> str:
    """Get color for visualization"""
    colors = ["#0088FE", "#00C49F", "#FFBB28"]  # Blue, Green, Yellow
    return colors[cluster_id % len(colors)]

def predict_single_ml(school: School):
    """Predict using ML model"""
    try:
        cleaned = clean_text(f"{school.name} | {school.municipality}")
        vectorized = vectorizer.transform([cleaned])
        cluster = int(model.predict(vectorized)[0])
        return cluster, "ml"
    except Exception as e:
        print(f"ML prediction failed: {e}")
        return None, "ml_failed"

def predict_single_rule(school: School):
    """Predict using rule-based fallback"""
    text = f"{school.name} {school.municipality}".lower()
    
    if 'inabanga' in text or 'dagohoy' in text:
        return 0, "rule_based"
    elif 'tubigon' in text or 'cawayanan' in text or 'cabulijan' in text:
        return 2, "rule_based"
    else:
        return 1, "rule_based"  # Default to Clarin

def predict_single(school: School):
    """Predict cluster for a single school"""
    try:
        if MODEL_LOADED:
            cluster, model_used = predict_single_ml(school)
            if cluster is None:
                # ML failed, use rule-based
                cluster, model_used = predict_single_rule(school)
        else:
            cluster, model_used = predict_single_rule(school)
        
        return {
            "school": school.name or "Unknown",
            "municipality": school.municipality or "Unknown",
            "cluster_id": cluster,
            "cluster_name": get_cluster_name(cluster),
            "cluster_color": get_cluster_color(cluster),
            "model_used": model_used,
            "success": True,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "school": school.name or "Unknown",
            "municipality": school.municipality or "Unknown",
            "error": str(e),
            "success": False,
            "model_used": "error"
        }

@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {
        "message": "🏫 School Clustering API",
        "status": "✅ Running",
        "model_loaded": MODEL_LOADED,
        "total_clusters": 3,
        "endpoints": {
            "health": "/health",
            "single_prediction": "POST /cluster",
            "batch_prediction": "POST /cluster-batch"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if MODEL_LOADED else "degraded",
        "model_loaded": MODEL_LOADED,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "clusters": [
            {
                "id": 0,
                "name": get_cluster_name(0),
                "color": get_cluster_color(0)
            },
            {
                "id": 1,
                "name": get_cluster_name(1),
                "color": get_cluster_color(1)
            },
            {
                "id": 2,
                "name": get_cluster_name(2),
                "color": get_cluster_color(2)
            }
        ]
    }

@app.post("/cluster")
async def get_cluster(school: School):
    """Single school prediction endpoint"""
    result = predict_single(school)
    return result

@app.post("/cluster-batch")
async def get_cluster_batch(batch: BatchRequest):
    """Batch prediction endpoint - much faster!"""
    start_time = time.time()
    
    if not batch.schools:
        return {
            "error": "No schools provided",
            "success": False
        }
    
    results = []
    cluster_counts = {0: 0, 1: 0, 2: 0}
    successful = 0
    
    for school in batch.schools:
        result = predict_single(school)
        results.append(result)
        
        if result["success"]:
            successful += 1
            cluster_counts[result["cluster_id"]] += 1
    
    # Calculate statistics
    total = len(results)
    processing_time = time.time() - start_time
    
    # Calculate percentages
    cluster_percentages = {}
    for cluster_id in [0, 1, 2]:
        count = cluster_counts.get(cluster_id, 0)
        percentage = (count / successful * 100) if successful > 0 else 0
        cluster_percentages[cluster_id] = round(percentage, 1)
    
    # Find dominant cluster
    dominant_cluster = max(cluster_counts.items(), key=lambda x: x[1])[0] if cluster_counts else 1
    
    return {
        "results": results,
        "summary": {
            "total_schools": total,
            "successful_predictions": successful,
            "failed_predictions": total - successful,
            "processing_time_seconds": round(processing_time, 3),
            "clusters": [
                {
                    "id": 0,
                    "name": get_cluster_name(0),
                    "count": cluster_counts.get(0, 0),
                    "percentage": cluster_percentages.get(0, 0),
                    "color": get_cluster_color(0)
                },
                {
                    "id": 1,
                    "name": get_cluster_name(1),
                    "count": cluster_counts.get(1, 0),
                    "percentage": cluster_percentages.get(1, 0),
                    "color": get_cluster_color(1)
                },
                {
                    "id": 2,
                    "name": get_cluster_name(2),
                    "count": cluster_counts.get(2, 0),
                    "percentage": cluster_percentages.get(2, 0),
                    "color": get_cluster_color(2)
                }
            ],
            "dominant_cluster": dominant_cluster,
            "dominant_cluster_name": get_cluster_name(dominant_cluster),
            "model_used": "ml" if MODEL_LOADED else "rule_based",
            "performance": f"{processing_time:.3f}s for {total} schools"
        }
    }

@app.get("/test")
async def test_endpoint():
    """Test endpoint with sample data"""
    test_schools = [
        {"name": "CLARIN NATIONAL SCHOOL OF FISHERIES", "municipality": "CLARIN, BOHOL"},
        {"name": "TUBIGON WEST CENTRAL HIGH SCHOOL", "municipality": "TUBIGON, BOHOL"},
        {"name": "INABANGA HIGH SCHOOL", "municipality": "INABANGA, BOHOL"},
        {"name": "TEST SCHOOL", "municipality": "UNKNOWN LOCATION"}
    ]
    
    results = []
    for school_data in test_schools:
        school = School(**school_data)
        result = predict_single(school)
        results.append(result)
    
    return {
        "test_results": results,
        "model_status": "loaded" if MODEL_LOADED else "rule_based_fallback",
        "message": "Test completed successfully"
    }

if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*50)
    print("SCHOOL CLUSTERING API")
    print("="*50)
    print(f"API URL: http://localhost:8000")
    print(f"Model: {'Loaded' if MODEL_LOADED else '⚠️ Rule-based fallback'}")
    print(f"🎯 Clusters: 3")
    print("\nAvailable Endpoints:")
    print("   GET  /              - API information")
    print("   GET  /health        - Health check")
    print("   GET  /test          - Test with sample data")
    print("   POST /cluster       - Predict single school")
    print("   POST /cluster-batch - Predict multiple schools")
    print("\nTip: Use POST /cluster-batch for better performance")
    print("="*50)
    print("\nServer starting...\n")
    
    # Remove reload=True to fix the warning
    uvicorn.run(app, host="0.0.0.0", port=8000)