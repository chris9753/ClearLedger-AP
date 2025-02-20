# /agents/base_agent.py
from abc import ABC, abstractmethod
from typing import Any

class BaseAgent(ABC):
    """Abstract base class for all agents in the invoice processing system."""
    
    @abstractmethod
    def run(self, input_data: Any) -> Any:
        """Execute the agent's primary function on the input data."""
        pass
    
    def __init__(self):
        self.name = self.__class__.__name__