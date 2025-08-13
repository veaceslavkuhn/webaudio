/**
 * Effects Processor - Audio effects and processing functionality
 * Implements various audio effects like amplify, normalize, reverb, etc.
 */

class EffectsProcessor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.effectsHistory = [];
    }

    // Core effect: Amplify
    amplify(audioBuffer, gain = 1.0) {
        const newBuffer = this.copyBuffer(audioBuffer);
        
        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                channelData[i] *= gain;
                // Prevent clipping
                channelData[i] = Math.max(-1, Math.min(1, channelData[i]));
            }
        }
        
        return newBuffer;
    }

    // Core effect: Normalize
    normalize(audioBuffer, targetPeak = 0.95) {
        // Find the peak amplitude
        let peak = 0;
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                const sample = Math.abs(channelData[i]);
                if (sample > peak) {
                    peak = sample;
                }
            }
        }

        if (peak === 0) return audioBuffer; // Avoid division by zero

        const gain = targetPeak / peak;
        return this.amplify(audioBuffer, gain);
    }

    // Fade In effect
    fadeIn(audioBuffer, duration = 1.0) {
        const newBuffer = this.copyBuffer(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;
        const fadeSamples = Math.min(duration * sampleRate, audioBuffer.length);

        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            for (let i = 0; i < fadeSamples; i++) {
                const fadeGain = i / fadeSamples;
                channelData[i] *= fadeGain;
            }
        }

        return newBuffer;
    }

    // Fade Out effect
    fadeOut(audioBuffer, duration = 1.0) {
        const newBuffer = this.copyBuffer(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;
        const fadeSamples = Math.min(duration * sampleRate, audioBuffer.length);
        const startSample = audioBuffer.length - fadeSamples;

        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            for (let i = 0; i < fadeSamples; i++) {
                const fadeGain = 1 - (i / fadeSamples);
                channelData[startSample + i] *= fadeGain;
            }
        }

        return newBuffer;
    }

    // Echo effect
    echo(audioBuffer, delay = 0.3, decay = 0.5, repeat = 3) {
        const sampleRate = audioBuffer.sampleRate;
        const delaySamples = Math.floor(delay * sampleRate);
        const newLength = audioBuffer.length + (delaySamples * repeat);
        
        const newBuffer = this.audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            newLength,
            sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = newBuffer.getChannelData(channel);

            // Copy original signal
            for (let i = 0; i < inputData.length; i++) {
                outputData[i] = inputData[i];
            }

            // Add echoes
            let currentDecay = decay;
            for (let echo = 1; echo <= repeat; echo++) {
                const echoStart = echo * delaySamples;
                for (let i = 0; i < inputData.length && echoStart + i < outputData.length; i++) {
                    outputData[echoStart + i] += inputData[i] * currentDecay;
                }
                currentDecay *= decay;
            }
        }

        return newBuffer;
    }

    // Simple Reverb effect
    reverb(audioBuffer, roomSize = 0.7, damping = 0.5, wetLevel = 0.3) {
        const newBuffer = this.copyBuffer(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;
        
        // Simple reverb using multiple delay lines
        const delayTimes = [0.03, 0.05, 0.07, 0.09, 0.11, 0.13]; // Various delay times
        const delayBuffers = delayTimes.map(time => 
            new Array(Math.floor(time * sampleRate)).fill(0)
        );
        
        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            const delayIndices = new Array(delayBuffers.length).fill(0);
            
            for (let i = 0; i < channelData.length; i++) {
                let reverbSum = 0;
                
                // Process each delay line
                for (let d = 0; d < delayBuffers.length; d++) {
                    const delayBuffer = delayBuffers[d];
                    const delayIndex = delayIndices[d];
                    
                    // Get delayed sample
                    const delayedSample = delayBuffer[delayIndex];
                    reverbSum += delayedSample;
                    
                    // Add input with feedback
                    const feedback = channelData[i] + (delayedSample * roomSize * damping);
                    delayBuffer[delayIndex] = feedback;
                    
                    // Update delay index
                    delayIndices[d] = (delayIndex + 1) % delayBuffer.length;
                }
                
                // Mix dry and wet signals
                const reverbSignal = reverbSum / delayBuffers.length;
                channelData[i] = channelData[i] * (1 - wetLevel) + reverbSignal * wetLevel;
            }
        }

        return newBuffer;
    }

    // Change Speed (affects pitch)
    changeSpeed(audioBuffer, speedRatio = 1.0) {
        if (speedRatio === 1.0) return audioBuffer;
        
        const newLength = Math.floor(audioBuffer.length / speedRatio);
        const newBuffer = this.audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            newLength,
            audioBuffer.sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = newBuffer.getChannelData(channel);

            for (let i = 0; i < newLength; i++) {
                const sourceIndex = i * speedRatio;
                const index = Math.floor(sourceIndex);
                const fraction = sourceIndex - index;

                if (index < inputData.length - 1) {
                    // Linear interpolation
                    outputData[i] = inputData[index] * (1 - fraction) + 
                                   inputData[index + 1] * fraction;
                } else if (index < inputData.length) {
                    outputData[i] = inputData[index];
                }
            }
        }

        return newBuffer;
    }

    // Change Pitch (preserves duration using phase vocoder)
    changePitch(audioBuffer, pitchRatio = 1.0) {
        if (pitchRatio === 1.0) return audioBuffer;

        // Simple pitch shifting using overlap-add
        const frameSize = 1024;
        const hopSize = frameSize / 4;
        const overlapSize = frameSize - hopSize;
        
        const newBuffer = this.copyBuffer(audioBuffer);
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = newBuffer.getChannelData(channel);
            outputData.fill(0);

            let inputPos = 0;
            let outputPos = 0;

            while (inputPos + frameSize < inputData.length && outputPos + frameSize < outputData.length) {
                // Process frame
                for (let i = 0; i < frameSize; i++) {
                    const sourceIndex = inputPos + i * pitchRatio;
                    const index = Math.floor(sourceIndex);
                    const fraction = sourceIndex - index;

                    if (index < inputData.length - 1) {
                        const sample = inputData[index] * (1 - fraction) + 
                                      inputData[index + 1] * fraction;
                        
                        // Apply window and overlap-add
                        const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / frameSize));
                        outputData[outputPos + i] += sample * window;
                    }
                }

                inputPos += hopSize;
                outputPos += hopSize;
            }
        }

        return newBuffer;
    }

    // Simple High-pass filter
    highPassFilter(audioBuffer, cutoffFreq = 1000) {
        const newBuffer = this.copyBuffer(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;
        const rc = 1 / (2 * Math.PI * cutoffFreq);
        const dt = 1 / sampleRate;
        const alpha = rc / (rc + dt);

        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            let y = 0;
            let x_prev = 0;
            let y_prev = 0;

            for (let i = 0; i < channelData.length; i++) {
                const x = channelData[i];
                y = alpha * (y_prev + x - x_prev);
                channelData[i] = y;
                
                x_prev = x;
                y_prev = y;
            }
        }

        return newBuffer;
    }

    // Simple Low-pass filter  
    lowPassFilter(audioBuffer, cutoffFreq = 1000) {
        const newBuffer = this.copyBuffer(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;
        const rc = 1 / (2 * Math.PI * cutoffFreq);
        const dt = 1 / sampleRate;
        const alpha = dt / (rc + dt);

        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            let y = 0;

            for (let i = 0; i < channelData.length; i++) {
                y += alpha * (channelData[i] - y);
                channelData[i] = y;
            }
        }

        return newBuffer;
    }

    // Noise Reduction (simple spectral subtraction)
    noiseReduction(audioBuffer, noiseFloor = 0.1, reduction = 0.8) {
        const newBuffer = this.copyBuffer(audioBuffer);

        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            
            for (let i = 0; i < channelData.length; i++) {
                const sample = channelData[i];
                const amplitude = Math.abs(sample);
                
                if (amplitude < noiseFloor) {
                    // Reduce noise
                    channelData[i] = sample * (1 - reduction);
                }
            }
        }

        return newBuffer;
    }

    // Compressor
    compress(audioBuffer, threshold = 0.7, ratio = 4, attack = 0.01, release = 0.1) {
        const newBuffer = this.copyBuffer(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;
        const attackSamples = attack * sampleRate;
        const releaseSamples = release * sampleRate;

        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            let envelope = 0;

            for (let i = 0; i < channelData.length; i++) {
                const sample = Math.abs(channelData[i]);
                
                // Update envelope
                if (sample > envelope) {
                    envelope += (sample - envelope) / attackSamples;
                } else {
                    envelope += (sample - envelope) / releaseSamples;
                }

                // Apply compression
                if (envelope > threshold) {
                    const excess = envelope - threshold;
                    const compressedExcess = excess / ratio;
                    const gain = (threshold + compressedExcess) / envelope;
                    channelData[i] *= gain;
                }
            }
        }

        return newBuffer;
    }

    // Distortion
    distortion(audioBuffer, amount = 50, tone = 0.5) {
        const newBuffer = this.copyBuffer(audioBuffer);

        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);

            for (let i = 0; i < channelData.length; i++) {
                let sample = channelData[i];
                
                // Apply distortion
                sample *= amount;
                sample = Math.tanh(sample); // Soft clipping
                
                // Tone control (simple high-frequency rolloff)
                if (i > 0) {
                    sample = sample * tone + channelData[i - 1] * (1 - tone);
                }
                
                channelData[i] = sample;
            }
        }

        return newBuffer;
    }

    // Utility: Copy audio buffer
    copyBuffer(audioBuffer) {
        const newBuffer = this.audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = newBuffer.getChannelData(channel);
            outputData.set(inputData);
        }

        return newBuffer;
    }

    // Get effect parameters
    getEffectParameters(effectName) {
        const parameters = {
            amplify: [
                { name: 'gain', min: 0, max: 10, default: 1, step: 0.1, unit: 'x' }
            ],
            normalize: [
                { name: 'targetPeak', min: 0.1, max: 1.0, default: 0.95, step: 0.01, unit: '' }
            ],
            fadeIn: [
                { name: 'duration', min: 0.1, max: 10, default: 1, step: 0.1, unit: 's' }
            ],
            fadeOut: [
                { name: 'duration', min: 0.1, max: 10, default: 1, step: 0.1, unit: 's' }
            ],
            echo: [
                { name: 'delay', min: 0.01, max: 2, default: 0.3, step: 0.01, unit: 's' },
                { name: 'decay', min: 0.1, max: 0.9, default: 0.5, step: 0.01, unit: '' },
                { name: 'repeat', min: 1, max: 10, default: 3, step: 1, unit: '' }
            ],
            reverb: [
                { name: 'roomSize', min: 0.1, max: 1, default: 0.7, step: 0.01, unit: '' },
                { name: 'damping', min: 0.1, max: 1, default: 0.5, step: 0.01, unit: '' },
                { name: 'wetLevel', min: 0, max: 1, default: 0.3, step: 0.01, unit: '' }
            ],
            changeSpeed: [
                { name: 'speedRatio', min: 0.25, max: 4, default: 1, step: 0.01, unit: 'x' }
            ],
            changePitch: [
                { name: 'pitchRatio', min: 0.25, max: 4, default: 1, step: 0.01, unit: 'x' }
            ],
            highPassFilter: [
                { name: 'cutoffFreq', min: 20, max: 20000, default: 1000, step: 10, unit: 'Hz' }
            ],
            lowPassFilter: [
                { name: 'cutoffFreq', min: 20, max: 20000, default: 1000, step: 10, unit: 'Hz' }
            ],
            noiseReduction: [
                { name: 'noiseFloor', min: 0.01, max: 0.5, default: 0.1, step: 0.01, unit: '' },
                { name: 'reduction', min: 0.1, max: 1, default: 0.8, step: 0.01, unit: '' }
            ],
            compress: [
                { name: 'threshold', min: 0.1, max: 1, default: 0.7, step: 0.01, unit: '' },
                { name: 'ratio', min: 1, max: 20, default: 4, step: 0.1, unit: ':1' },
                { name: 'attack', min: 0.001, max: 0.1, default: 0.01, step: 0.001, unit: 's' },
                { name: 'release', min: 0.01, max: 1, default: 0.1, step: 0.01, unit: 's' }
            ],
            distortion: [
                { name: 'amount', min: 1, max: 100, default: 50, step: 1, unit: '' },
                { name: 'tone', min: 0, max: 1, default: 0.5, step: 0.01, unit: '' }
            ]
        };

        return parameters[effectName] || [];
    }

    // Apply effect by name with parameters
    applyEffect(effectName, audioBuffer, parameters = {}) {
        switch (effectName) {
            case 'amplify':
                return this.amplify(audioBuffer, parameters.gain || 1);
            case 'normalize':
                return this.normalize(audioBuffer, parameters.targetPeak || 0.95);
            case 'fadeIn':
                return this.fadeIn(audioBuffer, parameters.duration || 1);
            case 'fadeOut':
                return this.fadeOut(audioBuffer, parameters.duration || 1);
            case 'echo':
                return this.echo(audioBuffer, 
                    parameters.delay || 0.3, 
                    parameters.decay || 0.5, 
                    parameters.repeat || 3);
            case 'reverb':
                return this.reverb(audioBuffer,
                    parameters.roomSize || 0.7,
                    parameters.damping || 0.5,
                    parameters.wetLevel || 0.3);
            case 'changeSpeed':
                return this.changeSpeed(audioBuffer, parameters.speedRatio || 1);
            case 'changePitch':
                return this.changePitch(audioBuffer, parameters.pitchRatio || 1);
            case 'highPassFilter':
                return this.highPassFilter(audioBuffer, parameters.cutoffFreq || 1000);
            case 'lowPassFilter':
                return this.lowPassFilter(audioBuffer, parameters.cutoffFreq || 1000);
            case 'noiseReduction':
                return this.noiseReduction(audioBuffer,
                    parameters.noiseFloor || 0.1,
                    parameters.reduction || 0.8);
            case 'compress':
                return this.compress(audioBuffer,
                    parameters.threshold || 0.7,
                    parameters.ratio || 4,
                    parameters.attack || 0.01,
                    parameters.release || 0.1);
            case 'distortion':
                return this.distortion(audioBuffer,
                    parameters.amount || 50,
                    parameters.tone || 0.5);
            default:
                console.warn('Unknown effect:', effectName);
                return audioBuffer;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EffectsProcessor;
} else {
    window.EffectsProcessor = EffectsProcessor;
}
