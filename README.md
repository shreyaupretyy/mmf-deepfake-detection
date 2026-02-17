# MMF-Deepfake-Detection

Multi-Modal Fusion framework for deepfake detection using attention-based classification across spatial, frequency, and semantic domains.

## Architecture Overview

```
Input (Image/Video)
       |
       v
  Face Detection (OpenCV DNN SSD)
       |
       v
  +-----------+    +-----------+    +-----------+
  |  Spatial   |    | Frequency |    |  Semantic  |
  |  Xception  |    |    FFT    |    | CLIP ViT   |
  |  2048-dim  |    |  128-dim  |    |  768-dim   |
  +-----------+    +-----------+    +-----------+
       |                |                |
       v                v                v
  SE Attention    SE Attention    Self-Attention
       |                |                |
       v                v                v
  +--------------------------------------------+
  |   Domain Attention Fusion (temperature)     |
  |   + Domain Dropout (p=0.15, training only)  |
  +--------------------------------------------+
       |
       v
  Classifier (512 -> 256 -> 1)
       |
       v
  sigmoid -> probability
```

## Feature Extraction

| Domain | Backbone | Dimensions | Details |
|--------|----------|------------|---------|
| Spatial | Xception (timm, ImageNet pretrained) | 2048 | Resize 299x299, Normalize mean/std=[0.5, 0.5, 0.5] |
| Frequency | FFT Azimuthal Power Spectrum | 128 | Grayscale, Hann window, 2D FFT, radial profile, log-scale |
| Semantic | CLIP ViT-B/32 (timm, OpenAI pretrained) | 768 | timm auto-transform (224x224) |

## Face Detection

- **Model**: OpenCV DNN SSD (ResNet-10 backbone)
- **Files**: `deploy.prototxt` + `res10_300x300_ssd_iter_140000_fp16.caffemodel` (auto-downloaded)
- **Input blob**: 300x300, mean subtraction [104.0, 177.0, 123.0]
- **Confidence threshold**: 0.5
- **Face margin**: 15% expansion around bounding box
- **Output**: 299x299 PIL Image (LANCZOS resize)

## Model Architecture

### Attention Modules

| Module | Input Dim | Type | Details |
|--------|-----------|------|---------|
| ChannelAttention | 2048 | Squeeze-and-Excitation | Reduction ratio 16 (2048->128->2048) |
| FrequencyBandAttention | 128 | Squeeze-and-Excitation | Reduction ratio 8 (128->16->128) |
| SelfAttention | 768 | Multi-head self-attention | 8 heads, head_dim=96 |

### Domain Attention Fusion

- Projects all domains to 512-dim common space
- Attention network: 1536 -> 256 -> 3 (domain weights)
- **Temperature scaling**: learnable parameter (init=2.0, min=0.5) prevents single-domain collapse
- **Domain dropout** (training only): randomly zeros each domain with p=0.15, forces all domains to learn

### Classifier

```
Linear(512, 256) -> ReLU -> Dropout(0.5) -> Linear(256, 1)
```

Output: raw logit (apply sigmoid for probability)

## Training Configuration

| Parameter | Value |
|-----------|-------|
| Optimizer | Adam (lr=1e-4, weight_decay=1e-5) |
| Scheduler | CosineAnnealingLR (eta_min=1e-6) |
| Loss | BCEWithLogitsLoss (class-weighted) |
| Batch size | 128 |
| Epochs | 20 |
| Early stopping | Patience=5, min_delta=0.001, metric=F1 |
| Gradient clipping | max_norm=1.0 |
| Train/Val split | 80/20 at **video-level** (stratified by dataset+label) |
| Normalization | Z-score per domain (stats from training set, saved in checkpoint) |

## Datasets

| Dataset | Type | Manipulation Methods |
|---------|------|---------------------|
| FaceForensics++ | Video | Deepfakes, Face2Face, FaceSwap, NeuralTextures, FaceShifter |
| Celeb-DF | Video | GAN-based synthesis |
| DFDC | Video | Deepfake Detection Challenge |
| HiDF | Video + Image | High-quality face swap |

Preprocessing extracts 20 frames per video, detects and crops faces, then extracts features from all 3 domains. Feature files are saved as `.npy` arrays.

## Project Structure

```
mmf-deepfake-detection/
|-- api/
|   |-- main.py                  # FastAPI server (POST /analyze, GET /health)
|
|-- deepdetect/
|   |-- config.py                # Dimensions, thresholds, paths
|   |-- inference/
|   |   |-- extractors.py        # FaceDetector, Spatial/Frequency/SemanticExtractor
|   |   |-- pipeline.py          # DeepDetectPipeline (end-to-end inference)
|   |-- models/
|       |-- attention.py         # CompleteAttentionModel, attention modules
|
|-- mobile/DeepDetect/           # React Native (Expo) mobile app
|   |-- app/                     # Screens (index, analysis, history, about)
|   |-- components/              # UI components (VerdictBadge, ConfidenceGauge, etc.)
|   |-- services/api.ts          # API client
|
|-- notebooks/
|   |-- preprocess_sections2_4.ipynb           # Combined preprocessing pipeline
|   |-- train_sections5_end.ipynb              # Training + evaluation
|   |-- 01_face_detection_extraction.ipynb     # Step 1: Face extraction (run first)
|   |-- 02_spatial_feature_extraction.ipynb    # Step 2a: Xception features
|   |-- 03_frequency_feature_extraction.ipynb  # Step 2b: FFT features (parallelizable)
|   |-- 04_semantic_feature_extraction.ipynb   # Step 2c: CLIP features
|   |-- 05_pipeline_tracking_and_manifest.ipynb # Step 3: Manifest generation
|
|-- checkpoints/                 # Model weights (.pth, gitignored)
|-- tests/
|   |-- test_inference.py        # Model loading and forward pass tests
|-- requirements.txt
```

## Preprocessing Pipeline

```
01_face_detection_extraction  (run first, ~hours)
        |
        v
02_spatial    03_frequency    04_semantic   (run in parallel)
        |            |              |
        v            v              v
05_pipeline_tracking_and_manifest  (run last)
        |
        v
train_sections5_end.ipynb  (training)
```

Notebooks 02-04 are independent and can run simultaneously on SWAN CERN. Each skips already-processed files for resumability.

## API

**Start the server:**

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server status and model info |
| POST | `/analyze` | Upload image/video for analysis |

**Supported formats:**

- Images: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`, `.tiff`
- Videos: `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`

**Response:**

```json
{
  "verdict": "MANIPULATED",
  "confidence": 0.8723,
  "risk_level": "HIGH",
  "domains": {
    "spatial":   { "weight": 0.35, "label": "Texture & Structure" },
    "frequency": { "weight": 0.28, "label": "Frequency Spectrum" },
    "semantic":  { "weight": 0.37, "label": "Semantic Content" }
  },
  "frames_analyzed": 1,
  "frame_results": [{ "frame": 0, "fake_probability": 0.8723 }],
  "processing_time_seconds": 2.14
}
```

## Mobile App

React Native app built with Expo SDK 54.

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | 54.0.0 | Framework |
| React Native | 0.81.5 | Core |
| expo-router | 6.0.23 | File-based routing |
| NativeWind | 4.1.23 | Tailwind CSS styling |
| expo-image-picker | 17.0.10 | Gallery/camera access |
| react-native-svg | 15.12.1 | Confidence gauge |
| AsyncStorage | 2.2.0 | History persistence |

**Screens**: Home (upload), Analysis (results), History (past scans), About (info)

**Run the app:**

```bash
cd mobile/DeepDetect
npm install
npx expo start
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Face Detection | OpenCV DNN (Caffe SSD) |
| Spatial Features | Xception via timm |
| Frequency Features | PyTorch FFT + NumPy |
| Semantic Features | CLIP ViT-B/32 via timm |
| Classification | PyTorch (custom attention model) |
| Backend API | FastAPI + Uvicorn |
| Mobile App | React Native + Expo + NativeWind |
| Training Platform | CERN SWAN (GPU) |

## Requirements

```
torch>=2.0.0
torchvision>=0.15.0
timm>=0.9.0
opencv-python>=4.8.0
Pillow>=10.0.0
numpy>=1.24.0
scipy>=1.11.0
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
```

## Setup

```bash
# Backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Place checkpoint in checkpoints/
# Start server
uvicorn api.main:app --host 0.0.0.0 --port 8000

# Mobile app
cd mobile/DeepDetect
npm install
npx expo start
```

## Checkpoint Format

The `.pth` checkpoint contains:

| Key | Description |
|-----|-------------|
| `model_state_dict` | Model weights |
| `norm_stats` | Per-domain mean/std for z-score normalization |
| `history` | Training loss/metrics per epoch |
| `val_acc` | Best validation accuracy |
| `val_f1` | Best validation F1 score |
| `config` | Training configuration (percentages, model type) |

## Key Design Decisions

- **Frozen backbones**: Xception and CLIP are used as fixed feature extractors (not fine-tuned). This enables rapid experimentation within academic compute constraints.
- **Video-level splitting**: Train/val split at the video ID level prevents data leakage from correlated frames.
- **Temperature-scaled fusion**: Learnable temperature parameter prevents attention collapse to a single domain.
- **Domain dropout**: Randomly dropping domains during training forces the model to utilize all three feature types.
- **Z-score normalization**: Per-domain normalization from training statistics ensures features are on comparable scales.
- **128-dim azimuthal spectrum**: Replaces 4 scalar statistics with a radial power spectrum profile, giving the frequency domain meaningful representational capacity.
