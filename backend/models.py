from typing import Optional, Literal
from pydantic import BaseModel, Field


class Reward(BaseModel):
    symbol: str
    amount: float
    quantity: float
    reference_price: float
    tier: str = 'legacy'
    tier_odds: float = 0
    tier_min: float = 0
    tier_max: float = 0


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
    wallet_address: Optional[str] = None
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


class ProtocolStats(BaseModel):
    locked: float = 0
    rewards: float = 0
    burned: float = 0
    returned: float = 0
    cycles: int = 0
    active: int = 0
    completed: int = 0
    wallets: int = 0


class PublicProtocol(BaseModel):
    stats: ProtocolStats
    events: list[Event]


class SharedReward(BaseModel):
    public_id: str
    run_id: str
    symbol: str
    asset_name: str
    tier: str
    tier_odds: float
    amount: float
    quantity: float
    inc_committed: float
    inc_returned: float
    inc_burned: float
    claimed_at: float
    wallet_label: str