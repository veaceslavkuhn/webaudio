# WebAudacity - Free Web-Based Audio Editor

A modern, browser-based audio editing application that replicates Audacity's core functionality using Web Audio API. No downloads or installations required!

![WebAudacity Interface](screenshot.png)

## 🎵 Features

### Core Audio Functions
- **Multi-track audio editing** - Work with multiple audio tracks simultaneously
- **Recording** - Record directly from your microphone
- **Import/Export** - Support for MP3, WAV, FLAC, OGG, and M4A formats
- **Real-time playback** - Play your tracks with transport controls
- **Non-destructive editing** - Edit without losing original audio quality

### Professional Tools
- **Selection Tool** - Precise audio selection with mouse
- **Zoom Controls** - Zoom in/out and fit to view
- **Timeline** - Visual timeline with time markers
- **Volume Controls** - Individual track volume and pan controls
- **Waveform Visualization** - Real-time waveform rendering

### Audio Effects
- **Amplify** - Boost or reduce volume levels
- **Normalize** - Automatic level optimization
- **Fade In/Out** - Smooth transitions
- **Echo** - Delay and repeat effects
- **Reverb** - Spatial ambience effects
- **Noise Reduction** - Clean up audio recordings
- **Speed/Pitch Change** - Tempo and pitch manipulation
- **Filters** - High-pass and low-pass filtering
- **Compression** - Dynamic range control
- **Distortion** - Creative audio coloring

### Generation Tools
- **Tone Generator** - Create sine, square, sawtooth, and triangle waves
- **Noise Generator** - White and pink noise generation
- **Silence Generator** - Insert silence of any duration

### Analysis Tools
- **Spectrum Analyzer** - Visual frequency analysis
- **Audio Information** - Detailed file properties

## 🚀 Getting Started

### Prerequisites
- Modern web browser with Web Audio API support (Chrome, Firefox, Safari, Edge)
- Microphone access (for recording features)

### Installation
1. Clone or download this repository
2. Open `index.html` in your web browser
3. No additional setup required!

### Usage

#### Loading Audio Files
1. Click **File > Import > Audio...** or drag and drop files onto the interface
2. Supported formats: MP3, WAV, FLAC, OGG, M4A
3. Multiple files can be loaded as separate tracks

#### Recording Audio
1. Click the red **Record** button
2. Allow microphone access when prompted
3. Click **Stop** to finish recording
4. The recording will automatically appear as a new track

#### Editing Audio
1. Use the **Selection Tool** to select portions of audio
2. Cut, copy, paste, or delete selections using the Edit menu
3. Apply effects from the **Effect** menu
4. Generate new audio content from the **Generate** menu

#### Exporting
1. Click **File > Export Audio...**
2. Your project will be exported as a WAV file
3. The file will automatically download

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New Project |
| `Ctrl/Cmd + O` | Open File |
| `Ctrl/Cmd + S` | Save Project |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + X` | Cut |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + A` | Select All |
| `Space` | Play/Pause |
| `Delete/Backspace` | Delete Selection |

## 🛠️ Technical Architecture

### Core Components

#### AudioEngine (`audio-engine.js`)
- Web Audio API management
- Recording and playback functionality
- Audio buffer manipulation
- File loading and exporting

#### WaveformRenderer (`waveform-renderer.js`)
- Canvas-based waveform visualization
- Real-time timeline rendering
- Selection and zoom handling
- Multi-track display management

#### EffectsProcessor (`effects-processor.js`)
- Digital signal processing
- Audio effects implementation
- Real-time parameter control
- Non-destructive processing

#### WebAudacityApp (`app.js`)
- Main application controller
- UI event handling
- Component coordination
- Project management

### Browser Compatibility
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (macOS/iOS)
- **Edge**: Full support

## 🎨 Customization

### Themes
The interface can be customized by modifying `styles.css`. The design follows Audacity's classic layout with modern web styling.

### Adding Effects
New effects can be added to `EffectsProcessor`:

```javascript
// Add to EffectsProcessor class
myCustomEffect(audioBuffer, parameter1, parameter2) {
    const newBuffer = this.copyBuffer(audioBuffer);
    // Process audio data...
    return newBuffer;
}
```

### Extending File Formats
Additional audio formats can be supported by extending the file handling in `AudioEngine`.

## 🐛 Known Limitations

- **File Size**: Large audio files may impact performance
- **Mobile**: Touch interface optimization needed
- **Real-time Effects**: Not yet implemented during playback
- **MIDI**: No MIDI support currently
- **VST Plugins**: Web-based plugins not supported

## 🔧 Development

### Project Structure
```
WebAudacity/
├── index.html          # Main application HTML
├── styles.css          # Interface styling
├── audio-engine.js     # Core audio functionality
├── waveform-renderer.js # Visualization engine
├── effects-processor.js # Audio effects processing
├── app.js             # Main application controller
└── README.md          # Documentation
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by [Audacity](https://www.audacityteam.org/) - the original free audio editor
- Built with Web Audio API
- Icons from Font Awesome
- Modern web technologies

## 📞 Support

For issues, questions, or contributions, please visit our GitHub repository or open an issue.

---

**WebAudacity** - Bringing professional audio editing to the web! 🎵
