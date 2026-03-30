import requests
import os
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class MediaRetrievalService:
    def __init__(self):
        self.pexels_api_key = os.getenv("PEXELS_API_KEY", "")
        self.pixabay_api_key = os.getenv("PIXABAY_API_KEY", "")
        self.pexels_base = "https://api.pexels.com/videos"
        self.pixabay_base = "https://pixabay.com/api/"

    def _search_pexels_videos(self, query: str, per_page: int = 5) -> List[Dict]:
        if not self.pexels_api_key:
            return []
        url = f"{self.pexels_base}/search"
        headers = {"Authorization": self.pexels_api_key}
        params = {"query": query, "per_page": per_page}
        try:
            resp = requests.get(url, headers=headers, params=params)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("videos", [])
            logger.warning(f"Pexels API error: {resp.status_code}")
        except Exception as e:
            logger.error(f"Pexels request failed: {e}")
        return []

    def _search_pixabay_videos(self, query: str, per_page: int = 5) -> List[Dict]:
        if not self.pixabay_api_key:
            return []
        params = {
            "key": self.pixabay_api_key,
            "q": query,
            "per_page": per_page,
            "video": "true",
            "safesearch": "true"
        }
        try:
            resp = requests.get(self.pixabay_base, params=params)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("hits", [])
            logger.warning(f"Pixabay API error: {resp.status_code}")
        except Exception as e:
            logger.error(f"Pixabay request failed: {e}")
        return []

    def _search_pixabay_images(self, query: str, per_page: int = 5) -> List[Dict]:
        if not self.pixabay_api_key:
            return []
        params = {
            "key": self.pixabay_api_key,
            "q": query,
            "per_page": per_page,
            "image_type": "photo",
            "safesearch": "true"
        }
        try:
            resp = requests.get(self.pixabay_base, params=params)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("hits", [])
            logger.warning(f"Pixabay API error: {resp.status_code}")
        except Exception as e:
            logger.error(f"Pixabay request failed: {e}")
        return []

    def _get_video_url(self, video_data: Dict, source: str, quality: str = "hd") -> Optional[str]:
        if source == "pexels":
            video_files = video_data.get("video_files", [])
            for file in video_files:
                if quality in file.get("quality", ""):
                    return file.get("link")
            return video_files[0].get("link") if video_files else None
        elif source == "pixabay":
            videos_dict = video_data.get("videos", {})
            if quality in videos_dict:
                return videos_dict[quality].get("url")
            for key in ["large", "medium", "small"]:
                if key in videos_dict:
                    return videos_dict[key].get("url")
        return None

    def _get_image_url(self, image_data: Dict) -> Optional[str]:
        return image_data.get("largeImageURL") or image_data.get("webformatURL")

    def search_best_video(self, query: str, target_duration: float = None) -> Optional[Dict]:
        pexels_videos = self._search_pexels_videos(query)
        pixabay_videos = self._search_pixabay_videos(query)

        candidates = []
        for vid in pexels_videos:
            candidates.append({"source": "pexels", "data": vid, "duration": vid.get("duration", 0)})
        for vid in pixabay_videos:
            candidates.append({"source": "pixabay", "data": vid, "duration": vid.get("duration", 0)})

        if not candidates:
            return None

        if target_duration is not None:
            best = min(candidates, key=lambda c: abs(c["duration"] - target_duration))
        else:
            best = candidates[0]

        url = self._get_video_url(best["data"], best["source"])
        if not url:
            return None

        return {
            "source": best["source"],
            "url": url,
            "duration": best["duration"],
            "title": best["data"].get("url") or best["data"].get("pageURL"),
            "metadata": best["data"]
        }

    def search_best_image(self, query: str) -> Optional[Dict]:
        images = self._search_pixabay_images(query)
        if not images:
            return None
        best = images[0]
        url = self._get_image_url(best)
        if not url:
            return None
        return {
            "source": "pixabay",
            "url": url,
            "title": best.get("pageURL"),
            "metadata": best
        }