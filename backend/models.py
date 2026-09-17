from typing import Optional, Literal
from pydantic import BaseModel, Field


class Reward(BaseModel):
    symbol: str
    amount: float
    quantity: float
    reference_price: float


class Incubation(BaseModel):
    id: str
    pod_id: str
    amount: int
    started_at: float
    completes_at: float
    status: Literal['incubating', 'ready', 'claimed'] = 'incubating'
    reward: Optional[Reward] = None
    returned: float = 0
    burned: float = 0
    claimed_at: Optional[float] = None
    fast_forwarded: bool = False


class Event(BaseModel):
    id: str
    kind: str
    message: str
    timestamp: float
    amount: Optional[float] = None
    symbol: Optional[str] = None


class DemoState(BaseModel):
    id: str
    version: int = 0
    balance: float = 10000
    cost: int = 100
    total_burned: float = 0
    total_returned: float = 0
    runs: list[Incubation] = Field(default_factory=list)
    events: list[Event] = Field(default_factory=list)


class StartRequest(BaseModel):
    pod_id: str
    amount: int = Field(ge=1, le=100000)


class SettingsRequest(BaseModel):
    cost: int = Field(ge=1, le=100000)