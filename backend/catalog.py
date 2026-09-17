ASSETS = [
    {"symbol": "NVDA", "name": "NVIDIA", "category": "Technology", "odds": 25, "min_reward": 15, "max_reward": 250, "price": 183.22, "change": 2.84, "color": "#91d64c"},
    {"symbol": "GME", "name": "GameStop", "category": "Consumer discretionary", "odds": 20, "min_reward": 10, "max_reward": 180, "price": 24.87, "change": -1.23, "color": "#f56565"},
    {"symbol": "GLD", "name": "SPDR Gold Trust", "category": "Gold ETF", "odds": 20, "min_reward": 20, "max_reward": 300, "price": 312.65, "change": 0.68, "color": "#d8bc71"},
    {"symbol": "TSLA", "name": "Tesla", "category": "Automotive & energy", "odds": 20, "min_reward": 10, "max_reward": 200, "price": 348.50, "change": 1.56, "color": "#ee6767"},
    {"symbol": "AAPL", "name": "Apple", "category": "Technology", "odds": 15, "min_reward": 5, "max_reward": 120, "price": 237.49, "change": 0.92, "color": "#cdd1d5"},
]

TIERS = [
    {'id': 'common', 'name': 'Common', 'odds': 60, 'min_reward': 1, 'max_reward': 10, 'color': '#a0b090'},
    {'id': 'rare', 'name': 'Rare', 'odds': 25, 'min_reward': 10, 'max_reward': 30, 'color': '#70dce4'},
    {'id': 'epic', 'name': 'Epic', 'odds': 11, 'min_reward': 30, 'max_reward': 100, 'color': '#ba95e1'},
    {'id': 'legendary', 'name': 'Legendary', 'odds': 4, 'min_reward': 100, 'max_reward': 500, 'color': '#e9c567'},
]
# Every asset is eligible for every rarity; tier, not ticker, sets the value.
for asset in ASSETS:
    asset.update(min_reward=1, max_reward=500)

PODS = [
    {"id": "core-01", "name": "Core", "serial": "001", "family": "Core", "color": "#b4ef63"},
    {"id": "prism-02", "name": "Prism", "serial": "002", "family": "Prism", "color": "#a7d8e4"},
    {"id": "onyx-03", "name": "Onyx", "serial": "003", "family": "Onyx", "color": "#d7be8a"},
    {"id": "core-04", "name": "Core", "serial": "004", "family": "Core", "color": "#b4ef63"},
    {"id": "prism-05", "name": "Prism", "serial": "005", "family": "Prism", "color": "#a7d8e4"},
    {"id": "onyx-06", "name": "Onyx", "serial": "006", "family": "Onyx", "color": "#d7be8a"},
]