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

    // Image Comparison Logic
    const referenceImageInput = document.getElementById('referenceImageInput');
    const testImageInput = document.getElementById('testImageInput');
    const compareButton = document.getElementById('compareButton');
    const thresholdInput = document.getElementById('thresholdInput');
    const thresholdValue = document.getElementById('thresholdValue');
    const imageContainer = document.getElementById('image-container');
    const resultsContainer = document.getElementById('results-container');
    const loadingStatus = document.getElementById('loadingStatus');

    let loadedReferenceImage = null;
    let loadedTestImage = null;

    function checkReady() {
        if (loadedReferenceImage && loadedTestImage) {
            compareButton.style.display = 'block';
            loadingStatus.textContent = 'Both images selected. Ready to compare.';
        }
    }

    referenceImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                loadedReferenceImage = e.target.result;
                displayImage(loadedReferenceImage, 'Reference Image');
                checkReady();
            };
            reader.readAsDataURL(file);
        }
    });

    testImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                loadedTestImage = e.target.result;
                displayImage(loadedTestImage, 'Test Image');
                checkReady();
            };
            reader.readAsDataURL(file);
        }
    });

    thresholdInput.addEventListener('input', (e) => thresholdValue.textContent = e.target.value);

    compareButton.addEventListener('click', () => {
        resultsContainer.innerHTML = '<h2>Comparing images...</h2><div class="loader"></div>';
        loadingStatus.textContent = 'Comparison in progress...';
        
        if (loadedReferenceImage && loadedTestImage) {
            const threshold = parseInt(thresholdInput.value, 10);
            compareImages(loadedReferenceImage, loadedTestImage, threshold);
        } else {
            resultsContainer.innerHTML = '<h2>Please select both images first.</h2>';
            loadingStatus.textContent = 'Please select both images.';
        }
    });

    function displayImage(dataUrl, title) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = title;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;

        const wrapper = document.createElement('div');
        wrapper.className = 'image-display-wrapper';
        wrapper.appendChild(titleEl);
        wrapper.appendChild(img);
        
        imageContainer.appendChild(wrapper);
    }

    function compareImages(refDataUrl, testDataUrl, threshold) {
        let refImg = new Image();
        let testImg = new Image();
        
        refImg.onload = () => {
            testImg.onload = () => {
                try {
                    const refMat = cv.imread(refImg);
                    const testMat = cv.imread(testImg);

                    let refGray = new cv.Mat();
                    let testGray = new cv.Mat();
                    cv.cvtColor(refMat, refGray, cv.COLOR_RGBA2GRAY);
                    cv.cvtColor(testMat, testGray, cv.COLOR_RGBA2GRAY);

                    let diff = new cv.Mat();
                    cv.absdiff(refGray, testGray, diff);

                    let result = new cv.Mat();
                    cv.threshold(diff, result, threshold, 255, cv.THRESH_BINARY);

                    // Add a color mask to the original test image to highlight the defects
                    let resultColor = new cv.Mat();
                    cv.cvtColor(result, resultColor, cv.COLOR_GRAY2RGBA);
                    
                    let testColor = new cv.Mat();
                    cv.cvtColor(testMat, testColor, cv.COLOR_RGBA2RGB);

                    let defectFound = false;
                    const resultData = result.data;
                    for (let i = 0; i < resultData.length; i++) {
                        if (resultData[i] > 0) {
                            defectFound = true;
                            break;
                        }
                    }

                    displayResults(result, defectFound);

                    refMat.delete();
                    testMat.delete();
                    refGray.delete();
                    testGray.delete();
                    diff.delete();
                    result.delete();
                    resultColor.delete();
                    testColor.delete();
                } catch (err) {
                    console.error(err);
                    resultsContainer.innerHTML = `<h2 style="color: red;">Error: Failed to process image.</h2><p>${err.message}</p>`;
                    loadingStatus.textContent = 'Comparison failed. See console for details.';
                }
            };
            testImg.src = testDataUrl;
        };
        refImg.src = refDataUrl;
    }

    function displayResults(mat, defectFound) {
        resultsContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        cv.imshow(canvas, mat);
        
        resultsContainer.appendChild(canvas);
        
        const resultText = document.createElement('h2');
        if (defectFound) {
            resultText.textContent = 'Defects Found!';
            resultText.style.color = 'red';
        } else {
            resultText.textContent = 'No Defects Found.';
            resultText.style.color = 'green';
        }
        resultsContainer.prepend(resultText);
        loadingStatus.textContent = 'Comparison complete.';
    }
});
