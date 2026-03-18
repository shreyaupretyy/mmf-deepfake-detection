"""
Attention-based deepfake detection model.

Architecture: per-domain attention (SE, frequency band, self-attention)
followed by learnable domain-level fusion and a binary classifier.

These class definitions must remain identical to the notebook versions
so that the trained checkpoint loads correctly.
"""

import torch
import torch.nn as nn


class ChannelAttention(nn.Module):
    """Squeeze-and-Excitation (SE) Channel Attention."""

    def __init__(self, in_channels, reduction=16):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(in_channels, in_channels // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(in_channels // reduction, in_channels, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x):
        weights = self.fc(x)
        return x * weights, weights


class FrequencyBandAttention(nn.Module):
    """SE-style attention for frequency domain features (128-dim)."""

    def __init__(self, num_features=128, reduction=8):
        super().__init__()
        self.attention = nn.Sequential(
            nn.Linear(num_features, num_features // reduction),
            nn.ReLU(),
            nn.Linear(num_features // reduction, num_features),
            nn.Sigmoid(),
        )

    def forward(self, x):
        weights = self.attention(x)
        return x * weights, weights


class SelfAttention(nn.Module):
    """Multi-head self-attention for semantic features."""

    def __init__(self, dim, num_heads=8):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = dim // num_heads
        self.scale = self.head_dim ** -0.5

        self.qkv = nn.Linear(dim, dim * 3)
        self.proj = nn.Linear(dim, dim)
        self.norm = nn.LayerNorm(dim)

    def forward(self, x):
        B, D = x.size()

        x = x.unsqueeze(1)  # (B, 1, D)
        qkv = self.qkv(x).reshape(B, 1, 3, self.num_heads, self.head_dim).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = attn.softmax(dim=-1)

        out = (attn @ v).transpose(1, 2).reshape(B, 1, D)
        out = self.proj(out).squeeze(1)

        return self.norm(x.squeeze(1) + out)


class DomainAttentionFusion(nn.Module):
    """Learnable attention-based fusion with temperature scaling."""

    def __init__(self, spatial_dim, freq_dim, semantic_dim, fusion_dim=512):
        super().__init__()

        self.spatial_proj = nn.Linear(spatial_dim, fusion_dim)
        self.freq_proj = nn.Linear(freq_dim, fusion_dim)
        self.semantic_proj = nn.Linear(semantic_dim, fusion_dim)

        self.domain_attention = nn.Sequential(
            nn.Linear(fusion_dim * 3, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 3),
        )

        self.fusion = nn.Sequential(
            nn.Linear(fusion_dim, fusion_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
        )

        # Temperature > 1 spreads attention across domains (prevents collapse)
        self.temperature = nn.Parameter(torch.tensor(2.0))

    def forward(self, spatial_feat, freq_feat, semantic_feat):
        spatial_proj = torch.clamp(self.spatial_proj(spatial_feat), -100, 100)
        freq_proj = torch.clamp(self.freq_proj(freq_feat), -100, 100)
        semantic_proj = torch.clamp(self.semantic_proj(semantic_feat), -100, 100)

        domain_stack = torch.stack([spatial_proj, freq_proj, semantic_proj], dim=1)

        concat_features = torch.cat([spatial_proj, freq_proj, semantic_proj], dim=1)
        attention_logits = self.domain_attention(concat_features)

        attention_logits = attention_logits - attention_logits.max(dim=1, keepdim=True)[0]
        temp = self.temperature.clamp(min=0.5)
        domain_weights = torch.softmax(attention_logits / temp, dim=1)

        # Check for NaN and replace with uniform weights
        if torch.isnan(domain_weights).any():
            domain_weights = torch.ones_like(domain_weights) / 3.0

        weighted_features = domain_stack * domain_weights.unsqueeze(-1)
        fused = weighted_features.sum(dim=1)

        return self.fusion(fused), domain_weights


class CompleteAttentionModel(nn.Module):
    """
    Complete 3-domain attention model for deepfake detection.

    Domains:
        - Spatial (Xception, 2048-dim) with SE channel attention
        - Frequency (azimuthal power spectrum, 128-dim) with SE attention
        - Semantic (CLIP ViT-B/32, 768-dim) with self-attention

    Fusion: learnable domain-level attention with temperature scaling.
    Training: domain dropout prevents semantic dominance.
    Output: single logit (use sigmoid for probability).
    """

    def __init__(self, spatial_dim, freq_dim, semantic_dim,
                 hidden_dim1=512, hidden_dim2=256, dropout=0.5):
        super().__init__()

        self.spatial_attention = ChannelAttention(spatial_dim, reduction=16)
        self.freq_attention = FrequencyBandAttention(freq_dim)
        self.semantic_attention = SelfAttention(semantic_dim)

        self.fusion = DomainAttentionFusion(spatial_dim, freq_dim, semantic_dim, hidden_dim1)

        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim1, hidden_dim2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim2, 1),
        )

        self.last_domain_weights = None
        self.last_spatial_weights = None
        self.last_freq_weights = None

        # Domain dropout: randomly drop domains during training
        self.domain_dropout_prob = 0.15

    def forward(self, spatial, freq, semantic):
        spatial_attended, spatial_weights = self.spatial_attention(spatial)
        freq_attended, freq_weights = self.freq_attention(freq)
        semantic_attended = self.semantic_attention(semantic)

        self.last_spatial_weights = spatial_weights.detach()
        self.last_freq_weights = freq_weights.detach()

        # Domain dropout during training: force all domains to learn
        if self.training:
            drop_mask = torch.rand(3) > self.domain_dropout_prob
            if not drop_mask.any():
                drop_mask[torch.randint(3, (1,))] = True
            if not drop_mask[0]:
                spatial_attended = torch.zeros_like(spatial_attended)
            if not drop_mask[1]:
                freq_attended = torch.zeros_like(freq_attended)
            if not drop_mask[2]:
                semantic_attended = torch.zeros_like(semantic_attended)

        fused, domain_weights = self.fusion(spatial_attended, freq_attended, semantic_attended)
        self.last_domain_weights = domain_weights.detach()

        return self.classifier(fused)
