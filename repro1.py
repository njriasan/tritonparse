import json
import os
import sys
import time

import torch
import triton
from vllm.model_executor.layers.fused_moe.fused_moe import (
    fused_moe_kernel as imported_kernel,
)
import triton.language as tl
from pathlib import Path
import hashlib

def load_tensor(tensor_file_path: str, device: str = None) -> torch.Tensor:
    """
    Load a tensor from its file path and verify its integrity using the hash in the filename.

    Args:
        tensor_file_path (str): Direct path to the tensor .bin file. The filename should be
                               the hash of the file contents followed by .bin extension.
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

    # Extract expected hash from filename (remove .bin extension)
    expected_hash = blob_path.stem

    # Compute actual hash of file contents
    with open(blob_path, "rb") as f:
        file_contents = f.read()
        computed_hash = hashlib.blake2b(file_contents).hexdigest()

    # Verify hash matches filename
    if computed_hash != expected_hash:
        raise ValueError(
            f"Hash verification failed: expected '{expected_hash}' but computed '{computed_hash}'"
        )

    try:
        # Load the tensor using torch.load (tensors are saved with torch.save)
        # If device is None, keep tensor on its original device, otherwise move to specified device
        tensor = torch.load(blob_path, map_location=device)
        return tensor
    except Exception as e:
        raise RuntimeError(f"Failed to load tensor from {blob_path}: {str(e)}")

def create_args_from_json(json_path):
    """
    Creates a list of arguments for a kernel launch from a JSON file.
    Args:
        json_path (str): The path to the JSON file containing the kernel
                         launch information.
    Returns:
        tuple: A tuple containing the grid and a dictionary of arguments.
    """
    with open(json_path, "r") as f:
        data = json.load(f)
    # Handle data format validation and extraction
    if isinstance(data, list):
        if len(data) != 1:
            print(
                f"Error: Expected single element list, got list with {len(data)} elements"
            )
            sys.exit(1)
        data = data[0]
    elif not isinstance(data, dict):
        print(f"Error: Expected list or dict, got {type(data)}")
        sys.exit(1)

    grid = data.get("grid", [])
    args_dict = {}
    extracted_args = data.get("extracted_args", {})

    for arg_name, arg_info in extracted_args.items():
        args_dict[arg_name] = _create_arg_from_info(arg_info)

    return grid, args_dict


def _create_arg_from_info(arg_info):
    """
    Recursively creates a kernel argument from its JSON info dictionary.
    """
    arg_type = arg_info.get("type")

    if arg_type in ["int", "bool"]:
        return arg_info.get("value")

    elif arg_type == "tensor":
        if arg_info.get("blob_path"):
            return load_tensor(arg_info.get("blob_path"), arg_info.get("device"))
        dtype_str = arg_info.get("dtype")
        try:
            torch_dtype = getattr(torch, dtype_str.split(".")[-1])
        except AttributeError:
            torch_dtype = torch.float32

        shape = arg_info.get("shape", [])
        device = arg_info.get("device", "cpu")

        # Use a dummy tensor to check properties of the dtype
        tensor_props = torch.empty(0, dtype=torch_dtype)

        # Case 1: Floating point, signed integers, uint8, and bool are supported by random_()
        if tensor_props.is_floating_point():
            if torch_dtype in [torch.float8_e4m3fn]:
                tmp = torch.rand(shape, dtype=torch.float32, device=device)
                return tmp.to(torch.float8_e4m3fn)
            else:
                return torch.empty(shape, dtype=torch_dtype, device=device).random_()
        elif torch_dtype in [
            torch.int8,
            torch.int16,
            torch.int32,
            torch.int64,
            torch.uint8,
            torch.bool,
        ]:
            return torch.empty(shape, dtype=torch_dtype, device=device).random_()
        # Case 2: Complex numbers need special handling
        elif tensor_props.is_complex():
            float_dtype = (
                torch.float32 if torch_dtype == torch.complex64 else torch.float64
            )
            real_part = torch.rand(shape, dtype=float_dtype, device=device)
            imag_part = torch.rand(shape, dtype=float_dtype, device=device)
            return torch.complex(real_part, imag_part)

        # Case 3: Handle other unsigned integers (like uint32) which fail with random_()
        elif "uint" in str(torch_dtype):
            return torch.randint(0, 1000, shape, dtype=torch_dtype, device=device)

        # Case 4: If we don't know how to handle the type, raise an error
        else:
            raise NotImplementedError(
                f"Random data generation not implemented for dtype: {torch_dtype}"
            )

    else:
        print(f"Warning: Unhandled argument type '{arg_type}'. Returning None.")
        return None


if __name__ == "__main__":
    json_file = sys.argv[1]
    grid, args_dict = create_args_from_json(json_file)

    print("Generated kernel arguments dictionary:")
    for name, arg in args_dict.items():
        print(f"  {name}: {arg}")
    print(f"Grid: {grid}")

    imported_kernel[grid](
        args_dict["a_ptr"],
        args_dict["b_ptr"],
        args_dict["c_ptr"],
        args_dict["b_bias_ptr"],
        args_dict["a_scale_ptr"],
        args_dict["b_scale_ptr"],
        args_dict["topk_weights_ptr"],
        args_dict["sorted_token_ids_ptr"],
        args_dict["expert_ids_ptr"],
        args_dict["num_tokens_post_padded_ptr"],
        args_dict["N"],
        args_dict["K"],
        args_dict["EM"],
        args_dict["num_valid_tokens"],
        args_dict["stride_am"],
        args_dict["stride_ak"],
        args_dict["stride_be"],
        args_dict["stride_bk"],
        args_dict["stride_bn"],
        args_dict["stride_cm"],
        args_dict["stride_cn"],
        args_dict["stride_asm"],
        args_dict["stride_ask"],
        args_dict["stride_bse"],
        args_dict["stride_bsk"],
        args_dict["stride_bsn"],
        args_dict["stride_bbe"],
        args_dict["stride_bbn"],
        args_dict["group_n"],
        args_dict["group_k"],
        args_dict["BLOCK_SIZE_M"],
        args_dict["BLOCK_SIZE_N"],
        args_dict["BLOCK_SIZE_K"],
        args_dict["GROUP_SIZE_M"],
        args_dict["MUL_ROUTED_WEIGHT"],
        args_dict["top_k"],
        # args_dict["compute_type"],
        tl.bfloat16,
        args_dict["use_fp8_w8a8"],
        args_dict["use_int8_w8a8"],
        args_dict["use_int8_w8a16"],
        args_dict["per_channel_quant"],
        args_dict["HAS_BIAS"],
    )

    torch.cuda.synchronize()
    print("Kernel launch finished.")
