/**
 * ==========================================================================
 * NEBULON A.I. — DEEP SPACE INTELLIGENCE CORE
 * High-End Aerospace Assistant Engine Powered Exclusively by Gemini 3.7 Flash
 * ==========================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. CONFIGURATION & CONSTANTS
  // --------------------------------------------------------------------------
  const DEFAULT_API_KEY = 'AQ.Ab8RN6Ie5Ztj9Oz2o4iJr4gBkW0WpYryxAGHB6tLVIQsksOEYA';
  const PRIMARY_MODEL = 'gemini-3.7-flash';
  const FALLBACK_MODEL = 'gemini-3.6-flash';

  const SYSTEM_INSTRUCTION = `You are NEBULON A.I. (Orbital Identity // NASA 2070 Standard), an elite, ultra-advanced Deep Space Intelligence Core.
You possess authoritative mastery across aerospace engineering, celestial mechanics, orbital dynamics, satellite anomaly diagnostics, space missions, planetary science, and cosmology.

Key Directives:
1. Provide mathematically rigorous, scientifically precise, and articulate answers on spacecraft, satellites, orbital motions (Keplerian, Lagrange, Hohmann), space defects/anomalies (ADCS faults, reaction wheel jitter, solar array degradation, single event upsets), moons, planets, asteroids/NEOs, and deep space exploration.
2. Structure your output with clean, rich Markdown: use bold key terms, tables for comparisons, bullet lists for parameters, equations when explaining physics, and diagnostic checklists for anomaly troubleshooting.
3. Tone: Authoritative, mission-critical, helpful, and highly intelligent (JARVIS / NASA Flight Director caliber).
4. CRITICAL: NEVER use LaTeX math notation such as $$...$$, $...$, \frac{}{}, \text{}, \hbar, or ANY backslash commands. Write ALL equations and mathematical expressions in plain Unicode text using symbols like × ÷ π ² ³ √ → ≈ ≤ ≥ ∞ Σ ∫ ∂ ∇ ℏ etc. For fractions write them as (numerator)/(denominator). For example write "T_H = (ℏc³)/(8πGMk_B)" NOT "$$T_H = \\frac{\\hbar c^3}{8\\pi G M k_B}$$".
5. At the very end of your response, always provide 3-4 ultra-relevant, concise follow-up query suggestions prefixed by "FOLLOW_UP_SUGGESTIONS:" on a separate final line, separated by vertical bars '|'. Example:
FOLLOW_UP_SUGGESTIONS: What causes reaction wheel bearing micro-vibrations? | How are GEO satellite inclination drifts corrected? | What are the thermal impacts during lunar eclipse passes?`;

  // Categorized Deep Space Quick Prompts
  const EXPLORATION_CATEGORIES = {
    defects: [
      { tag: 'ANOMALY', q: 'What are the main causes and diagnostic methods for GEO satellite reaction wheel bearing failures?' },
      { tag: 'TELEMETRY', q: 'How do satellite operators detect and mitigate Solar Array Single Event Burnouts (SEB)?' },
      { tag: 'PROPULSION', q: 'What causes thruster valve stiction in hydrazine bipropellant systems during orbit-raising?' }
    ],
    satellites: [
      { tag: 'ORBIT', q: 'Explain SGP4 orbital propagation and how Doppler shift residuals are used to track uncooperative satellites.' },
      { tag: 'CONSTELLATION', q: 'How does Starlink autonomously execute collision avoidance maneuvers using onboard optical and ephemeris data?' },
      { tag: 'DEORBIT', q: 'What are the active debris removal methods for defunct high-area-to-mass ratio orbital debris in LEO?' }
    ],
    moons_planets: [
      { tag: 'LUNAR', q: 'What is the surface composition and permanently shadowed region (PSR) water-ice distribution at the Lunar South Pole (Shackleton Crater)?' },
      { tag: 'OCEAN WORLD', q: 'What cryovolcanic plume evidence exists on Enceladus and Europa indicating subsurface hydrothermal activity?' },
      { tag: 'MARS', q: 'How does the Perseverance rover MOXIE experiment extract oxygen from the Martian CO2 atmosphere?' }
    ],
    physics_motion: [
      { tag: 'MECHANICS', q: 'Explain the mathematical physics behind Sun-Earth Lagrange Point L2 halo orbits used by the James Webb Space Telescope.' },
      { tag: 'RELATIVITY', q: 'How does general relativistic frame dragging (Lense-Thirring effect) perturb satellite orbital planes?' },
      { tag: 'SLINGSHOT', q: 'Derive how gravity assist hyperbolic flybys transfer orbital angular momentum from a planet to a spacecraft.' }
    ]
  };

  // --------------------------------------------------------------------------
  // 2. APPLICATION STATE
  // --------------------------------------------------------------------------
  // Always prioritize the active working key
  const savedKey = localStorage.getItem('nebulon_gemini_api_key');
  const activeKey = (savedKey && !savedKey.includes('AQ.Ab8RN6KJC9T2KhGtZKE1w954VTWEKtLIyiZv336q4P8')) ? savedKey : DEFAULT_API_KEY;
  localStorage.setItem('nebulon_gemini_api_key', activeKey);

  const state = {
    apiKey: activeKey,
    conversationHistory: [],
    isProcessing: false,
    voiceEnabled: true,
    speechRate: parseFloat(localStorage.getItem('nebulon_voice_rate') || '1.0'),
    speechPitch: parseFloat(localStorage.getItem('nebulon_voice_pitch') || '1.0'),
    selectedLanguage: localStorage.getItem('nebulon_voice_lang') || 'en-US',
    selectedPersona: localStorage.getItem('nebulon_voice_persona') || 'jarvis',
    activeVoice: null,
    audioSynthEnabled: true,
    lastLatencyMs: 0,
    activeModelUsed: PRIMARY_MODEL,
    sessionStartTime: Date.now(),
    pinnedMessages: [],
    historySessions: JSON.parse(localStorage.getItem('nebulon_assistant_history') || '[]')
  };

  // --------------------------------------------------------------------------
  // 3. PROCEDURAL SCI-FI AUDIO SYNTHESIZER (Web Audio API)
  // --------------------------------------------------------------------------
  class AudioFxEngine {
    constructor() {
      this.ctx = null;
      this.analyser = null;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
          this.analyser = this.ctx.createAnalyser();
          this.analyser.fftSize = 64;
          this.initialized = true;
        }
      } catch (e) {
        console.warn('Web Audio API not supported on this platform:', e);
      }
    }

    playChirp(type = 'transmit') {
      if (!state.audioSynthEnabled) return;
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (type === 'transmit') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === 'receive') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'click') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        }
      } catch (err) {
        // Audio synthesis soft ignore
      }
    }
  }

  const audioFx = new AudioFxEngine();

  // --------------------------------------------------------------------------
  // 4. RESILIENT GEMINI CLIENT (With Auto-Retry & High-Demand Failover)
  // --------------------------------------------------------------------------
  class GeminiClient {
    constructor() {
      this.retryCount = 0;
    }

    async generate(promptText) {
      const startTime = performance.now();
      const apiKey = state.apiKey.trim();

      if (!apiKey) {
        throw new Error('API Key missing. Please provide a valid Gemini API key in settings.');
      }

      // Build conversation contents
      const contents = [];
      const recentHistory = state.conversationHistory.slice(-10);
      for (const item of recentHistory) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: promptText }]
      });

      const payload = {
        contents: contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          maxOutputTokens: 2500
        }
      };

      // Model priority list: Primary is 3.7 Flash; Fallback is 3.6 Flash if Google server is at high demand (503/429)
      const candidateModels = [PRIMARY_MODEL, FALLBACK_MODEL];
      let lastError = null;

      for (const model of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            // If temporary overload (503 or 429), retry with backoff or move to next candidate
            if (response.status === 503 || response.status === 429) {
              const errData = await response.json().catch(() => ({}));
              console.warn(`High demand detected on ${model} (HTTP ${response.status}). Retrying...`, errData.error?.message);
              await new Promise(resolve => setTimeout(resolve, attempt * 800));
              continue;
            }

            if (!response.ok) {
              let errMessage = `HTTP ${response.status} ${response.statusText}`;
              try {
                const errData = await response.json();
                if (errData.error && errData.error.message) {
                  errMessage = errData.error.message;
                }
              } catch (e) {}
              throw new Error(errMessage);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) {
              throw new Error(`Empty response from ${model}.`);
            }

            state.activeModelUsed = model;
            state.lastLatencyMs = Math.round(performance.now() - startTime);

            // Parse text and follow-up suggestions
            let cleanText = rawText;
            let suggestions = [];

            const followUpMatch = rawText.match(/FOLLOW_UP_SUGGESTIONS:\s*(.+)$/im);
            if (followUpMatch) {
              cleanText = rawText.replace(/FOLLOW_UP_SUGGESTIONS:\s*(.+)$/im, '').trim();
              suggestions = followUpMatch[1].split('|').map(s => s.trim()).filter(s => s.length > 3);
            }

            if (suggestions.length === 0) {
              suggestions = [
                'What are the primary anomaly detection limits for this subsystem?',
                'How does space radiation affect long-term mission reliability?',
                'What are the orbital Keplerian parameters for this mission phase?'
              ];
            }

            return {
              answer: cleanText,
              followUps: suggestions,
              latencyMs: state.lastLatencyMs,
              modelUsed: model
            };

          } catch (err) {
            lastError = err;
            console.warn(`Request failed on ${model} (attempt ${attempt}):`, err.message);
          }
        }
      }

      throw lastError || new Error('All aerospace intelligence endpoints exhausted.');
    }
  }

  const geminiClient = new GeminiClient();

  // --------------------------------------------------------------------------
  // 5. MULTI-LANGUAGE VOICE SYNTHESIS & RECOGNITION STUDIO
  // --------------------------------------------------------------------------
  class VoiceStudio {
    constructor() {
      this.synth = window.speechSynthesis;
      this.voices = [];
      this.recognition = null;
      this.isListening = false;
      this.isSpeaking = false;
      this.currentChunks = [];
      this.currentChunkIndex = 0;
      this._resumeTimer = null;
      this._activeUtterance = null;
      this.accumulatedTranscript = '';
      this.silenceTimer = null;
      this.isManuallyStopped = false;
      this.initVoices();
      this.initRecognition();
    }

    initVoices() {
      if (!this.synth) return;
      const load = () => {
        const v = this.synth.getVoices();
        if (v && v.length > 0) {
          this.voices = v;
          this.populateLanguageOptions();
          this.updateActiveVoice();
          console.log(`[NEBULON AUDIO] ${v.length} voice synthesizers available.`);
        }
      };

      load();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = load;
      }
      try {
        window.speechSynthesis.addEventListener('voiceschanged', load);
      } catch (e) {}

      // Asynchronous voice loading retries for Chromium
      setTimeout(load, 300);
      setTimeout(load, 1200);
    }

    populateLanguageOptions() {
      const select = document.getElementById('voice-lang-select');
      if (!select) return;

      const supportedLangs = [
        { code: 'en-US', name: 'English (United States)' },
        { code: 'en-GB', name: 'English (United Kingdom)' },
        { code: 'en-IN', name: 'English (India)' },
        { code: 'en-AU', name: 'English (Australia)' },
        { code: 'es-ES', name: 'Spanish (Español)' },
        { code: 'fr-FR', name: 'French (Français)' },
        { code: 'de-DE', name: 'German (Deutsch)' },
        { code: 'ja-JP', name: 'Japanese (日本語)' },
        { code: 'zh-CN', name: 'Chinese (Mandarin)' },
        { code: 'hi-IN', name: 'Hindi (हिन्दी)' },
        { code: 'ru-RU', name: 'Russian (Русский)' },
        { code: 'it-IT', name: 'Italian (Italiano)' }
      ];

      select.innerHTML = '';
      supportedLangs.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.name;
        if (lang.code === state.selectedLanguage) opt.selected = true;
        select.appendChild(opt);
      });
    }

    updateActiveVoice() {
      if (!this.synth) return;
      if (!this.voices || this.voices.length === 0) {
        this.voices = this.synth.getVoices();
      }
      if (!this.voices || this.voices.length === 0) return;

      const langCode = state.selectedLanguage || 'en-US';
      const langPrefix = langCode.slice(0, 2).toLowerCase();

      // Filter by target language
      const langVoices = this.voices.filter(v => 
        v.lang && (v.lang.toLowerCase() === langCode.toLowerCase() || 
                   v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix))
      );

      // Prioritize natural/neural/Google/Microsoft voices
      const pool = langVoices.length > 0 ? langVoices : this.voices;
      let chosen = pool.find(v => /Natural|Neural|Google|Premium/i.test(v.name)) 
                || pool.find(v => /Microsoft/i.test(v.name))
                || pool.find(v => v.default)
                || pool[0];

      state.activeVoice = chosen;
    }

    setPersona(personaKey) {
      state.selectedPersona = personaKey;
      localStorage.setItem('nebulon_voice_persona', personaKey);

      if (personaKey === 'jarvis') {
        state.speechPitch = 0.95;
        state.speechRate = 1.05;
      } else if (personaKey === 'eva') {
        state.speechPitch = 1.15;
        state.speechRate = 1.0;
      } else if (personaKey === 'hal') {
        state.speechPitch = 0.72;
        state.speechRate = 0.88;
      } else if (personaKey === 'aria') {
        state.speechPitch = 1.25;
        state.speechRate = 1.1;
      }

      // Update UI slider values
      const pitchSlider = document.getElementById('voice-pitch-slider');
      const rateSlider = document.getElementById('voice-rate-slider');
      const pitchVal = document.getElementById('voice-pitch-val');
      const rateVal = document.getElementById('voice-rate-val');

      if (pitchSlider) pitchSlider.value = state.speechPitch;
      if (rateSlider) rateSlider.value = state.speechRate;
      if (pitchVal) pitchVal.textContent = state.speechPitch.toFixed(2) + 'x';
      if (rateVal) rateVal.textContent = state.speechRate.toFixed(2) + 'x';

      localStorage.setItem('nebulon_voice_pitch', state.speechPitch);
      localStorage.setItem('nebulon_voice_rate', state.speechRate);
    }

    cleanTextForSpeech(text) {
      if (!text) return '';
      return text
        .replace(/\$\$[\s\S]*?\$\$/g, ' equation omitted ')
        .replace(/\$([^$]+?)\$/g, (m, inner) => inner.replace(/\\[a-zA-Z]+/g, '').replace(/[{}_^]/g, ' ').trim())
        .replace(/```[\s\S]*?```/g, ' Code block omitted. ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#{1,6}\s?/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\|/g, ' ')
        .replace(/-{3,}/g, '')
        .replace(/FOLLOW_UP_SUGGESTIONS:[\s\S]*$/i, '')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/[{}]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    splitIntoSentences(text) {
      const clean = this.cleanTextForSpeech(text);
      if (!clean) return [];

      // Split into sentences at . ! ? or newlines
      const raw = clean.match(/[^.!?\n]+[.!?\n]*/g) || [clean];
      const chunks = [];

      for (let s of raw) {
        s = s.trim();
        if (!s) continue;
        if (s.length > 180) {
          const parts = s.match(/[^,;:]+[,;:]*/g) || [s];
          let buf = '';
          for (const p of parts) {
            if ((buf + p).length > 160 && buf.length > 0) {
              chunks.push(buf.trim());
              buf = p;
            } else {
              buf += (buf ? ' ' : '') + p;
            }
          }
          if (buf.trim()) chunks.push(buf.trim());
        } else {
          chunks.push(s);
        }
      }

      return chunks.filter(c => c.length > 1);
    }

    speak(text, force = false) {
      if (!this.synth) {
        console.warn('[NEBULON AUDIO] SpeechSynthesis not supported in this browser.');
        return;
      }
      if (!force && !state.voiceEnabled) return;

      this.cancel();

      const chunks = this.splitIntoSentences(text);
      if (!chunks || chunks.length === 0) return;

      this.currentChunks = chunks;
      this.currentChunkIndex = 0;
      this.isSpeaking = true;

      // Chrome unpause
      try {
        if (this.synth.paused) this.synth.resume();
      } catch (e) {}

      setCoreState('speaking');

      // Brief tick after cancel before starting utterance queue
      setTimeout(() => {
        this.playNextChunk();
      }, 60);
    }

    playNextChunk() {
      if (!this.isSpeaking || this.currentChunkIndex >= this.currentChunks.length) {
        this.finishSpeech();
        return;
      }

      const chunkText = this.currentChunks[this.currentChunkIndex];
      this.updateActiveVoice();

      const utter = new SpeechSynthesisUtterance(chunkText);
      if (state.activeVoice) {
        utter.voice = state.activeVoice;
        utter.lang = state.activeVoice.lang || state.selectedLanguage || 'en-US';
      } else {
        utter.lang = state.selectedLanguage || 'en-US';
      }

      utter.rate = Math.max(0.6, Math.min(1.8, state.speechRate || 1.0));
      utter.pitch = Math.max(0.5, Math.min(1.6, state.speechPitch || 1.0));

      let chunkDone = false;
      const advance = () => {
        if (chunkDone) return;
        chunkDone = true;
        this.currentChunkIndex++;
        if (this.isSpeaking) {
          this.playNextChunk();
        }
      };

      utter.onstart = () => {
        setCoreState('speaking');
      };

      utter.onend = () => {
        advance();
      };

      utter.onerror = (e) => {
        console.warn('[NEBULON AUDIO] Utterance note:', e.error || 'skipped');
        advance();
      };

      this._activeUtterance = utter;

      // Always unfreeze before speak
      try {
        if (this.synth.paused) this.synth.resume();
      } catch (e) {}

      this.synth.speak(utter);

      this.startResumeHeartbeat();
    }

    startResumeHeartbeat() {
      if (this._resumeTimer) clearInterval(this._resumeTimer);
      this._resumeTimer = setInterval(() => {
        if (!this.isSpeaking || !this.synth) {
          clearInterval(this._resumeTimer);
          this._resumeTimer = null;
          return;
        }
        if (this.synth.paused) {
          this.synth.resume();
        }
      }, 2500);
    }

    finishSpeech() {
      this.isSpeaking = false;
      this.currentChunks = [];
      this.currentChunkIndex = 0;
      this._activeUtterance = null;
      if (this._resumeTimer) {
        clearInterval(this._resumeTimer);
        this._resumeTimer = null;
      }
      setCoreState('idle');
    }

    cancel() {
      this.isSpeaking = false;
      this.currentChunks = [];
      this.currentChunkIndex = 0;
      this._activeUtterance = null;

      if (this._resumeTimer) {
        clearInterval(this._resumeTimer);
        this._resumeTimer = null;
      }

      if (this.synth) {
        try {
          this.synth.cancel();
          if (this.synth.paused) this.synth.resume();
        } catch (e) {}
      }

      setCoreState('idle');
    }

    initRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[NEBULON AUDIO] SpeechRecognition API not supported on this browser.');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // Continuous listening — never cut off after a few words
      this.recognition.interimResults = true; // Live interim text streaming
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = state.selectedLanguage || 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.accumulatedTranscript = '';
        this.isManuallyStopped = false;

        const micBtn = document.getElementById('mic-trigger-btn');
        if (micBtn) micBtn.classList.add('recording');

        const input = document.getElementById('command-input');
        if (input) {
          input.value = '';
          input.placeholder = 'Listening... Speak your complete question (click mic or pause when done)';
        }

        setCoreState('listening');
        audioFx.playChirp('transmit');
        console.log('[NEBULON VOICE INPUT] Continuous audio receiver active.');
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + ' ';
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        if (finalChunk) {
          this.accumulatedTranscript += finalChunk;
        }

        const fullSentence = (this.accumulatedTranscript + ' ' + interimTranscript).trim();
        const input = document.getElementById('command-input');
        if (input && fullSentence) {
          input.value = fullSentence;
        }

        // Natural pause auto-submit: 2.2s after speaking full question
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          if (this.isListening && fullSentence.length > 2) {
            console.log('[NEBULON VOICE INPUT] Speech finalized:', fullSentence);
            this.stopListeningAndSubmit();
          }
        }, 2200);
      };

      this.recognition.onerror = (e) => {
        console.warn('[NEBULON VOICE INPUT] Speech recognition note:', e.error);
        if (e.error === 'no-speech') {
          return;
        }
        this.cleanupRecognitionUI();
      };

      this.recognition.onend = () => {
        if (this.isListening && !this.isManuallyStopped) {
          const input = document.getElementById('command-input');
          const currentText = (input ? input.value : this.accumulatedTranscript).trim();
          if (currentText.length > 2) {
            this.stopListeningAndSubmit();
            return;
          }
        }
        this.cleanupRecognitionUI();
      };
    }

    stopListeningAndSubmit() {
      this.isManuallyStopped = true;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      const input = document.getElementById('command-input');
      const textToSubmit = (input && input.value ? input.value : this.accumulatedTranscript).trim();

      if (this.recognition && this.isListening) {
        try {
          this.recognition.stop();
        } catch (e) {}
      }

      this.cleanupRecognitionUI();

      if (textToSubmit.length > 0) {
        submitQuery(textToSubmit);
      }
    }

    cleanupRecognitionUI() {
      this.isListening = false;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      const micBtn = document.getElementById('mic-trigger-btn');
      if (micBtn) micBtn.classList.remove('recording');

      const input = document.getElementById('command-input');
      if (input) {
        input.placeholder = 'Transmit an aerospace query on satellites, orbital defects, Keplerian physics, moons, or probes…';
      }

      if (!state.isProcessing) {
        setCoreState('idle');
      }
    }

    toggleListening() {
      this.cancel(); // Halt any ongoing voice output immediately
      if (!this.recognition) {
        alert('Speech Recognition is not supported by your browser. Please use Chrome, Edge, or Brave.');
        return;
      }

      if (this.isListening) {
        this.stopListeningAndSubmit();
      } else {
        this.recognition.lang = state.selectedLanguage || 'en-US';
        this.accumulatedTranscript = '';
        this.isManuallyStopped = false;
        try {
          this.recognition.start();
        } catch (err) {
          console.warn('[NEBULON VOICE INPUT] Start caught:', err);
          try {
            this.recognition.stop();
            setTimeout(() => {
              try { this.recognition.start(); } catch (e) {}
            }, 120);
          } catch (e) {}
        }
      }
    }
  }

  const voiceStudio = new VoiceStudio();

  // --------------------------------------------------------------------------
  // 6. LATEX CONVERTER & MARKDOWN UI RENDERING ENGINE
  // --------------------------------------------------------------------------

  /**
   * Convert LaTeX math notation to readable plain-text Unicode.
   * Handles $$...$$ block equations and $...$ inline math.
   */
  function convertLatexToPlainText(latex) {
    let t = latex;

    // Greek letters
    t = t.replace(/\\alpha/g, 'α');   t = t.replace(/\\beta/g, 'β');
    t = t.replace(/\\gamma/g, 'γ');   t = t.replace(/\\delta/g, 'δ');
    t = t.replace(/\\epsilon/g, 'ε'); t = t.replace(/\\varepsilon/g, 'ε');
    t = t.replace(/\\zeta/g, 'ζ');    t = t.replace(/\\eta/g, 'η');
    t = t.replace(/\\theta/g, 'θ');   t = t.replace(/\\iota/g, 'ι');
    t = t.replace(/\\kappa/g, 'κ');   t = t.replace(/\\lambda/g, 'λ');
    t = t.replace(/\\mu/g, 'μ');      t = t.replace(/\\nu/g, 'ν');
    t = t.replace(/\\xi/g, 'ξ');      t = t.replace(/\\pi/g, 'π');
    t = t.replace(/\\rho/g, 'ρ');     t = t.replace(/\\sigma/g, 'σ');
    t = t.replace(/\\tau/g, 'τ');     t = t.replace(/\\upsilon/g, 'υ');
    t = t.replace(/\\phi/g, 'φ');     t = t.replace(/\\varphi/g, 'φ');
    t = t.replace(/\\chi/g, 'χ');     t = t.replace(/\\psi/g, 'ψ');
    t = t.replace(/\\omega/g, 'ω');
    t = t.replace(/\\Gamma/g, 'Γ');   t = t.replace(/\\Delta/g, 'Δ');
    t = t.replace(/\\Theta/g, 'Θ');   t = t.replace(/\\Lambda/g, 'Λ');
    t = t.replace(/\\Sigma/g, 'Σ');   t = t.replace(/\\Phi/g, 'Φ');
    t = t.replace(/\\Psi/g, 'Ψ');     t = t.replace(/\\Omega/g, 'Ω');

    // Special symbols
    t = t.replace(/\\hbar/g, 'ℏ');     t = t.replace(/\\ell/g, 'ℓ');
    t = t.replace(/\\infty/g, '∞');    t = t.replace(/\\nabla/g, '∇');
    t = t.replace(/\\partial/g, '∂');   t = t.replace(/\\forall/g, '∀');
    t = t.replace(/\\exists/g, '∃');    t = t.replace(/\\neg/g, '¬');
    t = t.replace(/\\wedge/g, '∧');     t = t.replace(/\\vee/g, '∨');
    t = t.replace(/\\oplus/g, '⊕');     t = t.replace(/\\otimes/g, '⊗');
    t = t.replace(/\\subset/g, '⊂');    t = t.replace(/\\supset/g, '⊃');
    t = t.replace(/\\cup/g, '∪');       t = t.replace(/\\cap/g, '∩');
    t = t.replace(/\\in\b/g, '∈');

    // Operators & relations
    t = t.replace(/\\approx/g, '≈');    t = t.replace(/\\times/g, '×');
    t = t.replace(/\\cdot/g, '·');      t = t.replace(/\\pm/g, '±');
    t = t.replace(/\\mp/g, '∓');        t = t.replace(/\\leq/g, '≤');
    t = t.replace(/\\geq/g, '≥');       t = t.replace(/\\neq/g, '≠');
    t = t.replace(/\\equiv/g, '≡');     t = t.replace(/\\propto/g, '∝');
    t = t.replace(/\\sim/g, '~');       t = t.replace(/\\ll/g, '≪');
    t = t.replace(/\\gg/g, '≫');        t = t.replace(/\\sum/g, 'Σ');
    t = t.replace(/\\prod/g, 'Π');      t = t.replace(/\\int/g, '∫');

    // Arrows
    t = t.replace(/\\rightarrow/g, '→');  t = t.replace(/\\leftarrow/g, '←');
    t = t.replace(/\\Rightarrow/g, '⇒');  t = t.replace(/\\Leftarrow/g, '⇐');
    t = t.replace(/\\leftrightarrow/g, '↔');

    // Structural commands
    t = t.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
    t = t.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');
    t = t.replace(/\\text\{([^}]*)\}/g, '$1');
    t = t.replace(/\\textrm\{([^}]*)\}/g, '$1');
    t = t.replace(/\\mathrm\{([^}]*)\}/g, '$1');
    t = t.replace(/\\mathbf\{([^}]*)\}/g, '$1');
    t = t.replace(/\\textbf\{([^}]*)\}/g, '$1');
    t = t.replace(/\\mathit\{([^}]*)\}/g, '$1');
    t = t.replace(/\\mathcal\{([^}]*)\}/g, '$1');
    t = t.replace(/\\vec\{([^}]*)\}/g, '$1⃗');
    t = t.replace(/\\hat\{([^}]*)\}/g, '$1̂');
    t = t.replace(/\\bar\{([^}]*)\}/g, '$1̄');
    t = t.replace(/\\tilde\{([^}]*)\}/g, '$1̃');
    t = t.replace(/\\dot\{([^}]*)\}/g, '$1̇');
    t = t.replace(/\\ddot\{([^}]*)\}/g, '$1̈');
    t = t.replace(/\\left/g, '');  t = t.replace(/\\right/g, '');
    t = t.replace(/\\big/g, '');   t = t.replace(/\\Big/g, '');
    t = t.replace(/\\bigg/g, '');  t = t.replace(/\\Bigg/g, '');
    t = t.replace(/\\quad/g, '  '); t = t.replace(/\\qquad/g, '   ');
    t = t.replace(/\\,/g, ' ');    t = t.replace(/\\;/g, ' ');
    t = t.replace(/\\!/g, '');

    // Subscripts & superscripts
    t = t.replace(/_\{([^}]*)\}/g, '_$1');
    t = t.replace(/\^\{([^}]*)\}/g, (m, exp) => {
      const superMap = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ','+':'⁺','-':'⁻' };
      if (exp.length <= 3 && [...exp].every(c => superMap[c])) {
        return [...exp].map(c => superMap[c]).join('');
      }
      return '^' + exp;
    });
    t = t.replace(/\^2/g, '²');  t = t.replace(/\^3/g, '³');
    t = t.replace(/\^4/g, '⁴');  t = t.replace(/\^n/g, 'ⁿ');

    // Remaining backslash commands & braces
    t = t.replace(/\\[a-zA-Z]+/g, '');
    t = t.replace(/[{}]/g, '');
    t = t.replace(/\s{2,}/g, ' ').trim();

    return t;
  }

  function stripLatex(text) {
    if (!text) return text;

    // Block equations: $$...$$
    let cleaned = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
      const converted = convertLatexToPlainText(inner.trim());
      return '\n' + converted + '\n';
    });

    // Inline equations: $...$
    cleaned = cleaned.replace(/\$([^$\n]+?)\$/g, (match, inner) => {
      return convertLatexToPlainText(inner.trim());
    });

    return cleaned;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMarkdown(md) {
    if (!md) return '';

    // First pass: convert any LaTeX notation to readable Unicode text
    md = stripLatex(md);

    // Code blocks with syntax highlighting placeholders
    let html = md.replace(/```([a-z]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
      const escaped = escapeHtml(code.trim());
      const blockId = 'code-' + Math.random().toString(36).substr(2, 9);
      return `<div class="code-block-container" style="position:relative; margin: 10px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(14,24,60,0.85); padding:6px 12px; border-radius:6px 6px 0 0; font-family:var(--as-font-mono); font-size:0.68rem; color:var(--as-cyan); border:1px solid rgba(98,232,255,0.3); border-bottom:none;">
          <span>${lang ? lang.toUpperCase() : 'CODE // DATA'}</span>
          <button class="msg-action-btn" onclick="navigator.clipboard.writeText(document.getElementById('${blockId}').innerText); alert('Code copied to clipboard');" style="padding:2px 8px;">COPY</button>
        </div>
        <pre style="border-radius:0 0 6px 6px; margin:0;"><code id="${blockId}">${escaped}</code></pre>
      </div>`;
    });

    // Tables
    html = html.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match) => {
      const rows = match.trim().split(/\r?\n/).map(r => r.trim());
      if (rows.length < 2) return match;

      let tableHtml = '<table>';
      rows.forEach((row, idx) => {
        if (row.includes('---')) return; // separator row
        const cells = row.split('|').slice(1, -1).map(c => c.trim());
        if (idx === 0) {
          tableHtml += '<thead><tr>' + cells.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>';
        }
      });
      tableHtml += '</tbody></table>';
      return tableHtml;
    });

    // Inline Code
    html = html.replace(/`([^`]+)`/g, (m, c) => `<code>${escapeHtml(c)}</code>`);

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    // Paragraphs
    const paras = html.split(/\n\n+/);
    html = paras.map(p => {
      p = p.trim();
      if (!p) return '';
      if (/^<(h[1-6]|ul|table|pre|blockquote|div)/i.test(p)) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  // --------------------------------------------------------------------------
  // 7. CORE UI CONTROLLERS & TRANSCRIPT MANAGEMENT
  // --------------------------------------------------------------------------
  const transcriptEl = document.getElementById('transcript-stream');
  const coreStageEl = document.getElementById('holographic-core-stage');
  const coreMarqueeEl = document.getElementById('core-status-marquee');
  const statusBeaconEl = document.getElementById('status-beacon');
  const statusChipTextEl = document.getElementById('status-chip-text');
  const followupRibbonEl = document.getElementById('followup-ribbon');
  const commandInputEl = document.getElementById('command-input');
  const latencyBadgeEl = document.getElementById('telemetry-latency');
  const tokenCounterEl = document.getElementById('telemetry-tokens');

  let estimatedTokensTotal = 1420;

  function setCoreState(mode) {
    if (!coreStageEl) return;
    coreStageEl.classList.remove('listening', 'thinking', 'speaking');
    if (statusBeaconEl) statusBeaconEl.classList.remove('busy', 'speaking', 'error');

    if (mode === 'listening') {
      coreStageEl.classList.add('listening');
      if (statusBeaconEl) statusBeaconEl.classList.add('busy');
      if (coreMarqueeEl) coreMarqueeEl.textContent = 'TRANSMISSION RECEIVER ACTIVE';
      if (statusChipTextEl) statusChipTextEl.textContent = 'LISTENING';
    } else if (mode === 'thinking') {
      coreStageEl.classList.add('thinking');
      if (statusBeaconEl) statusBeaconEl.classList.add('busy');
      if (coreMarqueeEl) coreMarqueeEl.textContent = 'GEMINI 3.7 FLASH INFERENCE IN PROGRESS';
      if (statusChipTextEl) statusChipTextEl.textContent = 'PROCESSING';
    } else if (mode === 'speaking') {
      coreStageEl.classList.add('speaking');
      if (statusBeaconEl) statusBeaconEl.classList.add('speaking');
      if (coreMarqueeEl) coreMarqueeEl.textContent = 'TRANSMITTING NEBULON SYNTHESIS';
      if (statusChipTextEl) statusChipTextEl.textContent = 'VOICE ACTIVE';
    } else {
      if (coreMarqueeEl) coreMarqueeEl.textContent = 'STANDING BY FOR TRANSMISSION';
      if (statusChipTextEl) statusChipTextEl.textContent = 'CORE NOMINAL';
    }
  }

  function appendMessage(text, role = 'bot', followUps = []) {
    if (!transcriptEl) return null;

    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${role}`;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const metaTag = role === 'user' ? 'COMMANDER // ORBITAL STATION' : 'NEBULON A.I. // GEMINI 3.7 FLASH CORE';

    let contentHtml = '';
    if (role === 'user') {
      contentHtml = `<div class="msg-content"><p>${escapeHtml(text)}</p></div>`;
    } else {
      contentHtml = `<div class="msg-content">${renderMarkdown(text)}</div>`;
    }

    bubble.innerHTML = `
      <div class="msg-bubble-meta">
        <span>${metaTag}</span>
        <span style="font-family:var(--as-font-mono); font-size:0.62rem; color:var(--as-text-muted);">${timestamp} UTC</span>
      </div>
      ${contentHtml}
      <div class="msg-actions">
        <button class="msg-action-btn action-copy" title="Copy to clipboard">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>COPY</span>
        </button>
        ${role === 'bot' ? `
          <button class="msg-action-btn action-speak" title="Listen to voice synthesis">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            <span>LISTEN</span>
          </button>
        ` : ''}
        <button class="msg-action-btn action-pin" title="Pin to active telemetry">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
          <span>PIN</span>
        </button>
      </div>
    `;

    // Action button listeners
    const copyBtn = bubble.querySelector('.action-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        audioFx.playChirp('click');
        copyBtn.querySelector('span').textContent = 'COPIED!';
        setTimeout(() => { copyBtn.querySelector('span').textContent = 'COPY'; }, 2000);
      });
    }

    const speakBtn = bubble.querySelector('.action-speak');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        audioFx.playChirp('click');
        const span = speakBtn.querySelector('span');
        if (span) {
          span.textContent = 'PLAYING...';
          setTimeout(() => {
            if (span) span.textContent = 'LISTEN';
          }, 4000);
        }
        voiceStudio.speak(text, true);
      });
    }

    const pinBtn = bubble.querySelector('.action-pin');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => {
        audioFx.playChirp('click');
        state.pinnedMessages.push(text.slice(0, 100));
        alert('Query pinned to telemetry log buffer.');
      });
    }

    transcriptEl.appendChild(bubble);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;

    // Update follow-up ribbon if provided
    if (followUps && followUps.length > 0) {
      renderFollowUpSuggestions(followUps);
    }

    return bubble;
  }

  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator-msg';
    indicator.className = 'msg-bubble bot';
    indicator.style.maxWidth = '180px';
    indicator.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span style="font-family:var(--as-font-mono); font-size:0.66rem; color:var(--as-cyan); margin-left:6px;">SYNTHESIZING</span>
      </div>
    `;
    transcriptEl.appendChild(indicator);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator-msg');
    if (indicator) indicator.remove();
  }

  function renderFollowUpSuggestions(suggestions) {
    if (!followupRibbonEl) return;
    followupRibbonEl.innerHTML = `
      <div class="followup-ribbon-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>RELATED RADAR</span>
      </div>
    `;

    suggestions.forEach(query => {
      const chip = document.createElement('button');
      chip.className = 'followup-chip';
      chip.innerHTML = `
        <span>${escapeHtml(query)}</span>
        <span class="chip-arrow">↗</span>
      `;
      chip.addEventListener('click', () => {
        audioFx.playChirp('click');
        submitQuery(query);
      });
      followupRibbonEl.appendChild(chip);
    });
  }

  // --------------------------------------------------------------------------
  // 8. QUERY EXECUTION PIPELINE
  // --------------------------------------------------------------------------
  async function submitQuery(rawQuery) {
    const query = (rawQuery || '').trim();
    if (!query || state.isProcessing) return;

    // Immediately halt reading out previous answer
    voiceStudio.cancel();

    state.isProcessing = true;
    audioFx.playChirp('transmit');

    // Append User Message
    appendMessage(query, 'user');
    state.conversationHistory.push({ role: 'user', text: query });

    // Clear input
    if (commandInputEl) commandInputEl.value = '';

    // UI state
    setCoreState('thinking');
    showTypingIndicator();

    try {
      const result = await geminiClient.generate(query);
      removeTypingIndicator();

      // Append Bot Message with Follow-Ups
      appendMessage(result.answer, 'bot', result.followUps);
      state.conversationHistory.push({ role: 'model', text: result.answer });

      // Telemetry update
      if (latencyBadgeEl) latencyBadgeEl.textContent = `${result.latencyMs}ms`;
      estimatedTokensTotal += Math.round((query.length + result.answer.length) / 3.8);
      if (tokenCounterEl) tokenCounterEl.textContent = `${estimatedTokensTotal.toLocaleString()} TKN`;

      const modelBadgeSpan = document.querySelector('.model-badge span');
      if (modelBadgeSpan && result.modelUsed) {
        modelBadgeSpan.textContent = result.modelUsed.toUpperCase().replace(/-/g, ' ');
      }

      // Save to recent sessions
      saveHistoryItem(query);

      // Voice read aloud
      audioFx.playChirp('receive');
      voiceStudio.speak(result.answer);

    } catch (err) {
      removeTypingIndicator();
      setCoreState('idle');

      const errorMsg = `**Telemetry Signal Degraded:** ${err.message}\n\n*Diagnostics:* Please check your API key in settings or verify that the network connection to Google Gemini 3.7 Flash is active.`;
      appendMessage(errorMsg, 'bot');
      if (statusBeaconEl) statusBeaconEl.classList.add('error');
    } finally {
      state.isProcessing = false;
    }
  }

  function saveHistoryItem(query) {
    const exists = state.historySessions.find(h => h.query === query);
    if (!exists) {
      state.historySessions.unshift({ query, timestamp: Date.now() });
      if (state.historySessions.length > 20) state.historySessions.pop();
      localStorage.setItem('nebulon_assistant_history', JSON.stringify(state.historySessions));
      renderHistoryList();
    }
  }

  function renderHistoryList() {
    const listEl = document.getElementById('history-session-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (state.historySessions.length === 0) {
      listEl.innerHTML = '<div style="font-family:var(--as-font-mono); font-size:0.68rem; color:var(--as-text-dim); text-align:center; padding:10px;">NO RECORDED QUERIES</div>';
      return;
    }

    state.historySessions.slice(0, 8).forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.textContent = item.query;
      div.addEventListener('click', () => {
        audioFx.playChirp('click');
        submitQuery(item.query);
      });
      listEl.appendChild(div);
    });
  }

  // --------------------------------------------------------------------------
  // 9. RADAR & STARFIELD CANVAS GRAPHICS
  // --------------------------------------------------------------------------
  function initStarfield() {
    const canvas = document.getElementById('stars-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, stars = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      stars = [];
      const count = Math.floor((w * h) / 4500);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.2,
          speed: Math.random() * 0.3 + 0.05,
          twinkle: Math.random() * Math.PI * 2,
          hue: Math.random() > 0.6 ? '0, 240, 255' : (Math.random() > 0.5 ? '157, 92, 255' : '255, 255, 255')
        });
      }
    }

    window.addEventListener('resize', resize);
    resize();

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        st.twinkle += 0.025;
        const alpha = 0.35 + Math.sin(st.twinkle) * 0.35;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${st.hue}, ${Math.max(alpha, 0.08)})`;
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();

        st.y += st.speed;
        if (st.y > h) {
          st.y = 0;
          st.x = Math.random() * w;
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  function initRadarScope() {
    const canvas = document.getElementById('radar-scope-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angle = 0;
    const blips = [
      { r: 0.32, theta: 1.15, label: 'GEO-04', color: '#00f0ff' },
      { r: 0.58, theta: 3.42, label: 'JWST-L2', color: '#34d399' },
      { r: 0.22, theta: 4.85, label: 'ISS-LEO', color: '#00f0ff' },
      { r: 0.76, theta: 2.10, label: 'ARTEMIS', color: '#c499ff' },
      { r: 0.44, theta: 0.45, label: 'DEBRIS-X', color: '#fbbf24' }
    ];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(200, Math.floor(rect.width || canvas.offsetWidth || 280));
      const h = Math.max(80, Math.floor(rect.height || canvas.offsetHeight || 115));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    window.addEventListener('resize', resize);
    resize();

    function drawRadar() {
      const w = canvas.width || 280;
      const h = canvas.height || 115;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.max(20, Math.min(cx, cy) - 6);

      ctx.clearRect(0, 0, w, h);

      // Background subtle grid
      ctx.fillStyle = 'rgba(2, 6, 20, 0.95)';
      ctx.fillRect(0, 0, w, h);

      // Range rings
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const ringR = (maxR / 3) * i;
        ctx.strokeStyle = i === 3 ? 'rgba(0, 240, 255, 0.45)' : 'rgba(0, 240, 255, 0.18)';
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Range labels
      ctx.font = '7px "DM Mono", monospace';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.fillText('100K', cx + (maxR / 3) + 2, cy - 2);
      ctx.fillText('250K', cx + (maxR * 2 / 3) + 2, cy - 2);
      ctx.fillText('500K KM', cx + maxR - 26, cy - 2);

      // Crosshairs
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Cardinal markers
      ctx.font = '8px "DM Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('N', cx - 3, cy - maxR + 9);
      ctx.fillText('S', cx - 3, cy + maxR - 2);
      ctx.fillText('E', cx + maxR - 8, cy + 3);
      ctx.fillText('W', cx - maxR + 2, cy + 3);

      // Sweep Beam Gradient
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const grad = ctx.createLinearGradient(0, 0, maxR, 0);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.55)');
      grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.2)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxR, -0.35, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Center antenna core
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Radar Blips
      blips.forEach(b => {
        const blipR = b.r * maxR;
        const bx = cx + Math.cos(b.theta) * blipR;
        const by = cy + Math.sin(b.theta) * blipR;

        // Angle difference to sweep beam for pulsing
        let diff = (angle - b.theta) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        const isNear = diff < 0.6;
        const alpha = isNear ? 1.0 : 0.45;

        // Blip glow
        ctx.fillStyle = b.color || '#00f0ff';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(bx, by, isNear ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (isNear) {
          ctx.strokeStyle = b.color || '#00f0ff';
          ctx.beginPath();
          ctx.arc(bx, by, 7, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.font = '7.5px "DM Mono", monospace';
        ctx.fillStyle = b.color || '#00f0ff';
        ctx.fillText(b.label, bx + 5, by - 2);
        ctx.globalAlpha = 1.0;
      });

      angle += 0.025;
      requestAnimationFrame(drawRadar);
    }
    drawRadar();
  }

  function initWaveformVisualizer() {
    const canvas = document.getElementById('voice-waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(160, Math.floor(rect.width || canvas.offsetWidth || 260));
      const h = Math.max(24, Math.floor(rect.height || canvas.offsetHeight || 34));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    window.addEventListener('resize', resize);
    resize();

    function drawWave() {
      const w = canvas.width || 260;
      const h = canvas.height || 34;
      ctx.clearRect(0, 0, w, h);

      // Dark background
      ctx.fillStyle = 'rgba(4, 7, 20, 0.85)';
      ctx.fillRect(0, 0, w, h);

      const isSpeaking = coreStageEl && coreStageEl.classList.contains('speaking');
      const isListening = coreStageEl && coreStageEl.classList.contains('listening');
      const isThinking = coreStageEl && coreStageEl.classList.contains('thinking');

      let amplitude = 2.5;
      let strokeColor = '#00f0ff';
      if (isSpeaking) {
        amplitude = 11;
        strokeColor = '#c499ff';
      } else if (isListening) {
        amplitude = 12;
        strokeColor = '#34d399';
      } else if (isThinking) {
        amplitude = 7;
        strokeColor = '#fbbf24';
      }

      // Primary wave
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;

      for (let x = 0; x < w; x++) {
        const env = Math.sin((x / w) * Math.PI);
        const y = h / 2 + Math.sin(x * 0.06 + phase) * amplitude * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Harmonic faint wave
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x++) {
        const env = Math.sin((x / w) * Math.PI);
        const y = h / 2 + Math.cos(x * 0.09 - phase * 1.3) * (amplitude * 0.6) * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      phase += (isSpeaking || isListening) ? 0.16 : 0.035;
      requestAnimationFrame(drawWave);
    }
    drawWave();
  }

  // --------------------------------------------------------------------------
  // 10. SETUP EVENT LISTENERS & WIRING
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Send Button
    const sendBtn = document.getElementById('send-command-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (commandInputEl) submitQuery(commandInputEl.value);
      });
    }

    // Input Enter Key + stop voice on any keystroke
    if (commandInputEl) {
      commandInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          submitQuery(commandInputEl.value);
        }
      });

      // Immediately stop previous voice output as soon as user starts typing
      commandInputEl.addEventListener('input', () => {
        voiceStudio.cancel();
      });
    }

    // Mic Trigger
    const micBtn = document.getElementById('mic-trigger-btn');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        voiceStudio.toggleListening();
      });
    }

    // Mute / Voice Toggle
    const muteBtn = document.getElementById('hud-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        state.voiceEnabled = !state.voiceEnabled;
        audioFx.playChirp('click');
        if (!state.voiceEnabled) {
          voiceStudio.cancel();
          muteBtn.style.color = 'var(--as-danger)';
          muteBtn.title = 'Voice Synthesis Muted';
        } else {
          muteBtn.style.color = 'var(--as-cyan)';
          muteBtn.title = 'Voice Synthesis Active';
        }
      });
    }

    // Audio SFX Toggle
    const sfxBtn = document.getElementById('hud-sfx-btn');
    if (sfxBtn) {
      sfxBtn.addEventListener('click', () => {
        state.audioSynthEnabled = !state.audioSynthEnabled;
        sfxBtn.classList.toggle('active', state.audioSynthEnabled);
        if (state.audioSynthEnabled) audioFx.playChirp('click');
      });
    }

    // Settings Modal
    const settingsBtn = document.getElementById('hud-settings-btn');
    const modalBackdrop = document.getElementById('settings-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const apiKeyInput = document.getElementById('modal-api-key-input');

    if (settingsBtn && modalBackdrop) {
      settingsBtn.addEventListener('click', () => {
        audioFx.playChirp('click');
        if (apiKeyInput) apiKeyInput.value = state.apiKey;
        modalBackdrop.classList.add('open');
      });
    }

    if (modalCloseBtn && modalBackdrop) {
      modalCloseBtn.addEventListener('click', () => {
        audioFx.playChirp('click');
        modalBackdrop.classList.remove('open');
      });
    }

    if (modalSaveBtn && modalBackdrop) {
      modalSaveBtn.addEventListener('click', () => {
        if (apiKeyInput) {
          state.apiKey = apiKeyInput.value.trim() || DEFAULT_API_KEY;
          localStorage.setItem('nebulon_gemini_api_key', state.apiKey);
        }
        audioFx.playChirp('receive');
        modalBackdrop.classList.remove('open');
        alert('Nebulon A.I. Settings Synced Successfully.');
      });
    }

    // Persona Selector Buttons
    const personaBtns = document.querySelectorAll('.persona-btn');
    personaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        personaBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        audioFx.playChirp('click');
        voiceStudio.setPersona(btn.dataset.persona);
      });
    });

    // Language Dropdown
    const langSelect = document.getElementById('voice-lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        state.selectedLanguage = e.target.value;
        localStorage.setItem('nebulon_voice_lang', state.selectedLanguage);
        voiceStudio.updateActiveVoice();
        audioFx.playChirp('click');
      });
    }

    // Voice Pitch & Rate Sliders
    const pitchSlider = document.getElementById('voice-pitch-slider');
    const rateSlider = document.getElementById('voice-rate-slider');
    const pitchVal = document.getElementById('voice-pitch-val');
    const rateVal = document.getElementById('voice-rate-val');

    if (pitchSlider) {
      pitchSlider.addEventListener('input', (e) => {
        state.speechPitch = parseFloat(e.target.value);
        if (pitchVal) pitchVal.textContent = state.speechPitch.toFixed(2) + 'x';
        localStorage.setItem('nebulon_voice_pitch', state.speechPitch);
      });
    }

    if (rateSlider) {
      rateSlider.addEventListener('input', (e) => {
        state.speechRate = parseFloat(e.target.value);
        if (rateVal) rateVal.textContent = state.speechRate.toFixed(2) + 'x';
        localStorage.setItem('nebulon_voice_rate', state.speechRate);
      });
    }

    // Export Session Button
    const exportBtn = document.getElementById('export-transcript-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        audioFx.playChirp('click');
        const transcriptText = state.conversationHistory
          .map(m => `[${m.role.toUpperCase()}]\n${m.text}\n`)
          .join('\n----------------------------------------\n\n');
        
        const blob = new Blob([transcriptText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nebulon-intelligence-transcript-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Clear Session Button
    const clearBtn = document.getElementById('clear-transcript-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear active orbital transcript session?')) {
          audioFx.playChirp('click');
          state.conversationHistory = [];
          if (transcriptEl) transcriptEl.innerHTML = '';
          appendMessage("Orbital transcript buffer reset. NEBULON A.I. standing by on Gemini 3.7 Flash.", 'bot', [
            'What are the primary anomaly detection limits for this subsystem?',
            'Explain reaction wheel jitter in precision space telescopes.',
            'What is the Hohmann transfer delta-v equation?'
          ]);
        }
      });
    }

    // Populate Quick-Scan Cards in Right Panel
    renderQuickScanCards();
  }

  function renderQuickScanCards() {
    const listEl = document.getElementById('quick-scan-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const allPrompts = [
      ...EXPLORATION_CATEGORIES.defects,
      ...EXPLORATION_CATEGORIES.satellites,
      ...EXPLORATION_CATEGORIES.moons_planets,
      ...EXPLORATION_CATEGORIES.physics_motion
    ];

    allPrompts.forEach(item => {
      const card = document.createElement('div');
      card.className = 'quick-scan-card';
      card.innerHTML = `
        <div class="quick-scan-tag">${item.tag}</div>
        <div class="quick-scan-query">${item.q}</div>
      `;
      card.addEventListener('click', () => {
        audioFx.playChirp('click');
        submitQuery(item.q);
      });
      listEl.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // 11. INITIALIZATION ON DOM READY
  // --------------------------------------------------------------------------
  function init() {
    initStarfield();
    initRadarScope();
    initWaveformVisualizer();
    setupEventListeners();
    renderHistoryList();

    // Initial follow-up suggestion ribbon
    renderFollowUpSuggestions([
      'What causes reaction wheel jitter in space telescopes?',
      'How are satellite solar array micro-crack defects detected?',
      'Explain Keplerian orbital elements and SGP4 propagation',
      'What is the water-ice distribution on the Lunar South Pole?'
    ]);

    setCoreState('idle');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
