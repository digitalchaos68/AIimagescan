const referenceInput = document.getElementById('referenceImage');
const compareInput = document.getElementById('compareImage');
const compareButton = document.getElementById('compareButton');
const resultsContainer = document.getElementById('results-container');

// Parameter inputs
const thresholdInput = document.getElementById('thresholdInput');
const minAreaInput = document.getElementById('minAreaInput');
const thresholdValue = document.getElementById('thresholdValue');

let referenceImage = null;
let compareImage = null;

// Display the current value of the slider
thresholdInput.addEventListener('input', (e) => thresholdValue.textContent = e.target.value);


referenceInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { referenceImage = e.target.result; };
        reader.readAsDataURL(file);
    }
});

compareInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { compareImage = e.target.result; };
        reader.readAsDataURL(file);
    }
});

compareButton.addEventListener('click', () => {
    if (!referenceImage || !compareImage) {
        resultsContainer.innerHTML = '<h2>Please upload both images.</h2>';
        return;
    }
    
    resultsContainer.innerHTML = '<h2>Comparing images...</h2>';
    
    const threshold = parseInt(thresholdInput.value, 10);
    const minArea = parseInt(minAreaInput.value, 10);
    
    compareForDefects(referenceImage, compareImage, threshold, minArea);
});

// ----------------------------------------------------
// THE IMAGE COMPARISON ALGORITHM
// ----------------------------------------------------
function compareForDefects(refDataUrl, compDataUrl, threshold, minArea) {
    let img1 = new Image();
    img1.src = refDataUrl;
    img1.onload = () => {
        let img2 = new Image();
        img2.src = compDataUrl;
        img2.onload = () => {
            // Get dimensions and create canvases
            let width = Math.min(img1.width, img2.width);
            let height = Math.min(img1.height, img2.height);
            
            const canvas1 = document.createElement('canvas');
            canvas1.width = width;
            canvas1.height = height;
            const ctx1 = canvas1.getContext('2d');
            ctx1.drawImage(img1, 0, 0, width, height);

            const canvas2 = document.createElement('canvas');
            canvas2.width = width;
            canvas2.height = height;
            const ctx2 = canvas2.getContext('2d');
            ctx2.drawImage(img2, 0, 0, width, height);

            // Get image data from both canvases
            const data1 = ctx1.getImageData(0, 0, width, height);
            const data2 = ctx2.getImageData(0, 0, width, height);
            
            // Create a new canvas to show the differences
            const diffCanvas = document.createElement('canvas');
            diffCanvas.width = width;
            diffCanvas.height = height;
            const diffCtx = diffCanvas.getContext('2d');
            
            // Create a new empty image data
            const diffData = diffCtx.createImageData(width, height);
            
            // Find pixel differences
            for (let i = 0; i < data1.data.length; i += 4) {
                const diffR = Math.abs(data1.data[i] - data2.data[i]);
                const diffG = Math.abs(data1.data[i + 1] - data2.data[i + 1]);
                const diffB = Math.abs(data1.data[i + 2] - data2.data[i + 2]);
                const avgDiff = (diffR + diffG + diffB) / 3;

                if (avgDiff > threshold) {
                    // This is a difference, make it visible on our diff canvas
                    diffData.data[i] = 255;
                    diffData.data[i + 1] = 0;
                    diffData.data[i + 2] = 0;
                    diffData.data[i + 3] = 255; // Fully opaque
                }
            }
            
            diffCtx.putImageData(diffData, 0, 0);

            // Now, use OpenCV to find contours of the differences (to get bounding boxes)
            let diffMat = cv.imread(diffCanvas);
            cv.cvtColor(diffMat, diffMat, cv.COLOR_RGBA2GRAY, 0);
            
            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(diffMat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            let defectFound = false;
            let finalOutput = null;
            
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = width;
            outputCanvas.height = height;
            const outputCtx = outputCanvas.getContext('2d');
            outputCtx.drawImage(img2, 0, 0, width, height);

            for (let i = 0; i < contours.size(); ++i) {
                let contour = contours.get(i);
                let area = cv.contourArea(contour);

                if (area > minArea) {
                    defectFound = true;
                    let rect = cv.boundingRect(contour);
                    // Draw a red box on the output image
                    outputCtx.strokeStyle = '#FF0000';
                    outputCtx.lineWidth = 5;
                    outputCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                }
                contour.delete();
            }

            diffMat.delete();
            contours.delete();
            hierarchy.delete();

            resultsContainer.innerHTML = '';
            resultsContainer.innerHTML += '<h2>Comparison Results</h2>';
            resultsContainer.innerHTML += `<h3>Result: ${defectFound ? 'Defect Found!' : 'No Major Defects.'}</h3>`;
            resultsContainer.appendChild(outputCanvas);
        };
    };
}