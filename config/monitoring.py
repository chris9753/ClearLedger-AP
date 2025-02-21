import time
from config.logging_config import logger

class Monitoring:
    def __init__(self):
        self.start_times = {}

    def start_timer(self, module_name: str):
        self.start_times[module_name] = time.time()
        logger.debug(f"Started timer for {module_name}")

    def stop_timer(self, module_name: str):
        if module_name in self.start_times:
            duration = time.time() - self.start_times[module_name]
            logger.info(f"{module_name} took {duration:.2f} seconds")
            del self.start_times[module_name]
        else:
            logger.warning(f"No start time recorded for {module_name}")