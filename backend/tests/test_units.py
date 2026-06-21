"""
EcoTrack AI — in-process unit tests for pure functions in server.py.

These tests exercise the math/business logic directly so the `coverage` tool
can trace executed lines. Integration tests live in `test_api.py`.
"""
import sys
import os

# Ensure backend/ is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from server import (
    calc_emissions, carbon_score, compute_level, hash_pw, verify_pw,
    LEVELS, EF, CarbonEntry,
)


class TestCarbonScore:
    def test_zero_emissions_yields_perfect_score(self):
        assert carbon_score(0) == 100

    def test_average_person_emissions_yields_50ish(self):
        """16 kg/day is the global per-capita average — should land near 50."""
        assert 45 <= carbon_score(16) <= 55

    def test_extreme_emissions_clamped_to_zero(self):
        assert carbon_score(10000) == 0

    def test_negative_emissions_clamped_to_100(self):
        assert carbon_score(-5) == 100

    def test_score_monotonically_decreases_with_more_emissions(self):
        assert carbon_score(5) > carbon_score(10) > carbon_score(20)


class TestComputeLevel:
    @pytest.mark.parametrize("points,expected", [
        (0, "Eco Beginner"),
        (199, "Eco Beginner"),
        (200, "Green Explorer"),
        (599, "Green Explorer"),
        (600, "Climate Hero"),
        (1500, "Planet Protector"),
        (3500, "Earth Guardian"),
        (10_000, "Earth Guardian"),
    ])
    def test_threshold_boundaries(self, points, expected):
        assert compute_level(points) == expected

    def test_all_levels_unique(self):
        names = [name for _, name in LEVELS]
        assert len(names) == len(set(names))


class TestCalcEmissions:
    def test_all_zero_inputs_total_zero(self):
        result = calc_emissions(CarbonEntry())
        assert result["total"] == 0.0
        for cat in ("transport", "electricity", "food", "water", "shopping", "waste"):
            assert result[cat] == 0.0

    def test_car_only_isolates_transport_category(self):
        result = calc_emissions(CarbonEntry(transport_km_car=100))
        assert result["transport"] == pytest.approx(EF["car_km"] * 100, rel=0.01)
        assert result["electricity"] == 0.0
        assert result["total"] == result["transport"]

    def test_flight_is_highest_per_km(self):
        """Plane > car > bus > train (per kg-CO2/km)."""
        plane = calc_emissions(CarbonEntry(transport_km_flight=100))["transport"]
        car = calc_emissions(CarbonEntry(transport_km_car=100))["transport"]
        bus = calc_emissions(CarbonEntry(transport_km_bus=100))["transport"]
        train = calc_emissions(CarbonEntry(transport_km_train=100))["transport"]
        assert plane > car > bus > train

    def test_meat_meal_is_more_carbon_than_veg_meal(self):
        meat = calc_emissions(CarbonEntry(food_meat_meals=1))["food"]
        veg = calc_emissions(CarbonEntry(food_veg_meals=1))["food"]
        assert meat > veg

    def test_total_equals_sum_of_categories(self):
        entry = CarbonEntry(
            transport_km_car=10, electricity_kwh=5, food_meat_meals=1,
            water_liters=100, shopping_usd=20, waste_kg=1,
        )
        result = calc_emissions(entry)
        category_sum = sum(result[k] for k in
                           ("transport", "electricity", "food", "water", "shopping", "waste"))
        assert result["total"] == pytest.approx(category_sum, abs=0.05)

    def test_all_categories_rounded_to_two_decimals(self):
        result = calc_emissions(CarbonEntry(electricity_kwh=3.333333))
        for v in result.values():
            # Round-trip via formatting confirms 2dp
            assert v == round(v, 2)


class TestPasswordHashing:
    def test_hash_then_verify_round_trip(self):
        pw = "supersecret123"
        hashed = hash_pw(pw)
        assert verify_pw(pw, hashed) is True

    def test_wrong_password_does_not_verify(self):
        hashed = hash_pw("right")
        assert verify_pw("wrong", hashed) is False

    def test_hashes_are_unique_per_call(self):
        """bcrypt uses a random salt, so the same input produces different hashes."""
        assert hash_pw("x") != hash_pw("x")

    def test_hash_is_not_plaintext(self):
        assert "plaintext" not in hash_pw("plaintext")
