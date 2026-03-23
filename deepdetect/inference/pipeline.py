"""
End-to-end deepfake detection inference pipeline.

Usage:
    from deepdetect.inference import DeepDetectPipeline

    pipeline = DeepDetectPipeline()
    result = pipeline.analyze_image("photo.jpg")
    print(result.verdict, result.confidence)
"""

import time
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import torch

from deepdetect import config
from deepdetect.models.attention import CompleteAttentionModel
from deepdetect.inference.extractors import (
    FaceDetector,
    SpatialExtractor,
    FrequencyExtractor,
    SemanticExtractor,
    read_video_frames,
)


@dataclass
class FrameResult:
    frame: int
    fake_probability: float


@dataclass
class AnalysisResult:
    verdict: str                        # "AUTHENTIC" | "MANIPULATED"
    confidence: float                   # 0.0 – 1.0
    risk_level: str                     # "LOW" | "MEDIUM" | "HIGH"
    domain_weights: dict                # {"spatial": w, "frequency": w, "semantic": w}
    frames_analyzed: int
    frame_results: list = field(default_factory=list)

    def to_dict(self):
        return {
            "verdict": self.verdict,
            "confidence": round(self.confidence, 4),
            "risk_level": self.risk_level,
            "domains": {
                "spatial":   {"weight": round(self.domain_weights["spatial"], 4),
                              "label": "Texture & Structure"},
                "frequency": {"weight": round(self.domain_weights["frequency"], 4),
                              "label": "Frequency Spectrum"},
                "semantic":  {"weight": round(self.domain_weights["semantic"], 4),
                              "label": "Semantic Content"},
            },
            "frames_analyzed": self.frames_analyzed,
            "frame_results": [
                {"frame": fr.frame, "fake_probability": round(fr.fake_probability, 4)}
                for fr in self.frame_results
            ],
        }


def _risk_level(confidence: float) -> str:
    if confidence >= 0.8:
        return "HIGH"
    if confidence >= 0.5:
        return "MEDIUM"
    return "LOW"


# Maximum z-score magnitude allowed after normalization.
# Training features are ~N(0,1); real-world OOD images can produce
# z-scores of 10+ which cause extreme logits.  Clipping to [-5, 5]
# keeps in-distribution samples untouched while preventing OOD
# overconfidence.
_ZSCORE_CLIP = 3.0


class DeepDetectPipeline:
    """Load model + extractors once, then call analyze_image / analyze_video."""

    def __init__(self, checkpoint_path=None, device=None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        checkpoint_path = Path(checkpoint_path or config.CHECKPOINT_PATH)

        # ── Face detector ────────────────────────────────────────────────
        self.face_detector = FaceDetector()

        # ── Feature extractors ───────────────────────────────────────────
        print("Loading feature extractors...")
        self.spatial_extractor = SpatialExtractor(device=self.device)
        self.frequency_extractor = FrequencyExtractor()
        self.semantic_extractor = SemanticExtractor(device=self.device)

        # ── Classification model ─────────────────────────────────────────
        print(f"Loading checkpoint: {checkpoint_path.name}")
        self.model = CompleteAttentionModel(
            spatial_dim=config.SPATIAL_DIM,
            freq_dim=config.FREQ_DIM,
            semantic_dim=config.SEMANTIC_DIM,
            hidden_dim1=config.HIDDEN_DIM1,
            hidden_dim2=config.HIDDEN_DIM2,
            dropout=config.DROPOUT,
        ).to(self.device)

        ckpt = torch.load(str(checkpoint_path), map_location=self.device, weights_only=False)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.eval()
        print(f"Model loaded (val_acc={ckpt.get('val_acc', 'N/A')}, val_f1={ckpt.get('val_f1', 'N/A')})")

        # ── Classification threshold (learned from validation set) ───────
        self.threshold = ckpt.get("optimal_threshold", config.FAKE_THRESHOLD)
        print(f"Classification threshold: {self.threshold}")

        # ── Normalization stats (z-score, computed from training set) ────
        self.norm_stats = None
        if "norm_stats" in ckpt:
            self.norm_stats = {
                k: np.array(v, dtype=np.float32)
                for k, v in ckpt["norm_stats"].items()
            }
            print("Normalization stats loaded from checkpoint")

    # ─────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────

    def analyze_image(self, image_path) -> AnalysisResult:
        """Analyze a single image for deepfake manipulation."""
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return self._analyze_frames([img_rgb])

    def analyze_video(self, video_path, max_frames=None) -> AnalysisResult:
        """Analyze a video by sampling frames."""
        max_frames = max_frames or config.MAX_VIDEO_FRAMES
        frames = read_video_frames(video_path, max_frames)
        if not frames:
            raise ValueError(f"Cannot read video: {video_path}")
        return self._analyze_frames(frames)

    # ─────────────────────────────────────────────────────────────────────
    # Internal
    # ─────────────────────────────────────────────────────────────────────

    def _analyze_frames(self, frames_rgb) -> AnalysisResult:
        """Run detection on a list of RGB numpy arrays."""
        total_start = time.time()
        frame_results = []
        all_weights = []

        print(f"\n{'='*60}")
        print(f"INFERENCE PIPELINE - {len(frames_rgb)} frame(s)")
        print(f"{'='*60}")

        for i, frame_rgb in enumerate(frames_rgb):
            print(f"\n--- Frame {i+1}/{len(frames_rgb)} ---")

            t = time.time()
            face_pil = self.face_detector.detect_and_crop(frame_rgb)
            print(f"  [1] Face detection:    {time.time()-t:.3f}s", end="")
            if face_pil is None:
                print(" -> NO FACE FOUND, skipping")
                continue
            print(f" -> face cropped to {face_pil.size}")

            t = time.time()
            spatial = self.spatial_extractor.extract(face_pil)
            print(f"  [2] Spatial (Xception): {time.time()-t:.3f}s -> shape {spatial.shape}")

            t = time.time()
            frequency = self.frequency_extractor.extract(face_pil)
            print(f"  [3] Frequency (FFT):   {time.time()-t:.3f}s -> shape {frequency.shape}")

            t = time.time()
            semantic = self.semantic_extractor.extract(face_pil)
            print(f"  [4] Semantic (CLIP):   {time.time()-t:.3f}s -> shape {semantic.shape}")

            t = time.time()
            prob, weights = self._predict(spatial, frequency, semantic)
            print(f"  [5] Classification:    {time.time()-t:.3f}s -> prob={prob:.4f} (threshold={self.threshold})")
            print(f"       Domain weights: spatial={weights[0]:.4f} freq={weights[1]:.4f} semantic={weights[2]:.4f}")

            frame_results.append(FrameResult(frame=i, fake_probability=prob))
            all_weights.append(weights)

        if not frame_results:
            elapsed = time.time() - total_start
            print(f"\n  RESULT: INCONCLUSIVE (no faces detected in any frame)")
            print(f"  Total time: {elapsed:.3f}s")
            print(f"{'='*60}\n")
            return AnalysisResult(
                verdict="INCONCLUSIVE",
                confidence=0.0,
                risk_level="LOW",
                domain_weights={"spatial": 0.33, "frequency": 0.33, "semantic": 0.33},
                frames_analyzed=0,
                frame_results=[],
            )

        # Aggregate across frames
        avg_prob = float(np.mean([fr.fake_probability for fr in frame_results]))
        avg_weights = np.mean(all_weights, axis=0)

        is_fake = avg_prob >= self.threshold
        confidence = avg_prob if is_fake else 1.0 - avg_prob

        elapsed = time.time() - total_start
        verdict = "MANIPULATED" if is_fake else "AUTHENTIC"
        print(f"\n  RESULT: {verdict} (confidence={confidence:.4f}, avg_prob={avg_prob:.4f}, threshold={self.threshold})")
        print(f"  Frames analyzed: {len(frame_results)}/{len(frames_rgb)}")
        print(f"  Total time: {elapsed:.3f}s")
        print(f"{'='*60}\n")

        return AnalysisResult(
            verdict=verdict,
            confidence=confidence,
            risk_level=_risk_level(confidence),
            domain_weights={
                "spatial": float(avg_weights[0]),
                "frequency": float(avg_weights[1]),
                "semantic": float(avg_weights[2]),
            },
            frames_analyzed=len(frame_results),
            frame_results=frame_results,
        )

    @torch.no_grad()
    def _predict(self, spatial, frequency, semantic):
        """Run the classifier on extracted features. Returns (probability, domain_weights)."""
        # NaN/Inf protection (matches training dataset __getitem__)
        for arr in [spatial, frequency, semantic]:
            mask = np.isnan(arr) | np.isinf(arr)
            if np.any(mask):
                arr[mask] = 0.0

        # Z-score normalization (stats computed from training set, saved in checkpoint)
        if self.norm_stats is not None:
            spatial = (spatial - self.norm_stats["spatial_mean"]) / self.norm_stats["spatial_std"]
            frequency = (frequency - self.norm_stats["freq_mean"]) / self.norm_stats["freq_std"]
            semantic = (semantic - self.norm_stats["semantic_mean"]) / self.norm_stats["semantic_std"]

        # Clip extreme z-scores to prevent OOD overconfidence.
        # In-distribution features are ~N(0,1) so [-5, 5] is 5-sigma:
        # keeps normal samples untouched, tames wild OOD values.
        spatial = np.clip(spatial, -_ZSCORE_CLIP, _ZSCORE_CLIP)
        frequency = np.clip(frequency, -_ZSCORE_CLIP, _ZSCORE_CLIP)
        semantic = np.clip(semantic, -_ZSCORE_CLIP, _ZSCORE_CLIP)

        spatial_t = torch.from_numpy(spatial.astype(np.float32)).unsqueeze(0).to(self.device)
        freq_t = torch.from_numpy(frequency.astype(np.float32)).unsqueeze(0).to(self.device)
        semantic_t = torch.from_numpy(semantic.astype(np.float32)).unsqueeze(0).to(self.device)

        logit = self.model(spatial_t, freq_t, semantic_t)
        prob = torch.sigmoid(logit).item()
        weights = self.model.last_domain_weights.squeeze().cpu().numpy()

        return prob, weights
