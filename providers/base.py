"""
providers/base.py — Abstract provider definitions and common telemetry schemas for MALAI VIZHI.
"""

from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod


class LocationProvider(ABC):
    @abstractmethod
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search any Indian location (school, village, street, town, landmark, city)."""
        pass

    @abstractmethod
    def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Reverse geocode coordinates to human-readable address."""
        pass

    @abstractmethod
    def validate_coordinates(self, lat: float, lon: float) -> bool:
        """Validate latitude and longitude within India geographic boundaries."""
        pass


class WeatherProvider(ABC):
    @abstractmethod
    def get_weather(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Retrieve real location-specific rainfall and weather telemetry."""
        pass


class TerrainProvider(ABC):
    @abstractmethod
    def get_terrain(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Retrieve point-level elevation, slope, and aspect from Copernicus DEM."""
        pass


class SoilMoistureProvider(ABC):
    @abstractmethod
    def get_soil_moisture(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Retrieve soil moisture and ground saturation telemetry."""
        pass


class HazardDataProvider(ABC):
    @abstractmethod
    def get_hazard_data(self, lat: float, lon: float) -> Dict[str, Any]:
        """Retrieve regional geological and hydrological baseline susceptibility."""
        pass
