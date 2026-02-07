document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const generateBtn = document.getElementById('generateBtn');
    const qrImage = document.getElementById('qrImage');
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const loader = document.getElementById('loader');
    const qrActions = document.getElementById('qrActions');
    const downloadBtn = document.getElementById('downloadBtn');
    const historyContainer = document.getElementById('historyContainer');

    // Load initial history
    fetchHistory();

    generateBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();

        if (!url) {
            alert("Please enter a URL first!");
            return;
        }

        // UI Reset
        qrImage.classList.add('hidden');
        qrPlaceholder.classList.add('hidden');
        loader.classList.remove('hidden');
        qrActions.classList.add('hidden');

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url }),
            });

            if (!response.ok) {
                throw new Error('Generation failed');
            }

            const data = await response.json();

            // Handle Deduplication UI check
            if (data.message.includes("history")) {
                console.log("Retrieved from history");
            }

            const imagePath = data.qr_image.replace(/\\/g, '/');

            // Image load handler
            const tempImg = new Image();
            tempImg.src = imagePath;
            tempImg.onload = () => {
                qrImage.src = imagePath;
                loader.classList.add('hidden');
                qrImage.classList.remove('hidden');
                // Trigger animation
                qrImage.classList.remove('pop-in');
                void qrImage.offsetWidth; // trigger reflow
                qrImage.classList.add('pop-in');

                qrActions.classList.remove('hidden');
                downloadBtn.href = imagePath;
                fetchHistory();
            };

            // Allow loader to stay until image loads, but handle error if image fails
            tempImg.onerror = () => {
                loader.classList.add('hidden');
                alert("Failed to load image");
            }

        } catch (error) {
            console.error('Error:', error);
            loader.classList.add('hidden');
            qrPlaceholder.classList.remove('hidden');
            alert('Failed to generate QR code. Please try again.');
        }
    });

    // Clear History Logic
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to clear your entire history?")) {
                try {
                    const res = await fetch('/clear_history', { method: 'POST' });
                    if (res.ok) {
                        historyContainer.innerHTML = '';
                    } else {
                        alert("Failed to clear history");
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        });
    }

    async function fetchHistory() {
        try {
            const response = await fetch('/history');
            const data = await response.json();

            historyContainer.innerHTML = '';

            // Group By Category logic
            const grouped = data.reduce((acc, item) => {
                const category = item.category || 'Other';
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
            }, {});

            // Sort Categories (Custom order if needed, or alphabetical)
            const categories = Object.keys(grouped).sort();

            categories.forEach(category => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'category-group';

                // Header with count
                const header = document.createElement('h3');
                header.innerHTML = `${category} <span>${grouped[category].length}</span>`;
                groupDiv.appendChild(header);

                // Grid
                const gridDiv = document.createElement('div');
                gridDiv.className = 'history-grid';

                grouped[category].forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'history-item';
                    itemDiv.title = item.url;

                    const img = document.createElement('img');
                    img.src = item.image_path.replace(/\\/g, '/');
                    img.alt = 'QR History';

                    itemDiv.appendChild(img);

                    // Click to restore
                    itemDiv.addEventListener('click', () => {
                        urlInput.value = item.url;
                        qrImage.src = img.src;
                        downloadBtn.href = img.src;

                        qrPlaceholder.classList.add('hidden');
                        qrImage.classList.remove('hidden');
                        qrActions.classList.remove('hidden');

                        // Scroll top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });


                    gridDiv.appendChild(itemDiv);
                });

                groupDiv.appendChild(gridDiv);
                historyContainer.appendChild(groupDiv);
            });

        } catch (error) {
            console.error("Failed to load history", error);
        }
    }

    // --- Dynamic Background & Theme (V3.3) ---
    initBackground();

    function initBackground() {
        const canvas = document.getElementById('bgCanvas');
        const themeToggle = document.getElementById('themeToggle');
        let themeIcon; // Declare themeIcon here

        if (!canvas) return;

        if (themeToggle) { // Initialize themeIcon only if themeToggle exists
            themeIcon = themeToggle.querySelector('i');
        }

        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let gridCells = [];

        // Configuration
        const MODULE_SIZE = 25;
        const GAP = 2;
        const SPOTLIGHT_RADIUS = 250;
        const MAX_INTENSITY = 0.4;
        const PARTICLE_COUNT = 40;

        let mouse = { x: -1000, y: -1000 };
        let currentIntensity = MAX_INTENSITY;
        let targetIntensity = MAX_INTENSITY;

        // Theme State
        let isLightMode = false;

        // Theme Handling
        function toggleTheme() {
            isLightMode = !isLightMode;
            document.body.classList.toggle('light-mode', isLightMode);
            themeIcon.className = isLightMode ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }

        if (themeToggle) {
            const themeIcon = themeToggle.querySelector('i');
            themeToggle.addEventListener('click', () => {
                toggleTheme();
                themeIcon.className = isLightMode ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            });
        }

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            createQRLayout();
            createParticles();
        }

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', e => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;

            const isOverContent = e.target.closest('.brand-section, .input-area, .history-section, .premium-btn');

            if (isOverContent) {
                targetIntensity = 0;
            } else {
                targetIntensity = MAX_INTENSITY;
            }
        });

        class GridCell {
            constructor(x, y, isFinder) {
                this.x = x;
                this.y = y;
                this.size = MODULE_SIZE;
                this.isFinder = isFinder;
                this.baseAlpha = 0.02;
            }

            draw() {
                const cx = this.x + this.size / 2;
                const cy = this.y + this.size / 2;
                const dx = mouse.x - cx;
                const dy = mouse.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let alpha = this.baseAlpha;

                // Spotlight effect
                if (dist < SPOTLIGHT_RADIUS && currentIntensity > 0.001) {
                    const intensity = 1 - (dist / SPOTLIGHT_RADIUS);
                    // Smoother Glow Curve
                    let boost = Math.pow(intensity, 3) * currentIntensity;
                    if (this.isFinder) boost *= 1.2;
                    alpha += boost;
                }

                if (alpha > 0.01) {
                    // Dynamic Color based on Theme
                    const cVal = isLightMode ? 0 : 255; // 0 (Black) for Light, 255 (White) for Dark
                    ctx.fillStyle = `rgba(${cVal}, ${cVal}, ${cVal}, ${alpha})`;
                    ctx.fillRect(this.x, this.y, this.size - GAP, this.size - GAP);
                }
            }
        }

        class Particle {
            constructor() {
                this.init();
            }

            init() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
                this.size = Math.random() * 2 + 1;
                this.alpha = Math.random() * 0.4 + 0.1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Mouse interaction
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 200) {
                    const force = (200 - dist) / 200;
                    const angle = Math.atan2(dy, dx);
                    this.x -= Math.cos(angle) * force * 1.5;
                    this.y -= Math.sin(angle) * force * 1.5;
                }

                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }

            draw() {
                // Particles fade out near spotlight center to not compete with QR
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                let pAlpha = this.alpha;

                if (dist < 100) pAlpha *= 0.2;

                // Particles: Blueish in Dark, Dark Blue in Light
                if (isLightMode) {
                    ctx.fillStyle = `rgba(30, 64, 175, ${pAlpha * 0.5})`; // Dark Blue
                } else {
                    ctx.fillStyle = `rgba(100, 200, 255, ${pAlpha * 0.5})`; // Light Blue
                }

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function createQRLayout() {
            gridCells = [];
            const cols = Math.ceil(width / MODULE_SIZE);
            const rows = Math.ceil(height / MODULE_SIZE);

            // Helper to check if x,y is inside a Finder Pattern (7x7 modules)
            // Finder Patterns locations: Top-Left, Bottom-Left, Top-Right (conceptually)
            // We scale "7 modules" to whatever our grid index is.
            const isFinderPattern = (c, r) => {
                const limit = 7;
                // Top Left
                if (c < limit && r < limit) return true;
                // Top Right (approximate based on screen width - simplistic approach)
                if (c > cols - limit - 1 && r < limit) return true;
                // Bottom Left
                if (c < limit && r > rows - limit - 1) return true;
                return false;
            };

            // Generate Grid
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * MODULE_SIZE;
                    const y = r * MODULE_SIZE;

                    if (isFinderPattern(c, r)) {
                        // Deterministic Finder Pattern Structure
                        // 7x7 outer ring, 5x5 gap, 3x3 inner block
                        // Simplified logic for "is filled":
                        // FL = Finder Local coords
                        let flc = c;
                        let flr = r;
                        if (c > cols - 10) flc = c - (cols - 7);
                        if (r > rows - 10) flr = r - (rows - 7);

                        // Check if it's a "black" module in a standard finder pattern
                        // Ring 0 (Outer): 0..6
                        // Ring 1 (Inner Gap): 1..5 -> White
                        // Ring 2 (Inner Box): 2..4 -> Black

                        // BUT, to keep it looking cool and not strictly valid code:
                        // Just make standard square rings
                        // Normalize local coords to 0..6
                        const lc = c < 7 ? c : (c > cols - 8 ? c - (cols - 7) : c);
                        const lr = r < 7 ? r : (r > rows - 8 ? r - (rows - 7) : r);

                        const isBorder = lc === 0 || lc === 6 || lr === 0 || lr === 6;
                        const isInnerBox = (lc >= 2 && lc <= 4) && (lr >= 2 && lr <= 4);

                        if (isBorder || isInnerBox) {
                            gridCells.push(new GridCell(x, y, true));
                        }
                    } else {
                        // Random Data Modules (The "Noise")
                        // 40% chance of being a block
                        if (Math.random() > 0.6) {
                            gridCells.push(new GridCell(x, y, false));
                        }
                    }
                }
            }
        }

        function createParticles() {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(new Particle());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            // Super Smooth Interpolation (0.03 is very slow and smooth)
            currentIntensity += (targetIntensity - currentIntensity) * 0.03;

            // Draw Grid
            gridCells.forEach(cell => cell.draw());

            // Draw Particles
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            requestAnimationFrame(animate);
        }

        // Start
        resize();
        animate();
    }
});
