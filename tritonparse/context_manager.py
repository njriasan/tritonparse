import os
import shutil
import tempfile

from .structured_logging import clear_logging_config, init
from .utils import unified_parse


def createUniqueTempDirectory():
    return tempfile.mkdtemp()


class TritonParseManager:
    def __enter__(self):
        self.dir_path = createUniqueTempDirectory()
        init(self.dir_path)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.output_link = unified_parse(source=self.dir_path, overwrite=True)
        clear_logging_config()
        if os.path.exists(self.dir_path):
            shutil.rmtree(self.dir_path)
