const imageInput = document.getElementById('imageInput');
const scanButton = document.getElementById('scanButton');
const imageContainer = document.getElementById('image-container');
const resultsContainer = document.getElementById('results-container');

let loadedImage = null; // Store the image globally for reuse

imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            displayImage(imageDataUrl);
            scanButton.style.display = 'block'; // Show the button after an image is selected
            loadedImage = imageDataUrl; // Store the image data
        };
        reader.readAsDataURL(file);
    }
});

scanButton.addEventListener('click', () => {
    resultsContainer.innerHTML = '<h2>Scanning for defects...</h2>';
    
    if (loadedImage) {
        scanForDefects(loadedImage);
    } else {
        resultsContainer.innerHTML = '<h2>Please select an image first.</h2>';
    }
});

function displayImage(dataUrl) {
    imageContainer.innerHTML = ''; // Clear previous image
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    imageContainer.appendChild(img);
}

// ----------------------------------------------------
// ACTUAL IMAGE PROCESSING CODE
// ----------------------------------------------------
function scanForDefects(imageDataUrl) {
    // Create an image element to get its dimensions
    let img = new Image();
    img.onload = function() {
        let mat = cv.imread(img); // Read the image into an OpenCV matrix
        
        // Convert the image to grayscale
        let grayMat = new cv.Mat();
        cv.cvtColor(mat, grayMat, cv.COLOR_RGBA2GRAY, 0);

        // Apply a blur to reduce noise
        let blurMat = new cv.Mat();
        cv.GaussianBlur(grayMat, blurMat, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

        // Use Canny edge detection to find potential defects (cracks, etc.)
        let edges = new cv.Mat();
        cv.Canny(blurMat, edges, 75, 150);

        // Find contours (the continuous lines of pixels that form the edges)
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let defectFound = false;
        let defectCoordinates = null;
        let largestArea = 0;

        // Loop through all contours to find the largest one (a likely defect)
        for (let i = 0; i < contours.size(); ++i) {
            let contour = contours.get(i);
            let area = cv.contourArea(contour);

            // Filter for significant contours (e.g., larger than a minimum area)
            if (area > 100) { 
                // Get the bounding rectangle for this contour
                let rect = cv.boundingRect(contour);
                
                // You can add more checks here, such as aspect ratio, to filter out noise
                if (area > largestArea) {
                    largestArea = area;
                    defectCoordinates = rect;
                    defectFound = true;
                }
            }
            contour.delete(); // Clean up memory
        }

        // Clean up matrices to free memory
        mat.delete();
        grayMat.delete();
        blurMat.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();

        // Pass the results to the display function
        displayResults(defectFound, defectCoordinates, imageDataUrl);
    };
    img.src = imageDataUrl;
}


// ----------------------------------------------------
// DISPLAY THE RESULTS WITH A HIGHLIGHTED AREA
// ----------------------------------------------------
function displayResults(defectFound, coords, imageDataUrl) {
    resultsContainer.innerHTML = ''; // Clear previous results
    
    const originalImage = new Image();
    originalImage.src = imageDataUrl;
    originalImage.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        const ctx = canvas.getContext('2d');
        
        // Draw the original image onto the canvas
        ctx.drawImage(originalImage, 0, 0);

        if (defectFound) {
            resultsContainer.innerHTML += '<h2>Defect Found!</h2>';
            // Draw a red bounding box around the detected defect
            ctx.strokeStyle = '#FF0000'; // Red color
            ctx.lineWidth = 5;
            ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
        } else {
            resultsContainer.innerHTML += '<h2>No Defects Found.</h2>';
        }

        resultsContainer.appendChild(canvas);
    };
}