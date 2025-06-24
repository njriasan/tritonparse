#!/usr/bin/env python3
"""
Simple tensor loading utility for tritonparse saved tensors.
Usage:
import tritonparse.tools.load_tensor as load_tensor
tensor = load_tensor.load_tensor(tensor_file_path, device)
"""

import gzip
import hashlib
import io
from pathlib import Path

import torch


def load_tensor(tensor_file_path: str, device: str = None) -> torch.Tensor:
    """
    Load a tensor from its file path and verify its integrity using the hash in the filename.

    Args:
        tensor_file_path (str): Direct path to the tensor file. Supports both:
                               - .bin.gz: gzip-compressed tensor (hash is of uncompressed data)
                               - .bin: uncompressed tensor (for backward compatibility)
        device (str, optional): Device to load the tensor to (e.g., 'cuda:0', 'cpu').
                               If None, keeps the tensor on its original device.

    Returns:
        torch.Tensor: The loaded tensor (moved to the specified device if provided)

    Raises:
        FileNotFoundError: If the tensor file doesn't exist
        RuntimeError: If the tensor cannot be loaded
        ValueError: If the computed hash doesn't match the filename hash
    """
    blob_path = Path(tensor_file_path)

    if not blob_path.exists():
        raise FileNotFoundError(f"Tensor blob not found: {blob_path}")

    # Detect compression by file extension
    is_compressed = str(blob_path).endswith('.bin.gz')

    # Read file contents
    with open(blob_path, "rb") as f:
        file_contents = f.read()

    # Decompress if needed
    if is_compressed:
        try:
            file_contents = gzip.decompress(file_contents)
        except Exception as e:
            raise RuntimeError(f"Failed to decompress gzip file {blob_path}: {str(e)}")

    # Extract expected hash from filename
    if is_compressed:
        # abc123.bin.gz -> abc123
        expected_hash = blob_path.name.replace('.bin.gz', '')
    else:
        # abc123.bin -> abc123
        expected_hash = blob_path.stem

    # Compute hash of uncompressed data
    computed_hash = hashlib.blake2b(file_contents).hexdigest()

    # Verify hash matches filename
    if computed_hash != expected_hash:
        raise ValueError(
            f"Hash verification failed: expected '{expected_hash}' but computed '{computed_hash}'"
        )

    try:
        # Load the tensor from memory buffer
        buffer = io.BytesIO(file_contents)
        tensor = torch.load(buffer, map_location=device)
        return tensor
    except Exception as e:
        raise RuntimeError(f"Failed to load tensor from {blob_path}: {str(e)}")
