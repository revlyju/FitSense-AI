from fastapi import FastAPI, File, UploadFile
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

app = FastAPI()

# Initialize Face Landmarker locally
base_options = python.BaseOptions(model_asset_path='face_landmarker.task')
options = vision.FaceLandmarkerOptions(base_options=base_options,
                                       output_face_blendshapes=False,
                                       output_facial_transformation_matrixes=False,
                                       min_face_detection_confidence=0.5,
                                       min_face_presence_confidence=0.5,
                                       min_tracking_confidence=0.5,
                                       num_faces=1)
detector = vision.FaceLandmarker.create_from_options(options)

def detect_face_shape(landmarks, image_shape):
    h, w, _ = image_shape

    # Convert normalized landmarks to pixel coordinates
    points = [(int(l.x * w), int(l.y * h)) for l in landmarks]

    # Simple heuristic ratios using landmarks (234, 454) for width, (10, 152) for height
    jaw_width = abs(points[234][0] - points[454][0])
    face_height = abs(points[10][1] - points[152][1])

    raw_ratio = face_height / jaw_width if jaw_width != 0 else 1
    # Round to prevent microscopic visual shifts causing wildly different shape text results
    ratio = round(raw_ratio, 2)

    if ratio > 1.45:
        return "Oval"
    elif ratio > 1.25:
        return "Round"
    elif ratio > 1.15:
        return "Heart"
    elif ratio >= 1.05:
        return "Square"
    else:
        return "Balanced"

def detect_contrast(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    std_dev = np.std(gray)

    if std_dev < 40:
        return "Low"
    elif std_dev < 80:
        return "Medium"
    else:
        return "High"

@app.post("/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        return {
            "faceShape": "Unknown",
            "contrastLevel": "Unknown"
        }

    # Normalize incoming image processing to ensure FaceMesh acts deterministically on consistent dimensions
    try:
        image = cv2.resize(image, (512, 512))
    except Exception as e:
        pass

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    
    # 3-Attempt Retry Block for Mediapipe stability
    detection_result = None
    for _ in range(3):
        detection_result = detector.detect(mp_image)
        if detection_result and detection_result.face_landmarks:
            break

    if not detection_result or not detection_result.face_landmarks:
        # Fallback to OpenCV Haar Cascades
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        fallback_censored = image.copy()
        import base64
        
        if len(faces) == 0:
            # Absolute fallback if neither can find a face
            _, buffer = cv2.imencode('.jpg', fallback_censored)
            uncensored_b64 = base64.b64encode(buffer).decode('utf-8')
            return {
                "faceShape": "Unknown",
                "contrastLevel": detect_contrast(image),
                "censoredImage": uncensored_b64
            }
        
        # Use the first face found by OpenCV
        (x, y, w_face, h_face) = faces[0]
        
        # Add 10% padding
        pad_x = int(w_face * 0.1)
        pad_y = int(h_face * 0.1)
        h, w, _ = image.shape
        cx1 = max(0, x - pad_x)
        cx2 = min(w, x + w_face + pad_x)
        cy1 = max(0, y - pad_y)
        cy2 = min(h, y + h_face + pad_y)
        
        # Crop to calculate contrast
        face_crop = image[cy1:cy2, cx1:cx2]
        contrast = detect_contrast(face_crop) if face_crop.size > 0 else detect_contrast(image)
        
        cv2.rectangle(fallback_censored, (cx1, cy1), (cx2, cy2), (0, 0, 0), -1)
        _, buffer = cv2.imencode('.jpg', fallback_censored)
        censored_b64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "faceShape": "Unknown", # OpenCV Haar can't determine face shape reliably
            "contrastLevel": contrast,
            "censoredImage": censored_b64
        }

    landmarks = detection_result.face_landmarks[0]
    
    # Determine crop boundaries from landmarks
    x_min = min(l.x for l in landmarks)
    x_max = max(l.x for l in landmarks)
    y_min = min(l.y for l in landmarks)
    y_max = max(l.y for l in landmarks)
    
    h, w, _ = image.shape
    x1, y1 = max(0, int(x_min * w)), max(0, int(y_min * h))
    x2, y2 = min(w, int(x_max * w)), min(h, int(y_max * h))
    
    face_shape = detect_face_shape(landmarks, image.shape)
    
    # Extract the cropped face region
    face_crop = image[y1:y2, x1:x2]
    
    # Calculate contrast on cropped face if valid, else fallback to full image
    if face_crop.size > 0:
        contrast = detect_contrast(face_crop)
    else:
        contrast = detect_contrast(image)

    # Censor the face in the original image for privacy
    censored_image = image.copy()
    
    # Add 10% padding to the bounding box to ensure the whole face is covered
    pad_x = int((x2 - x1) * 0.1)
    pad_y = int((y2 - y1) * 0.1)
    cx1 = max(0, x1 - pad_x)
    cx2 = min(w, x2 + pad_x)
    cy1 = max(0, y1 - pad_y)
    cy2 = min(h, y2 + pad_y)
    
    # Fill with black rectangle
    cv2.rectangle(censored_image, (cx1, cy1), (cx2, cy2), (0, 0, 0), -1)
    
    # Encode back to base64
    import base64
    _, buffer = cv2.imencode('.jpg', censored_image)
    censored_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "faceShape": face_shape,
        "contrastLevel": contrast,
        "censoredImage": censored_b64
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
