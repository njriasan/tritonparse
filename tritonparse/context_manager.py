import os
import shutil
import tempfile

from .structured_logging import clear_logging_config, init
from .utils import unified_parse


def createUniqueTempDirectory():
    return tempfile.mkdtemp()


class TritonParseManager:
    def __init__(
        self,
        enable_trace_launch=False,
        split_inductor_compilations=True,
        **parse_kwargs,
    ):
        """
        Context manager for tritonparse workflow.

        Args:
            enable_trace_launch: Whether to enable trace launch
            split_inductor_compilations: Whether to split inductor compilations in the output
            **parse_kwargs: Additional keyword arguments to pass to unified_parse
        """
        self.enable_trace_launch = enable_trace_launch
        self.split_inductor_compilations = split_inductor_compilations
        self.parse_kwargs = parse_kwargs
        self.dir_path = None
        self.output_link = None

    def __enter__(self):
        self.dir_path = createUniqueTempDirectory()
        init(self.dir_path, enable_trace_launch=self.enable_trace_launch)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.output_link = unified_parse(
            source=self.dir_path,
            overwrite=True,
            split_inductor_compilations=self.split_inductor_compilations,
            **self.parse_kwargs,
        )
        clear_logging_config()
        if os.path.exists(self.dir_path):
            shutil.rmtree(self.dir_path)
