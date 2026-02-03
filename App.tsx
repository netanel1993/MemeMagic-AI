
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TemplateGallery } from './components/TemplateGallery';
import { getMagicCaptions, editImageWithAI } from './services/gemini';
import { MemeState } from './types';

const App: React.FC = () => {
  const [meme, setMeme] = useState<MemeState>({
    image: null,
    topText: '',
    bottomText: '',
    fontSize: 40,
    textColor: '#ffffff',
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draw meme to canvas
  const drawMeme = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !meme.image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = meme.image;
    img.onload = () => {
      // Fit canvas to image size
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      // Styles
      ctx.fillStyle = meme.textColor;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = Math.floor(canvas.width / 150);
      ctx.textAlign = 'center';
      const dynamicFontSize = (meme.fontSize / 100) * (canvas.width / 10);
      ctx.font = `800 ${dynamicFontSize}px Impact, sans-serif`;

      // Top Text
      ctx.textBaseline = 'top';
      ctx.strokeText(meme.topText.toUpperCase(), canvas.width / 2, 20);
      ctx.fillText(meme.topText.toUpperCase(), canvas.width / 2, 20);

      // Bottom Text
      ctx.textBaseline = 'bottom';
      ctx.strokeText(meme.bottomText.toUpperCase(), canvas.width / 2, canvas.height - 20);
      ctx.fillText(meme.bottomText.toUpperCase(), canvas.width / 2, canvas.height - 20);
    };
  }, [meme]);

  useEffect(() => {
    drawMeme();
  }, [drawMeme]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setMeme(prev => ({ ...prev, image: readerEvent.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTemplateSelect = async (url: string) => {
    try {
      // Fetch and convert to base64 to ensure AI service can read it
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setMeme(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to fetch template image", err);
      // Fallback
      setMeme(prev => ({ ...prev, image: url }));
    }
  };

  const handleMagicCaption = async () => {
    if (!meme.image) return;
    // Check if it's a URL and not base64 (edge case)
    if (!meme.image.startsWith('data:')) {
      alert("Please wait for the image to finish loading.");
      return;
    }

    setLoadingCaptions(true);
    try {
      const caps = await getMagicCaptions(meme.image);
      setSuggestions(caps);
    } catch (err) {
      console.error("Caption generation failed", err);
      alert("AI failed to analyze the image. Please check your API key or try a different image.");
    } finally {
      setLoadingCaptions(false);
    }
  };

  const handleAIEdit = async () => {
    if (!meme.image || !editPrompt) return;
    if (!meme.image.startsWith('data:')) {
      alert("Please wait for the image to finish loading.");
      return;
    }

    setLoadingEdit(true);
    try {
      const editedImageUrl = await editImageWithAI(meme.image, editPrompt);
      if (editedImageUrl) {
        setMeme(prev => ({ ...prev, image: editedImageUrl }));
        setEditPrompt('');
      }
    } catch (err) {
      console.error("AI Edit failed", err);
      alert("AI failed to edit the image. It might be too large or the prompt was blocked.");
    } finally {
      setLoadingEdit(false);
    }
  };

  const downloadMeme = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'meme-magic.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-slate-800/80 backdrop-blur-md border-b border-slate-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tighter">MEMEMAGIC <span className="text-indigo-500 underline decoration-indigo-500/30">AI</span></h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-full font-semibold transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Left: Editor Controls */}
        <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">
          <section className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Editor
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-400 block mb-1">Top Text</label>
                <input 
                  type="text" 
                  value={meme.topText}
                  onChange={e => setMeme(prev => ({...prev, topText: e.target.value}))}
                  placeholder="Caption this..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-400 block mb-1">Bottom Text</label>
                <input 
                  type="text" 
                  value={meme.bottomText}
                  onChange={e => setMeme(prev => ({...prev, bottomText: e.target.value}))}
                  placeholder="...and this"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-sm font-semibold text-slate-400 block mb-1">Size</label>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={meme.fontSize}
                    onChange={e => setMeme(prev => ({...prev, fontSize: parseInt(e.target.value)}))}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-400 block mb-1">Color</label>
                  <input 
                    type="color" 
                    value={meme.textColor}
                    onChange={e => setMeme(prev => ({...prev, textColor: e.target.value}))}
                    className="w-full h-8 bg-transparent rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* AI Editing Section */}
          <section className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.047a1 1 0 01.897.95l.113 2.126 2.126.113a1 1 0 01.95.897 1 1 0 01-.95.897l-2.126.113-.113 2.126a1 1 0 01-.897.95 1 1 0 01-.897-.95l-.113-2.126-2.126-.113a1 1 0 01-.95-.897 1 1 0 01.95-.897l2.126-.113.113-2.126a1 1 0 01.897-.95zm-6 3a1 1 0 01.897.95l.113 2.126 2.126.113a1 1 0 01.95.897 1 1 0 01-.95.897l-2.126.113-.113 2.126a1 1 0 01-.897.95 1 1 0 01-.897-.95l-.113-2.126-2.126-.113a1 1 0 01-.95-.897 1 1 0 01.95-.897l2.126-.113.113-2.126a1 1 0 01.897-.95zM10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              AI Magic Edit
            </h2>
            <p className="text-xs text-slate-400 mb-4">Describe changes: "Make it cinematic", "Add a party hat", "Make it black and white"</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={editPrompt}
                onChange={e => setEditPrompt(e.target.value)}
                placeholder="What should I do?"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-pink-500 outline-none"
              />
              <button 
                onClick={handleAIEdit}
                disabled={loadingEdit || !meme.image || !editPrompt}
                className="bg-pink-600 hover:bg-pink-700 disabled:bg-slate-700 px-3 py-2 rounded-lg text-sm font-bold transition-all"
              >
                {loadingEdit ? 'Wait...' : 'Apply'}
              </button>
            </div>
          </section>

          <TemplateGallery onSelect={handleTemplateSelect} />
        </div>

        {/* Center: Canvas View */}
        <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
          <div className="bg-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl border border-slate-700 flex flex-col items-center min-h-[500px] justify-center relative overflow-hidden">
            {meme.image ? (
              <div className="relative group max-w-full">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full rounded-lg shadow-2xl border border-slate-600"
                />
                <button 
                  onClick={downloadMeme}
                  className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div 
                className="text-center space-y-4 cursor-pointer hover:bg-slate-700/50 p-12 rounded-2xl border-2 border-dashed border-slate-600 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Upload an Image</h3>
                <p className="text-slate-400">Drag and drop or click to start making magic</p>
              </div>
            )}

            {/* Magic Caption Button Floating */}
            {meme.image && (
              <button 
                onClick={handleMagicCaption}
                disabled={loadingCaptions}
                className="mt-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-4 rounded-2xl font-black text-xl shadow-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                {loadingCaptions ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Thinking...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM11 2a1 1 0 011-1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V4h-1a1 1 0 110-2h1V1a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    MAGIC CAPTION
                  </>
                )}
              </button>
            )}
          </div>

          {/* AI Suggested Captions Grid */}
          {suggestions.length > 0 && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                <span>AI Suggested Captions</span>
                <button onClick={() => setSuggestions([])} className="text-slate-500 hover:text-slate-300">Clear</button>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestions.map((cap, i) => (
                  <button 
                    key={i}
                    onClick={() => setMeme(prev => ({...prev, topText: cap}))}
                    className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-left hover:border-indigo-500 transition-all hover:bg-indigo-500/10 group"
                  >
                    <p className="text-sm italic text-slate-400 group-hover:text-indigo-300">Option {i + 1}</p>
                    <p className="font-bold text-slate-100 mt-1 uppercase tracking-tight line-clamp-2">"{cap}"</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Mobile Controls / Branding */}
      <footer className="fixed bottom-0 w-full bg-slate-800 border-t border-slate-700 py-3 px-6 text-center text-slate-500 text-sm hidden lg:block">
        Crafted with <span className="text-pink-500">❤️</span> and AI Intelligence
      </footer>
    </div>
  );
};

export default App;
