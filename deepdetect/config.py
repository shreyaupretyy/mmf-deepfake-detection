"""Central configuration for the DeepDetect inference pipeline."""

from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
CHECKPOINT_PATH = BASE_DIR / "checkpoints" / "complete_attention_all_datasets_best.pth"

# Face detector model files (auto-downloaded if missing)
FACE_PROTO_URL = "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt"
FACE_MODEL_URL = "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20180205_fp16/res10_300x300_ssd_iter_140000_fp16.caffemodel"

# ── Feature dimensions (must match checkpoint) ──────────────────────────────
SPATIAL_DIM = 2048    # Xception output
FREQ_DIM = 128        # Azimuthal power spectrum (was 4)
SEMANTIC_DIM = 768    # CLIP ViT-B/32 output

# ── Model architecture (must match checkpoint) ──────────────────────────────
HIDDEN_DIM1 = 512
HIDDEN_DIM2 = 256
DROPOUT = 0.5

# ── Face detection ──────────────────────────────────────────────────────────
FACE_SIZE = 299
FACE_CONFIDENCE_THRESHOLD = 0.5
FACE_MARGIN = 0.15

# ── Inference defaults ──────────────────────────────────────────────────────
MAX_VIDEO_FRAMES = 20
FAKE_THRESHOLD = 0.5   # sigmoid output above this = "fake"
