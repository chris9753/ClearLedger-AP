# Defines what a "valid" invoice looks like.

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from pydantic import BaseModel, Field

class ValidationResult(BaseModel):
    status: str = Field(..., description="Validation status: 'valid' or 'failed'")
    errors: dict = Field(default_factory=dict, description="Dictionary of validation errors")