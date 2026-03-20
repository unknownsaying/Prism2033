// dynamic-scene-loader.js
// Advanced scene loader for 3D fraction engines with color coordinate system
// Handles dynamic loading, scene management, and real-time color updates

class DynamicSceneLoader {
    constructor(options = {}) {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.labelRenderer = null;
        this.controls = null;
        this.coordinatePanel = null;
        this.colorPalette = [];
        this.activeColor = { r: 100, g: 150, b: 255, h: 210, s: 100, l: 70 };
        this.animationFrame = null;
        this.clock = new THREE.Clock();
        this.options = {
            containerId: options.containerId || 'scene-container',
            backgroundColor: options.backgroundColor || 0x0a0a1a,
            cameraPosition: options.cameraPosition || { x: 12, y: 8, z: 22 },
            enableShadows: options.enableShadows !== false,
            enableAutoRotate: options.enableAutoRotate !== false,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.createScene();
        this.createCamera();
        this.createRenderers();
        this.createControls();
        this.setupLights();
        this.createCoordinatePanel();
        this.setupEventListeners();
        this.startAnimation();
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.backgroundColor);
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(
            this.options.cameraPosition.x,
            this.options.cameraPosition.y,
            this.options.cameraPosition.z
        );
        this.camera.lookAt(0, 2, 0);
    }
    
    createRenderers() {
        // WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = this.options.enableShadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        
        // CSS2 Renderer for labels
        this.labelRenderer = new THREE.CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.left = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(this.labelRenderer.domElement);
    }
    
    createControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = this.options.enableAutoRotate;
        this.controls.autoRotateSpeed = 0.8;
        this.controls.enableZoom = true;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.target.set(0, 2, 0);
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404060);
        this.scene.add(ambientLight);
        
        // Main directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 15, 10);
        dirLight.castShadow = true;
        dirLight.receiveShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        const d = 20;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 25;
        this.scene.add(dirLight);
        
        // Fill lights with colors
        const colorLight1 = new THREE.PointLight(0xffaa44, 0.6);
        colorLight1.position.set(8, 5, 8);
        this.scene.add(colorLight1);
        
        const colorLight2 = new THREE.PointLight(0x44ffaa, 0.5);
        colorLight2.position.set(-8, 4, 8);
        this.scene.add(colorLight2);
        
        // Store lights for dynamic updates
        this.lights = { dirLight, colorLight1, colorLight2 };
    }
    
    createCoordinatePanel() {
        // Create coordinate panel container
        const panel = document.createElement('div');
        panel.className = 'coordinate-panel';
        panel.id = 'dynamic-coordinate-panel';
        
        // Panel header
        panel.innerHTML = `
            <h3>🎨 RGB · HSL · XYZ COORDINATES</h3>
            
            <div class="color-preview" id="colorPreview" style="background-color: rgb(100, 150, 255);"></div>
            
            <div class="coord-grid">
                <div class="coord-item coord-rgb">
                    <div class="coord-label">RGB</div>
                    <div class="coord-value">
                        <span id="rgbR">100</span>
                        <span id="rgbG">150</span>
                        <span id="rgbB">255</span>
                        <div class="rgb-preview" style="background: rgb(100, 150, 255);"></div>
                    </div>
                </div>
                
                <div class="coord-item coord-hsl">
                    <div class="coord-label">HSL</div>
                    <div class="coord-value">
                        <span id="hslH">210°</span>
                        <span id="hslS">100%</span>
                        <span id="hslL">70%</span>
                        <div class="hsl-ring"></div>
                    </div>
                </div>
            </div>
            
            <div class="xyz-block">
                <div class="xyz-coord">
                    <div class="xyz-axis">
                        <span class="axis-x">X</span>
                        <span id="coordX">0.00</span>
                    </div>
                    <div class="xyz-axis">
                        <span class="axis-y">Y</span>
                        <span id="coordY">0.00</span>
                    </div>
                    <div class="xyz-axis">
                        <span class="axis-z">Z</span>
                        <span id="coordZ">0.00</span>
                    </div>
                </div>
                <div style="font-size:0.8rem; color:#88aaff; margin-top:8px;">
                    Camera Position | Target: <span id="targetPos">0,2,0</span>
                </div>
            </div>
            
            <div class="color-swatches" id="colorSwatches">
                <div class="color-swatch" style="background: #ff6666;" data-color="255,102,102"></div>
                <div class="color-swatch" style="background: #66ff66;" data-color="102,255,102"></div>
                <div class="color-swatch" style="background: #6666ff;" data-color="102,102,255"></div>
                <div class="color-swatch" style="background: #ffaa44;" data-color="255,170,68"></div>
                <div class="color-swatch" style="background: #aa88ff;" data-color="170,136,255"></div>
                <div class="color-swatch" style="background: #88ffaa;" data-color="136,255,170"></div>
            </div>
            
            <input type="range" class="coord-slider" id="hueSlider" min="0" max="360" value="210">
            
            <div class="color-stats">
                <div class="stat-item">
                    <div class="stat-label">LUMINANCE</div>
                    <div class="stat-number" id="luminance">0.45</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">SATURATION</div>
                    <div class="stat-number" id="saturation">100%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">BRIGHTNESS</div>
                    <div class="stat-number" id="brightness">70%</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.coordinatePanel = panel;
        
        // Add event listeners for interactive elements
        this.setupPanelInteractions();
    }
    
    setupPanelInteractions() {
        const hueSlider = document.getElementById('hueSlider');
        if (hueSlider) {
            hueSlider.addEventListener('input', (e) => {
                const hue = parseInt(e.target.value);
                this.updateColorFromHue(hue);
            });
        }
        
        // Color swatch clicks
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const color = e.target.dataset.color.split(',').map(Number);
                this.setActiveColor({ r: color[0], g: color[1], b: color[2] });
                
                // Remove selected class from all swatches
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                e.target.classList.add('selected');
            });
        });
    }
    
    updateColorFromHue(hue) {
        // Convert HSL to RGB
        const s = 100;
        const l = 70;
        const rgb = this.hslToRgb(hue, s, l);
        
        this.activeColor = {
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            h: hue,
            s: s,
            l: l
        };
        
        this.updateColorDisplay();
        this.updateSceneColors();
    }
    
    setActiveColor(color) {
        this.activeColor = {
            r: color.r,
            g: color.g,
            b: color.b,
            h: this.rgbToHsl(color.r, color.g, color.b).h,
            s: this.rgbToHsl(color.r, color.g, color.b).s,
            l: this.rgbToHsl(color.r, color.g, color.b).l
        };
        
        this.updateColorDisplay();
        this.updateSceneColors();
    }
    
    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }
    
    updateColorDisplay() {
        // Update RGB values
        document.getElementById('rgbR').textContent = this.activeColor.r;
        document.getElementById('rgbG').textContent = this.activeColor.g;
        document.getElementById('rgbB').textContent = this.activeColor.b;
        
        // Update HSL values
        document.getElementById('hslH').textContent = this.activeColor.h + '°';
        document.getElementById('hslS').textContent = this.activeColor.s + '%';
        document.getElementById('hslL').textContent = this.activeColor.l + '%';
        
        // Update color preview
        const preview = document.getElementById('colorPreview');
        if (preview) {
            preview.style.backgroundColor = `rgb(${this.activeColor.r}, ${this.activeColor.g}, ${this.activeColor.b})`;
        }
        
        // Update RGB preview dots
        const rgbPreview = document.querySelector('.rgb-preview');
        if (rgbPreview) {
            rgbPreview.style.backgroundColor = `rgb(${this.activeColor.r}, ${this.activeColor.g}, ${this.activeColor.b})`;
        }
        
        // Calculate and update statistics
        const luminance = (0.299 * this.activeColor.r + 0.587 * this.activeColor.g + 0.114 * this.activeColor.b) / 255;
        document.getElementById('luminance').textContent = luminance.toFixed(2);
        document.getElementById('saturation').textContent = this.activeColor.s + '%';
        document.getElementById('brightness').textContent = this.activeColor.l + '%';
        
        // Update hue slider
        const hueSlider = document.getElementById('hueSlider');
        if (hueSlider) {
            hueSlider.value = this.activeColor.h;
        }
    }
    
    updateSceneColors() {
        // Update lights with new color influence
        if (this.lights) {
            const color = new THREE.Color(`rgb(${this.activeColor.r}, ${this.activeColor.g}, ${this.activeColor.b})`);
            
            // Update directional light color slightly
            this.lights.dirLight.color.setHSL(this.activeColor.h / 360, 0.8, 0.9);
            
            // Update point lights with complementary colors
            const compHue = (this.activeColor.h + 180) % 360;
            this.lights.colorLight1.color.setHSL(this.activeColor.h / 360, 0.8, 0.6);
            this.lights.colorLight2.color.setHSL(compHue / 360, 0.8, 0.6);
        }
        
        // Dispatch custom event for other components to react
        const event = new CustomEvent('colorUpdate', { 
            detail: { color: this.activeColor } 
        });
        window.dispatchEvent(event);
    }
    
    updateCoordinates() {
        // Update camera position coordinates
        const pos = this.camera.position;
        document.getElementById('coordX').textContent = pos.x.toFixed(2);
        document.getElementById('coordY').textContent = pos.y.toFixed(2);
        document.getElementById('coordZ').textContent = pos.z.toFixed(2);
        
        // Update target position
        const target = this.controls.target;
        document.getElementById('targetPos').textContent = 
            `${target.x.toFixed(1)},${target.y.toFixed(1)},${target.z.toFixed(1)}`;
    }
    
    setupEventListeners() {
        // Mouse move for coordinate updates
        window.addEventListener('mousemove', (e) => {
            // Optional: update something based on mouse
        });
        
        // Resize handler
        window.addEventListener('resize', () => this.handleResize());
        
        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'c' || e.key === 'C') {
                // Toggle coordinate panel
                this.coordinatePanel.style.display = 
                    this.coordinatePanel.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    addBasicEnvironment() {
        // Add grid
        const gridHelper = new THREE.GridHelper(30, 20, 0x88aaff, 0x335588);
        gridHelper.position.y = -0.01;
        this.scene.add(gridHelper);
        
        // Add stars
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 800;
        const starPositions = new Float32Array(starsCount * 3);
        for (let i = 0; i < starsCount; i++) {
            const r = 40 + Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            starPositions[i*3] = Math.sin(phi) * Math.cos(theta) * r;
            starPositions[i*3+1] = Math.sin(phi) * Math.sin(theta) * r * 0.4;
            starPositions[i*3+2] = Math.cos(phi) * r;
        }
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starsMaterial = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.3 });
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
        this.stars = stars;
    }
    
    loadFractionScene(fractionData) {
        // Load fraction-specific scene elements
        // This can be customized based on which fraction engine is being loaded
        
        const fractionGroup = new THREE.Group();
        
        if (fractionData && fractionData.numbers) {
            fractionData.numbers.forEach((num, idx) => {
                const x = (num - 6) * 2.8;
                const clusterGroup = this.createFractionCluster(num, fractionData.squares[idx], idx, x);
                fractionGroup.add(clusterGroup);
            });
        }
        
        this.scene.add(fractionGroup);
        this.fractionGroup = fractionGroup;
        
        return fractionGroup;
    }
    
    createFractionCluster(num, square, index, xPos) {
        const cluster = new THREE.Group();
        cluster.position.set(xPos, 0, 0);
        
        // Base cube
        const colors = [0xff5555, 0xffaa44, 0xffdd44, 0x88dd55, 0x55ccff, 0xaa88ff, 0xff88cc];
        const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const mat = new THREE.MeshStandardMaterial({ color: colors[index] });
        const cube = new THREE.Mesh(geo, mat);
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.position.y = 0.75;
        cluster.add(cube);
        
        return cluster;
    }
    
    startAnimation() {
        const animate = () => {
            this.animationFrame = requestAnimationFrame(animate);
            
            const delta = this.clock.getDelta();
            
            // Update controls
            this.controls.update();
            
            // Update coordinate display
            this.updateCoordinates();
            
            // Rotate stars if they exist
            if (this.stars) {
                this.stars.rotation.y += 0.0002;
            }
            
            // Render
            this.renderer.render(this.scene, this.camera);
            this.labelRenderer.render(this.scene, this.camera);
        };
        
        animate();
    }
    
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    // Method to load a specific scene configuration
    loadSceneConfig(config) {
        if (config.background) {
            this.scene.background = new THREE.Color(config.background);
        }
        
        if (config.cameraPosition) {
            this.camera.position.copy(config.cameraPosition);
        }
        
        if (config.lights) {
            // Update light configurations
        }
        
        if (config.environment !== false) {
            this.addBasicEnvironment();
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicSceneLoader;
}

// Auto-initialize if data attribute exists
document.addEventListener('DOMContentLoaded', () => {
    const sceneContainer = document.getElementById('scene-container');
    if (sceneContainer) {
        const loader = new DynamicSceneLoader({
            containerId: 'scene-container',
            backgroundColor: 0x0a0a2a,
            cameraPosition: { x: 15, y: 10, z: 25 }
        });
        
        // Add basic environment
        loader.addBasicEnvironment();
        
        // Store globally for debugging
        window.sceneLoader = loader;
    }
});
