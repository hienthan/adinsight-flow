from typing import Dict, Any, List

# Planning keywords explicitly defined for the Planning Signal boost
PLANNING_COST_KEYWORDS = {"harga", "biaya", "budget", "cost", "estimate"}

class Scorer:
    def evaluate_planning_signal(self, tokens: List[str]) -> int:
        for t in tokens:
            if t in PLANNING_COST_KEYWORDS:
                return 1
        return 0

    def compute_final_score(self, intent_score: int, geo_score: int, planning_signal: int) -> float:
        """
        FinalScore = IntentScore * 0.5 + GeoScore * 0.3 + PlanningSignal * 0.2
        """
        return (intent_score * 0.5) + (geo_score * 0.3) + (planning_signal * 0.2)

    def generate_dsa_campaign(self, primary_intent: str, geo_type: str, province: str, city: str, geo_entity: str) -> str:
        """
        Format: {intent}_{geo_key}
        """
        if geo_type in ["landmark", "tourist_spot"]:
            geo_key = province
        elif geo_type in ["city", "resort_area"]:
            geo_key = city
        elif geo_type in ["airport", "station", "transport_hub"]:
            geo_key = geo_entity
        else:
            geo_key = province

        # Fallback to general if data is missing
        if not geo_key:
            geo_key = "general"

        return f"{primary_intent}_{geo_key}"
