<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="style.css">
<title>Defect Scanner - Change-Based Analysis</title>
 
<meta name="description" content="Analyze images for defects by detecting changes and anomalies within a single image. Adjust parameters for precise results.">

<meta property="og:title" content="Defect Scanner - Change-Based Analysis">
<meta property="og:description" content="Analyze single images for defects by detecting internal changes and anomalies.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://digitalchaos68.github.io/AIimagescan/main-app.html">
<meta property="og:image" content="https://digitalchaos68.github.io/AIimagescan/image/main-app-splash.jpg">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Defect Scanner - Change-Based Analysis">
<meta name="twitter:description" content="Scan a single image for defects using a change-based AI analysis.">
<meta name="twitter:image" content="https://digitalchaos68.github.io/AIimagescan/image/main-app-splash.jpg">

<link rel="canonical" href="https://digitalchaos68.github.io/AIimagescan/main-app.html">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Defect Scanner",
  "description": "AI-powered tool for finding defects and anomalies in a single image.",
  "applicationCategory": "Utilities",
  "operatingSystem": "All",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "url": "https://digitalchaos68.github.io/AIimagescan/main-app.html",
  "logo": "https://digitalchaos68.github.io/AIimagescan/image/logo.png"
}
</script>
</script>    
</head>


// This script will check for the stored theme and apply it on page load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
});

const imageInput = document.getElementById('imageInput');
const scanButton = document.getElementById('scanButton');
const minAreaInput = document.getElementById('minAreaInput');
const minRatioInput = document.getElementById('minRatioInput');
const maxRatioInput = document.getElementById('maxRatioInput');
const minRatioValue = document.getElementById('minRatioValue');
const maxRatioValue = document.getElementById('maxRatioValue');
const imageContainer = document.getElementById('image-container');
const resultsContainer = document.getElementById('results-container');

let loadedImage = null;

// This is the key part of the fix. It ensures that when a file is selected,
// the "Check Defect" button becomes visible.
imageInput.addEventListener('change', (event) => {
    console.log('File selected. Making scan button visible.');
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            displayImage(imageDataUrl);
            scanButton.style.display = 'block'; // This line makes the button appear
            loadedImage = imageDataUrl;
        };
        reader.readAsDataURL(file);
    }
});

// The rest of the functions are the same as before, ensuring the scanning logic works correctly.
minRatioInput.addEventListener('input', (e) => minRatioValue.textContent = e.target.value);
maxRatioInput.addEventListener('input', (e) => maxRatioValue.textContent = e.target.value);

scanButton.addEventListener('click', () => {
    resultsContainer.innerHTML = '<h2>Scanning for defects...</h2>';
    
    if (loadedImage) {
        const minArea = parseInt(minAreaInput.value, 10);
        const minRatio = parseFloat(minRatioInput.value);
        const maxRatio = parseFloat(maxRatioInput.value);
        
        scanForDefects(loadedImage, minArea, minRatio, maxRatio);
    } else {
        resultsContainer.innerHTML = '<h2>Please select an image first.</h2>';
    }
});

function displayImage(dataUrl) {
    imageContainer.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    imageContainer.appendChild(img);
}

function scanForDefects(imageDataUrl, minArea, minRatio, maxRatio) {
    let img = new Image();
    img.onload = function() {
        let mat = cv.imread(img);
        
        let grayMat = new cv.Mat();
        cv.cvtColor(mat, grayMat, cv.COLOR_RGBA2GRAY, 0);

        let blurMat = new cv.Mat();
        cv.GaussianBlur(grayMat, blurMat, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

        let edges = new cv.Mat();
        cv.Canny(blurMat, edges, 75, 150);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let defectFound = false;
        let defectCoordinates = null;
        let largestArea = 0;

        for (let i = 0; i < contours.size(); ++i) {
            let contour = contours.get(i);
            let area = cv.contourArea(contour);

            let rect = cv.boundingRect(contour);
            let aspectRatio = rect.width / rect.height;

            if (area > minArea && (aspectRatio > maxRatio || aspectRatio < minRatio)) {
                if (area > largestArea) {
                    largestArea = area;
                    defectCoordinates = rect;
                    defectFound = true;
                }
            }
            contour.delete(); 
        }

        mat.delete();
        grayMat.delete();
        blurMat.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();

        displayResults(defectFound, defectCoordinates, imageDataUrl);
    };
    img.src = imageDataUrl;
}

function displayResults(defectFound, coords, imageDataUrl) {
    resultsContainer.innerHTML = '';
    
    const originalImage = new Image();
    originalImage.src = imageDataUrl;
    originalImage.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(originalImage, 0, 0);

        if (defectFound) {
            resultsContainer.innerHTML += '<h2>Defect Found!</h2>';
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 5;
            ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
        } else {
            resultsContainer.innerHTML += '<h2>No Defects Found.</h2>';
        }

        resultsContainer.appendChild(canvas);
    };
}