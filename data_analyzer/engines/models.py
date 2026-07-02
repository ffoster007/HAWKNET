from enum import Enum


class DataSource(str, Enum):
    DATABASE = "database"
    API = "api"
    FILE = "file"

class ReconStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class ReconType(str, Enum):
    FULL = "full"
    INCREMENTAL = "incremental"


class ResponseStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"

class AiOffensiveStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class AiOffensiveRequest(BaseModel):
    id: str
    status: AiOffensiveStatus
    created_at: datetime
    updated_at: datetime