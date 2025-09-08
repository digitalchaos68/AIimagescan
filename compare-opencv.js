// This script handles the theme toggling and the image scanning logic.
document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggling Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    function setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }

    // Set initial theme based on local storage or system preference
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        setTheme(prefersDarkScheme.matches ? 'dark' : 'light');
    }

    // Listen for system theme changes
    prefersDarkScheme.addListener((event) => {
        setTheme(event.matches ? 'dark' : 'light');
    });

    // Toggle theme on button click
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    });

    // Image Scanning Logic
    const imageInput = document.getElementById('imageInput');
    const scanButton = document.getElementById('scanButton');
    const minAreaInput = document.getElementById('minAreaInput');
    const minRatioInput = document.getElementById('minRatioInput');
    const maxRatioInput = document.getElementById('maxRatioInput');
    const minRatioValue = document.getElementById('minRatioValue');
    const maxRatioValue = document.getElementById('maxRatioValue');
    const imageContainer = document.getElementById('image-container');
    const resultsContainer = document.getElementById('results-container');
    const loadingStatus = document.getElementById('loadingStatus');

    let loadedImage = null;

    imageInput.addEventListener('change', (event) => {
        loadingStatus.textContent = 'Image selected. Click "Check Defect" to start scan.';
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageDataUrl = e.target.result;
                displayImage(imageDataUrl);
                scanButton.style.display = 'block';
                loadedImage = imageDataUrl;
            };
            reader.readAsDataURL(file);
        }
    });

    minRatioInput.addEventListener('input', (e) => minRatioValue.textContent = e.target.value);
    maxRatioInput.addEventListener('input', (e) => maxRatioValue.textContent = e.target.value);

    scanButton.addEventListener('click', () => {
        resultsContainer.innerHTML = '<h2>Scanning for defects...</h2><div class="loader"></div>';
        loadingStatus.textContent = 'Scanning in progress...';
        
        if (loadedImage) {
            const minArea = parseInt(minAreaInput.value, 10);
            const minRatio = parseFloat(minRatioInput.value);
            const maxRatio = parseFloat(maxRatioInput.value);
            
            scanForDefects(loadedImage, minArea, minRatio, maxRatio);
        } else {
            resultsContainer.innerHTML = '<h2>Please select an image first.</h2>';
            loadingStatus.textContent = 'Please select an image.';
        }
    });

    function displayImage(dataUrl) {
        imageContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '100%';
        img.className = 'rounded-lg';
        imageContainer.appendChild(img);
    }

    function scanForDefects(imageDataUrl, minArea, minRatio, maxRatio) {
        let img = new Image();
        img.onload = function() {
            try {
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
                let largestArea = 0;
                let largestDefectRect = null;

                for (let i = 0; i < contours.size(); ++i) {
                    let contour = contours.get(i);
                    let area = cv.contourArea(contour);

                    let rect = cv.boundingRect(contour);
                    let aspectRatio = rect.width / rect.height;

                    if (area > minArea && (aspectRatio < minRatio || aspectRatio > maxRatio)) {
                        if (area > largestArea) {
                            largestArea = area;
                            largestDefectRect = rect;
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
                
                displayResults(defectFound, largestDefectRect, imageDataUrl);

            } catch (err) {
                console.error(err);
                resultsContainer.innerHTML = `<h2 class="text-xl font-semibold text-red-500 mb-2">Error: Failed to process image.</h2><p class="text-sm">${err.message}</p>`;
                loadingStatus.textContent = 'Scan failed. See console for details.';
            }
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
            loadingStatus.textContent = 'Scan complete.';
        };
    }
});
