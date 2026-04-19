"""
Face analysis microservice (FastAPI).

Uses MediaPipe **Tasks** Face Landmarker (not legacy `mp.solutions`), because
newer mediapipe wheels expose `tasks` only and no longer ship `mp.solutions`.
"""

import base64
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, File, UploadFile
from mediapipe.tasks.python.core import base_options
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode

MODEL_PATH = Path(__file__).resolve().parent / "face_landmarker.task"

_face_landmarker: Optional[FaceLandmarker] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _face_landmarker
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Missing face landmarker model at {MODEL_PATH}. "
            "Add face_landmarker.task next to app.py (see MediaPipe face landmarker bundle)."
        )

    options = FaceLandmarkerOptions(
        base_options=base_options.BaseOptions(model_asset_path=str(MODEL_PATH)),
        running_mode=RunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )
    _face_landmarker = FaceLandmarker.create_from_options(options)
    try:
        yield
    finally:
        if _face_landmarker is not None:
            _face_landmarker.close()
            _face_landmarker = None


app = FastAPI(lifespan=lifespan)


def get_pixel_landmarks(image_rgb: np.ndarray, x_offset: int = 0, y_offset: int = 0):
    if _face_landmarker is None:
        return None

    h, w, _ = image_rgb.shape
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
    result = _face_landmarker.detect(mp_image)

    if not result.face_landmarks:
        return None

    landmarks = result.face_landmarks[0]
    points = []
    for lm in landmarks:
        px_x = int(lm.x * w) + x_offset
        px_y = int(lm.y * h) + y_offset
        points.append((px_x, px_y))

    return points


def detect_face_shape(points):
    if not points or len(points) < 455:
        return "Unknown"

    try:
        jaw_width = abs(points[234][0] - points[454][0])
        face_length = abs(points[10][1] - points[152][1])

        if face_length == 0:
            return "Unknown"

        ratio = round(jaw_width / face_length, 2)

        if ratio > 0.78:
            return "Round"
        elif ratio < 0.72:
            return "Oval"
        else:
            return "Balanced"

    except Exception:
        return "Unknown"


def detect_contrast(image_bgr, points=None):
    try:
        if image_bgr is None or image_bgr.size == 0:
            return "Unknown"

        target_img = image_bgr

        if points:
            x_coords = [p[0] for p in points]
            y_coords = [p[1] for p in points]

            h, w, _ = image_bgr.shape

            x1 = max(0, min(x_coords))
            y1 = max(0, min(y_coords))
            x2 = min(w, max(x_coords))
            y2 = min(h, max(y_coords))

            if x2 > x1 and y2 > y1:
                target_img = image_bgr[y1:y2, x1:x2]

        if target_img is None or target_img.size == 0:
            target_img = image_bgr

        gray = cv2.cvtColor(target_img, cv2.COLOR_BGR2GRAY)
        std_dev = np.std(gray)

        if std_dev < 40:
            return "Low"
        elif std_dev < 80:
            return "Medium"
        else:
            return "High"

    except Exception:
        return "Unknown"


@app.post("/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image_bgr is None:
            return {
                "faceShape": "Unknown",
                "contrastLevel": "Unknown",
                "censoredImage": None,
            }

        h, w, _ = image_bgr.shape
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

        # Focus crop (fallback only)
        fx1, fx2 = int(w * 0.2), int(w * 0.8)
        fy1, fy2 = int(h * 0.1), int(h * 0.9)

        focused_rgb = image_rgb[fy1:fy2, fx1:fx2] if fy2 > fy1 and fx2 > fx1 else None

        points = None

        for i in range(3):
            if i == 0:
                points = get_pixel_landmarks(image_rgb)
            elif i == 1 and focused_rgb is not None:
                points = get_pixel_landmarks(focused_rgb, x_offset=fx1, y_offset=fy1)
            else:
                points = get_pixel_landmarks(image_rgb)

            if points:
                break

        if not points:
            _, buffer = cv2.imencode(".jpg", image_bgr)
            return {
                "faceShape": "Unknown",
                "contrastLevel": "Unknown",
                "censoredImage": base64.b64encode(buffer).decode("utf-8"),
            }

        face_shape = detect_face_shape(points)
        contrast = detect_contrast(image_bgr, points)

        x_coords = [p[0] for p in points]
        y_coords = [p[1] for p in points]

        bx1, by1 = max(0, min(x_coords)), max(0, min(y_coords))
        bx2, by2 = min(w, max(x_coords)), min(h, max(y_coords))

        pad_x = int((bx2 - bx1) * 0.1)
        pad_y = int((by2 - by1) * 0.1)

        cx1 = max(0, bx1 - pad_x)
        cy1 = max(0, by1 - pad_y)
        cx2 = min(w, bx2 + pad_x)
        cy2 = min(h, by2 + pad_y)

        censored_image = image_bgr.copy()

        if cx2 > cx1 and cy2 > cy1:
            # ROI for the face
            face_roi = censored_image[cy1:cy2, cx1:cx2]
            
            # Apply a strong Gaussian blur to anonymize the face
            # ksize must be odd. We'll use a size based on face width.
            ksize = int((cx2 - cx1) / 4)
            if ksize % 2 == 0: ksize += 1
            if ksize < 3: ksize = 3
            
            blurred_face = cv2.GaussianBlur(face_roi, (ksize, ksize), 30)
            censored_image[cy1:cy2, cx1:cx2] = blurred_face
            print(f"PIPELINE SUCCESS: Face detected and blurred at [{cx1}, {cy1}, {cx2}, {cy2}]")
        else:
            print("PIPELINE WARNING: Face landmarks found but bounding box invalid.")

        _, buffer = cv2.imencode(".jpg", censored_image)

        return {
            "faceShape": face_shape,
            "contrastLevel": contrast,
            "censoredImage": base64.b64encode(buffer).decode("utf-8"),
            "status": "success",
            "detectedLandmarks": len(points)
        }

    except Exception as e:
        print(f"PIPELINE ERROR: {str(e)}")
        return {
            "faceShape": "Unknown",
            "contrastLevel": "Unknown",
            "censoredImage": None,
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
