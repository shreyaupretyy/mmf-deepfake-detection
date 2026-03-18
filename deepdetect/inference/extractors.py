"""
Feature extractors and face detector for the DeepDetect pipeline.

Extractors match the notebook definitions exactly so features are
compatible with the trained checkpoint.
"""

import os
import urllib.request
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image

import timm
import timm.data

from deepdetect import config


# ═════════════════════════════════════════════════════════════════════════════
# Face detector
# ═════════════════════════════════════════════════════════════════════════════

class FaceDetector:
    """OpenCV DNN face detector with auto-download of model files."""

    def __init__(self, model_dir=None, confidence=None):
        model_dir = Path(model_dir or config.BASE_DIR / "models_cache")
        model_dir.mkdir(parents=True, exist_ok=True)

        proto_path = model_dir / "deploy.prototxt"
        model_path = model_dir / "res10_300x300_ssd_iter_140000_fp16.caffemodel"

        if not proto_path.exists():
            print("Downloading face detector prototxt...")
            urllib.request.urlretrieve(config.FACE_PROTO_URL, str(proto_path))
        if not model_path.exists():
            print("Downloading face detector model...")
            urllib.request.urlretrieve(config.FACE_MODEL_URL, str(model_path))

        self.net = cv2.dnn.readNetFromCaffe(str(proto_path), str(model_path))
        self.confidence = confidence or config.FACE_CONFIDENCE_THRESHOLD

    def detect_and_crop(self, image_rgb, image_size=None):
        """Detect and crop the largest face. Returns a PIL Image or None."""
        image_size = image_size or config.FACE_SIZE
        h, w = image_rgb.shape[:2]

        blob = cv2.dnn.blobFromImage(image_rgb, 1.0, (300, 300), (104.0, 177.0, 123.0))
        self.net.setInput(blob)
        detections = self.net.forward()

        best_face = None
        best_conf = self.confidence

        for i in range(detections.shape[2]):
            conf = float(detections[0, 0, i, 2])
            if conf > best_conf:
                x1 = max(0, int(detections[0, 0, i, 3] * w))
                y1 = max(0, int(detections[0, 0, i, 4] * h))
                x2 = min(w, int(detections[0, 0, i, 5] * w))
                y2 = min(h, int(detections[0, 0, i, 6] * h))
                margin = int(config.FACE_MARGIN * max(x2 - x1, y2 - y1))
                x1 = max(0, x1 - margin)
                y1 = max(0, y1 - margin)
                x2 = min(w, x2 + margin)
                y2 = min(h, y2 + margin)
                best_face = (x1, y1, x2, y2)
                best_conf = conf

        if best_face is None:
            return None

        x1, y1, x2, y2 = best_face
        face_crop = image_rgb[y1:y2, x1:x2]
        return Image.fromarray(face_crop).resize((image_size, image_size), Image.LANCZOS)


# ═════════════════════════════════════════════════════════════════════════════
# Feature extractors
# ═════════════════════════════════════════════════════════════════════════════

class SpatialExtractor(nn.Module):
    """XceptionNet spatial feature extractor (2048-dim)."""

    def __init__(self, device=None):
        super().__init__()
        self.device = device or torch.device("cpu")
        self.model = timm.create_model("xception", pretrained=True, num_classes=0)
        self.model.eval().to(self.device)
        self.transform = transforms.Compose([
            transforms.Resize((299, 299)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
        ])

    @torch.no_grad()
    def extract(self, face_pil):
        """Extract spatial features from a PIL Image. Returns numpy array (2048,)."""
        img_tensor = self.transform(face_pil.convert("RGB")).unsqueeze(0).to(self.device)
        return self.model(img_tensor).squeeze().cpu().numpy()


class FrequencyExtractor:
    """FFT-based frequency feature extractor (128-dim azimuthal power spectrum)."""

    FREQ_DIM = 128

    def __init__(self):
        self.transform = transforms.Compose([
            transforms.Resize((299, 299)),
            transforms.Grayscale(),
            transforms.ToTensor(),
        ])

    def extract(self, face_pil):
        """Extract frequency features from a PIL Image. Returns numpy array (128,)."""
        img_tensor = self.transform(face_pil).squeeze(0)  # (299, 299)
        h, w = img_tensor.shape

        # Hann window to reduce spectral leakage
        window = torch.hann_window(h).unsqueeze(1) * torch.hann_window(w).unsqueeze(0)
        img_windowed = img_tensor * window

        # 2D FFT
        f_transform = torch.fft.fft2(img_windowed)
        f_shift = torch.fft.fftshift(f_transform)
        power_spectrum = (torch.abs(f_shift) ** 2).numpy()

        # Azimuthal average (radial power spectrum profile)
        cy, cx = h // 2, w // 2
        Y, X = np.ogrid[:h, :w]
        radius = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2).astype(int)
        max_radius = min(cy, cx)

        radial_profile = np.zeros(max_radius)
        for r in range(max_radius):
            mask = radius == r
            if mask.any():
                radial_profile[r] = power_spectrum[mask].mean()

        # Log-scale
        radial_profile = np.log1p(radial_profile)

        # Resample to fixed FREQ_DIM
        x_old = np.linspace(0, 1, len(radial_profile))
        x_new = np.linspace(0, 1, self.FREQ_DIM)
        resampled = np.interp(x_new, x_old, radial_profile)

        return resampled.astype(np.float32)


class SemanticExtractor(nn.Module):
    """CLIP ViT-B/32 semantic feature extractor (768-dim)."""

    def __init__(self, device=None):
        super().__init__()
        self.device = device or torch.device("cpu")
        self.model = timm.create_model(
            "vit_base_patch32_clip_224.openai", pretrained=True, num_classes=0,
        )
        self.model.eval().to(self.device)

        data_config = timm.data.resolve_model_data_config(self.model)
        self.transform = timm.data.create_transform(**data_config, is_training=False)

    @torch.no_grad()
    def extract(self, face_pil):
        """Extract semantic features from a PIL Image. Returns numpy array (768,)."""
        img_tensor = self.transform(face_pil.convert("RGB")).unsqueeze(0).to(self.device)
        return self.model(img_tensor).squeeze().cpu().numpy()


# ═════════════════════════════════════════════════════════════════════════════
# Video frame reader (multi-backend fallback, same as notebook)
# ═════════════════════════════════════════════════════════════════════════════

def read_video_frames(file_path, num_frames=20):
    """Read uniformly-sampled frames from a video file. Returns list of RGB arrays."""
    file_path = str(file_path)

    # Try OpenCV first
    cap = cv2.VideoCapture(file_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total > 0:
        indices = torch.linspace(0, total - 1, num_frames).long()
        frames = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx.item())
            ret, frame = cap.read()
            if ret:
                frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        cap.release()
        if frames:
            return frames
    cap.release()

    # Fallback: imageio
    try:
        import imageio.v3 as iio
        all_frames = iio.imread(file_path, plugin="pyav")
        total = len(all_frames)
        if total > 0:
            indices = torch.linspace(0, total - 1, min(num_frames, total)).long().tolist()
            return [all_frames[i] for i in indices]
    except Exception:
        pass

    # Fallback: PyAV
    try:
        import av
        container = av.open(file_path)
        stream = container.streams.video[0]
        total = stream.frames or sum(1 for _ in container.decode(video=0))
        if total == 0:
            container.close()
            return []
        container.close()
        container = av.open(file_path)
        indices = set(torch.linspace(0, max(total - 1, 0), min(num_frames, max(total, 1))).long().tolist())
        frames = []
        for i, frame in enumerate(container.decode(video=0)):
            if i in indices:
                frames.append(frame.to_ndarray(format="rgb24"))
            if len(frames) >= num_frames:
                break
        container.close()
        return frames
    except Exception:
        pass

    return []
