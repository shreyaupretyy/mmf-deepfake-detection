"""
Validate that the refactored model code loads the trained checkpoint
and produces correct output shapes.
"""

import sys
from pathlib import Path

import torch
import numpy as np

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from deepdetect import config
from deepdetect.models.attention import CompleteAttentionModel


def test_checkpoint_loads():
    """Load the checkpoint and verify the model produces valid output."""
    device = torch.device("cpu")
    checkpoint_path = config.CHECKPOINT_PATH

    assert checkpoint_path.exists(), f"Checkpoint not found: {checkpoint_path}"

    # Load checkpoint
    ckpt = torch.load(str(checkpoint_path), map_location=device, weights_only=False)

    assert "model_state_dict" in ckpt, "Missing model_state_dict"
    assert "config" in ckpt, "Missing config"
    assert ckpt["config"]["model_type"] == "CompleteAttentionModel"

    # Instantiate model
    model = CompleteAttentionModel(
        spatial_dim=config.SPATIAL_DIM,
        freq_dim=config.FREQ_DIM,
        semantic_dim=config.SEMANTIC_DIM,
        hidden_dim1=config.HIDDEN_DIM1,
        hidden_dim2=config.HIDDEN_DIM2,
        dropout=config.DROPOUT,
    ).to(device)

    # Load weights
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    print(f"  Checkpoint loaded: val_acc={ckpt.get('val_acc')}, val_f1={ckpt.get('val_f1')}")

    # Dummy forward pass
    batch_size = 2
    spatial = torch.randn(batch_size, config.SPATIAL_DIM, device=device)
    freq = torch.randn(batch_size, config.FREQ_DIM, device=device)
    semantic = torch.randn(batch_size, config.SEMANTIC_DIM, device=device)

    with torch.no_grad():
        logits = model(spatial, freq, semantic)

    # Verify output shape
    assert logits.shape == (batch_size, 1), f"Expected ({batch_size}, 1), got {logits.shape}"

    # Verify sigmoid range
    probs = torch.sigmoid(logits)
    assert (probs >= 0).all() and (probs <= 1).all(), f"Probabilities out of range: {probs}"

    # Verify domain weights
    dw = model.last_domain_weights
    assert dw is not None, "Domain weights not recorded"
    assert dw.shape == (batch_size, 3), f"Expected domain weights ({batch_size}, 3), got {dw.shape}"

    weight_sums = dw.sum(dim=1)
    for i in range(batch_size):
        assert abs(weight_sums[i].item() - 1.0) < 1e-4, f"Domain weights don't sum to 1: {weight_sums[i]}"

    print(f"  Output shape: {logits.shape}")
    print(f"  Probabilities: {probs.squeeze().tolist()}")
    print(f"  Domain weights: spatial={dw[0, 0]:.4f}, freq={dw[0, 1]:.4f}, semantic={dw[0, 2]:.4f}")
    print("  All checks passed.")


if __name__ == "__main__":
    print("=" * 60)
    print("DeepDetect Inference Validation")
    print("=" * 60)
    test_checkpoint_loads()
    print("\nSUCCESS")
