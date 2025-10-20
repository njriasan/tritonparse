"""
Function extractor for reproducer utility functions.

This module extracts utility functions from utils.py and load_tensor.py
using the inspect module, and generates standalone code for reproducers.
"""

import importlib.util
import inspect
from pathlib import Path


def extract_utility_functions() -> str:
    """
    Extract all utility functions needed for the reproducer template.

    Returns:
        str: Complete Python code including imports and all utility functions.
    """
    # Import the modules
    utils_module = _import_module_from_path(
        "tritonparse.reproducer.utils", Path(__file__).parent / "utils.py"
    )
    load_tensor_module = _import_module_from_path(
        "tritonparse.tools.load_tensor",
        Path(__file__).parent.parent / "tools" / "load_tensor.py",
    )

    # Functions to extract from utils.py
    utils_functions = [
        "_get_triton_tensor_types",
        "create_args_from_json_file",
        "create_args_from_json",
        "_apply_stride_and_offset",
        "_create_base_tensor",
        "_create_tensor",
        "_create_arg_from_info",
    ]

    # Functions to extract from load_tensor.py
    load_tensor_functions = [
        "load_tensor",
    ]

    # Extract all function source code
    extracted_code = []

    # Add required imports
    imports = _generate_imports()
    extracted_code.append(imports)

    # Add TRITON_KERNELS_CUSTOM_TYPES constant
    constant_code = inspect.getsource(utils_module).split("\n")
    for i, line in enumerate(constant_code):
        if line.startswith("TRITON_KERNELS_CUSTOM_TYPES"):
            # Find the end of this statement
            j = i
            while j < len(constant_code) and not constant_code[j].rstrip().endswith(
                ")"
            ):
                j += 1
            constant_lines = constant_code[i : j + 1]
            extracted_code.append("\n".join(constant_lines))
            break

    extracted_code.append("")

    # Extract load_tensor function
    for func_name in load_tensor_functions:
        func = getattr(load_tensor_module, func_name)
        source = inspect.getsource(func)
        extracted_code.append(source)

    # Extract utils functions
    for func_name in utils_functions:
        func = getattr(utils_module, func_name)
        source = inspect.getsource(func)
        extracted_code.append(source)

    return "\n\n".join(extracted_code)


def _import_module_from_path(module_name: str, file_path: Path):
    """
    Import a module from a file path.

    Args:
        module_name: Name for the module
        file_path: Path to the Python file

    Returns:
        The imported module
    """
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _generate_imports() -> str:
    """
    Generate the import statements needed for the extracted functions.

    Returns:
        str: Import statements as a single string
    """
    imports = [
        "import gzip",
        "import hashlib",
        "import importlib",
        "import importlib.util",
        "import io",
        "import json",
        "import logging",
        "import sys",
        "from functools import lru_cache",
        "from pathlib import Path",
        "from typing import Union",
        "",
        "import torch",
    ]
    return "\n".join(imports)
