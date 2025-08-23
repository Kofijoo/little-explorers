class CharacterManager {
    constructor(scene, aiService) {
        this.scene = scene;
        this.aiService = aiService;
        this.characters = {};
        this.currentCharacter = null;
        
        // Character definitions
        this.characterData = {
            maya: {
                name: "Dr. Maya",
                role: "Science Teacher",
                personality: "Enthusiastic, patient, loves making science fun and simple",
                position: { x: -3, y: 0, z: 0 },
                color: { r: 0.8, g: 0.4, b: 0.6 }
            },
            alex: {
                name: "Alex the Explorer",
                role: "Adventure Guide",
                personality: "Curious, brave, always ready for discovery",
                position: { x: 0, y: 0, z: 0 },
                color: { r: 0.4, g: 0.8, b: 0.9 }
            },
            luna: {
                name: "Luna the Helper",
                role: "Lab Assistant",
                personality: "Gentle, helpful, loves explaining how things work",
                position: { x: 3, y: 0, z: 0 },
                color: { r: 0.9, g: 0.8, b: 0.4 }
            }
        };
    }

    init() {
        this.createAllCharacters();
        this.setupInteractions();
        
        // Initial greeting
        setTimeout(() => {
            this.showCharacterDialogue("Welcome to Little Explorers Lab!", "Click on Dr. Maya (pink), Alex (blue), or Luna (yellow) to start chatting! 🧪✨");
        }, 2000);
    }

    createAllCharacters() {
        Object.keys(this.characterData).forEach(charId => {
            const char = this.characterData[charId];
            
            // Body (cylinder for human-like shape)
            const body = BABYLON.MeshBuilder.CreateCylinder(`${charId}_body`, {height: 2, diameter: 0.8}, this.scene);
            body.position = new BABYLON.Vector3(char.position.x, 1, char.position.z);
            
            // Head (sphere)
            const head = BABYLON.MeshBuilder.CreateSphere(`${charId}_head`, {diameter: 0.6}, this.scene);
            head.position = new BABYLON.Vector3(char.position.x, 2.3, char.position.z);
            
            // Materials
            const bodyMat = new BABYLON.StandardMaterial(`${charId}_bodyMat`, this.scene);
            bodyMat.diffuseColor = new BABYLON.Color3(char.color.r, char.color.g, char.color.b);
            body.material = bodyMat;
            
            const headMat = new BABYLON.StandardMaterial(`${charId}_headMat`, this.scene);
            headMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 0.7); // Skin tone
            head.material = headMat;
            
            // Store references
            this.characters[charId] = { body, head, data: char };
            
            // Floating animation
            let time = Math.random() * Math.PI * 2;
            this.scene.registerBeforeRender(() => {
                time += 0.01;
                const offset = Math.sin(time) * 0.1;
                body.position.y = 1 + offset;
                head.position.y = 2.3 + offset;
            });
        });
    }

    setupInteractions() {
        // Click interaction
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.pickInfo.hit) {
                const mesh = pointerInfo.pickInfo.pickedMesh;
                const charId = Object.keys(this.characters).find(id => 
                    this.characters[id].body === mesh || this.characters[id].head === mesh
                );
                
                if (charId) {
                    this.selectCharacter(charId);
                    this.startConversation(charId);
                }
            }
        });
    }

    selectCharacter(charId) {
        this.currentCharacter = charId;
        const char = this.characterData[charId];
        
        // Update character info panel if it exists
        const nameEl = document.getElementById('char-name');
        const descEl = document.getElementById('char-description');
        const personalityEl = document.getElementById('char-personality');
        const infoEl = document.getElementById('character-info');
        
        if (nameEl) nameEl.textContent = char.name;
        if (descEl) descEl.textContent = char.role;
        if (personalityEl) personalityEl.textContent = char.personality;
        if (infoEl) infoEl.style.display = 'block';
    }

    async startConversation(charId) {
        const char = this.characterData[charId];
        this.showCharacterDialogue(char.name, `${char.name} is thinking... 💭`);
        
        // Always get response (API or fallback)
        const response = await this.aiService.generateCharacterResponse(charId, 'greeting');
        this.showCharacterDialogue(char.name, response);
    }

    showCharacterDialogue(characterName, message) {
        const dialogueElement = document.getElementById('character-dialogue');
        if (dialogueElement) {
            dialogueElement.innerHTML = `<strong>${characterName}:</strong><br>${message}`;
            dialogueElement.style.display = 'block';
            
            // Auto-hide after 6 seconds
            setTimeout(() => {
                dialogueElement.style.display = 'none';
            }, 6000);
        }
        
        console.log(`${characterName}: ${message}`);
    }
}