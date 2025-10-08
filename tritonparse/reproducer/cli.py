import argparse


def _add_reproducer_args(parser: argparse.ArgumentParser) -> None:
    """Add common arguments for the reproducer to a parser."""
    parser.add_argument("input", help="Path to the ndjson/ndjson.gz log file")
    parser.add_argument(
        "--line",
        type=int,
        default=1,
        help=(
            "The line number (1-based) of the launch event in the input file to reproduce. "
            "Defaults to 1."
        ),
    )
    parser.add_argument(
        "--out-dir",
        default="repro_output",
        help=(
            "Directory to save the reproducer script and context JSON. Defaults to "
            "'repro_output/<kernel_name>/' if not provided."
        ),
    )
    parser.add_argument(
        "--template",
        default="example",
        help=(
            "Template name (builtin, without .py) or a filesystem path to a .py file. "
            "Defaults to 'example'."
        ),
    )
    parser.add_argument(
        "--ir-override",
        action="store_true",
        help=(
            "Use ir_override mode to run with TTIR from compilation event. "
            "When enabled, the reproducer will monkeypatch triton.autotune to use "
            "the TTIR from the compilation event."
        ),
    )
