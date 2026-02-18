# Backend Setup Instructions

## Issues Fixed

1. **API Key Configuration**: Changed `.env` to include `GOOGLE_API_KEY` (backend was looking for this)
2. **Image Processing**: Improved image handling to detect MIME type automatically
3. **Error Handling**: Added comprehensive error logging and user-friendly error messages
4. **API Endpoint**: Made frontend endpoint configurable for different environments

## Setup Steps

### 1. Install Dependencies
```bash
cd backend-ai
npm install
```

### 2. Configure API Key
The `.env` file should have:
```
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 3. Start the Backend Server
```bash
node server.js
```

The server will run on `http://localhost:5000`

### 4. Configure Frontend API Endpoint

In `screens/LoadingScreen.js`, update the `API_BASE_URL`:

**For local development (same computer):**
```javascript
const API_BASE_URL = 'http://localhost:5000';
```

**For testing on physical device (same network):**
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
2. Update the URL:
```javascript
const API_BASE_URL = 'http://YOUR_IP_ADDRESS:5000';
```

**For production:**
```javascript
const API_BASE_URL = 'http://10.66.214.228:5000';
```

## Troubleshooting

### "Cannot connect to server" Error
- Make sure the backend server is running (`node server.js`)
- Check that the IP address/port in `LoadingScreen.js` matches your server
- Ensure your device and computer are on the same network
- Check firewall settings - port 5000 must be open

### "API key missing" Error
- Verify `.env` file exists in `backend-ai/` folder
- Check that `GOOGLE_API_KEY` is set correctly
- Restart the server after changing `.env`

### Image Not Being Analyzed
- Check backend console logs - it will show if image was received
- Verify image is being sent from frontend (check console logs)
- Image should be base64 format (handled automatically by expo-image-picker)

### Backend Crashes
- Check server console for detailed error messages
- Verify all dependencies are installed (`npm install`)
- Check that port 5000 is not already in use

## Testing

1. Start backend: `cd backend-ai && node server.js`
2. Start frontend: `npm start` (from project root)
3. Fill out onboarding form and upload an image
4. Check backend console for logs showing:
   - "Received request body keys"
   - "Image received, length: XXXX"
   - "Sending request to Gemini API"
   - "Received response from Gemini"
