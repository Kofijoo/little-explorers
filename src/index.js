class LittleExplorersApp {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = null;
        this.characterManager = null;
        this.aiService = new AIService();
        
        this.init();
    }

    async init() {
        await this.createScene();
        this.setupVR();
        this.startRenderLoop();
        
        // Initialize character system
        this.characterManager = new CharacterManager(this.scene, this.aiService);
        this.characterManager.init();
        
        console.log('Little Explorers VR Lab initialized');
    }

    async createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        
        // Camera
        const camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), this.scene);
        this.scene.activeCamera = camera;
        
        // Lighting
        const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;
        
        // Ground
        const ground = BABYLON.MeshBuilder.CreateGround('ground', { size: 20 }, this.scene);
        const groundMaterial = new BABYLON.StandardMaterial('groundMat', this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.8, 0.4);
        ground.material = groundMaterial;
    }

    async setupVR() {
        try {
            const xr = await BABYLON.WebXRDefaultExperience.CreateAsync(this.scene, {
                floorMeshes: [this.scene.getMeshByName('ground')]
            });
            
            document.getElementById('vr-status').textContent = 'VR Ready - Click Enter VR';
            console.log('WebXR initialized successfully');
        } catch (error) {
            document.getElementById('vr-status').textContent = 'VR not available - Desktop mode';
            console.log('WebXR not available, running in desktop mode');
        }
    }

    startRenderLoop() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    // Method to set API key from UI
    setApiKey(apiKey) {
        this.aiService.setApiKey(apiKey);
        console.log('API key configured');
    }
}

// Global function for UI
function setApiKey() {
    const apiKey = document.getElementById('api-key-input').value;
    if (window.app && apiKey) {
        window.app.setApiKey(apiKey);
        alert('API key set! Now click characters to chat! 🎉');
    }
}

// Start the application when page loads
window.addEventListener('load', () => {
    window.app = new LittleExplorersApp();
});