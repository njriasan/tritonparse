#!/usr/bin/env python3
#  Copyright (c) Meta Platforms, Inc. and affiliates.

import argparse

from tritonparse.reproducer.cli import _add_reproducer_args
from tritonparse.reproducer.orchestrator import reproduce

from tritonparse.utils import _add_parse_args, unified_parse


# We need this as an entrace for fbpkg
def main():
    parser = argparse.ArgumentParser(description="tritonparse CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    parse_parser = subparsers.add_parser(
        "parse", help="Parse triton structured logs", conflict_handler="resolve"
    )
    _add_parse_args(parse_parser)
    parse_parser.set_defaults(func="parse")

    repro_parser = subparsers.add_parser(
        "reproduce", help="Build reproducer from trace file"
    )
    _add_reproducer_args(repro_parser)
    repro_parser.set_defaults(func="reproduce")

    args = parser.parse_args()

    if args.func == "parse":
        # Filter out routing-specific arguments before passing to unified_parse
        parse_args = {
            k: v for k, v in vars(args).items() if k not in ["command", "func"]
        }
        unified_parse(**parse_args)
    elif args.func == "reproduce":
        reproduce(
            input_path=args.input,
            line_index=args.line_index,
            out_dir=args.out_dir,
            template=args.template,
        )


if __name__ == "__main__":
    # Do not add code here, it won't be run. Add them to the function called below.
    main()  # pragma: no cover
