class AIService {
    constructor() {
        this.deepseekApiKey = null;
        
        // Character personalities for 4-7 year olds
        this.characterPrompts = {
            maya: "You are Dr. Maya, a warm and enthusiastic science teacher for 4-7 year olds. You love making science magical and fun. Use simple words, ask curious questions, and always encourage exploration. Keep responses to 1-2 sentences. Use emojis and excited language.",
            alex: "You are Alex, a young adventure guide who loves exploring with kids. You're curious, brave, and always excited about discoveries. Speak like a friendly older sibling. Use simple words and ask 'what if' questions. Keep responses short and playful.",
            luna: "You are Luna, a gentle and helpful lab assistant. You love explaining how things work in simple ways. You're patient, kind, and always ready to help. Use gentle, encouraging language and ask if children need help understanding anything."
        };
    }

    setApiKey(deepseekKey) {
        this.deepseekApiKey = deepseekKey;
        console.log('API key set in AIService');
    }

    async generateCharacterResponse(characterId, context = 'greeting') {
        console.log(`Generating response for ${characterId}, API key present: ${!!this.deepseekApiKey}`);
        
        if (!this.deepseekApiKey) {
            console.log('No API key, using fallback');
            return this.getFallbackResponse(characterId);
        }

        const contextPrompt = context === 'greeting' ? 
            'A child just clicked on you to start a conversation. Greet them warmly and ask what they want to explore or learn about.' :
            'Continue the conversation with the child about science and exploration.';

        try {
            console.log('Making API call to DeepSeek...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.deepseekApiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: this.characterPrompts[characterId] },
                        { role: 'user', content: contextPrompt }
                    ],
                    max_tokens: 60,
                    temperature: 0.8
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`API response status: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API error ${response.status}:`, errorText);
                return `Oops! I can't talk right now (Error ${response.status}). Let's try again! 😊`;
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            
            const content = data?.choices?.[0]?.message?.content;
            if (!content) {
                console.error('Empty response from API');
                return `Hmm, I'm having trouble thinking of what to say! 🤔 ${this.getFallbackResponse(characterId)}`;
            }
            
            console.log('Successfully got AI response:', content);
            return content.trim();
            
        } catch (error) {
            console.error('API call failed:', error);
            
            if (error.name === 'AbortError') {
                return `Sorry, I'm thinking too slowly today! 🐌 ${this.getFallbackResponse(characterId)}`;
            }
            
            return `Oops! Something went wrong: ${error.message} 😅 But I can still chat! ${this.getFallbackResponse(characterId)}`;
        }
    }

    getFallbackResponse(characterId) {
        const responses = {
            maya: [
                "Hi there, little scientist! 🧪 Ready to discover something amazing today?",
                "Hello! I'm Dr. Maya! What makes you curious about the world around us?",
                "Welcome to our lab! 🌟 What would you like to explore first?"
            ],
            alex: [
                "Hey there, explorer! 🗺️ Ready for an adventure in science?",
                "Hi! I'm Alex! What mystery should we solve together today?",
                "Welcome, brave explorer! 🚀 What discovery are you excited about?"
            ],
            luna: [
                "Hello, dear! 🌙 I'm Luna, and I love helping kids learn! What can I explain for you?",
                "Hi there! 💫 I'm here to help you understand how amazing things work!",
                "Welcome! 🌸 What would you like to learn about today? I'm here to help!"
            ]
        };
        
        const charResponses = responses[characterId] || responses.maya;
        return charResponses[Math.floor(Math.random() * charResponses.length)];
    }
}