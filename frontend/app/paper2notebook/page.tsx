'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  Download,
  CheckCircle2,
  Eye,
  EyeOff,
  Brain,
  Code2,
  Zap,
  X
} from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

// Helper for class merging
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

// Hero Component
const Hero = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    className="text-center mb-8 pt-6 relative z-10"
  >
    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#8ad4ff] via-white to-purple-200 mb-2 drop-shadow-2xl">
      Paper to Notebook
    </h1>
    <p className="text-sm text-neutral-400 max-w-2xl mx-auto">
      Upload a research paper PDF - get a runnable PyTorch notebook
    </p>
  </motion.div>
)

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [arxivUrl, setArxivUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [bannerVisible, setBannerVisible] = useState(true)

  // Progress tracking
  const [steps, setSteps] = useState<Array<{ name: string; detail: string }>>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false])

  // Results
  const [draftJobId, setDraftJobId] = useState('')
  const [finalJobId, setFinalJobId] = useState('')
  const [thinking, setThinking] = useState('')
  const [activities, setActivities] = useState<any[]>([])
  const [showDone, setShowDone] = useState(false)
  const [showFullscreenThinking, setShowFullscreenThinking] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Load API key from localStorage and check for pending file/URL
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key')
    if (savedKey) setApiKey(savedKey)

    // Check for pending file from landing page
    const pendingFileData = sessionStorage.getItem('pendingFile')
    const pendingFileName = sessionStorage.getItem('pendingFileName')
    if (pendingFileData && pendingFileName) {
      // Convert base64 back to File
      fetch(pendingFileData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], pendingFileName, { type: 'application/pdf' })
          setSelectedFile(file)
        })
      // Clear from sessionStorage
      sessionStorage.removeItem('pendingFile')
      sessionStorage.removeItem('pendingFileName')
    }

    // Check for pending arXiv URL from landing page
    const pendingUrl = sessionStorage.getItem('pendingArxivUrl')
    if (pendingUrl) {
      setArxivUrl(pendingUrl)
      sessionStorage.removeItem('pendingArxivUrl')
    }
  }, [])

  // File drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(file)
      setError('')
      setDraftJobId('')
      setFinalJobId('')
      setShowDone(false)
    } else {
      setError('Please upload a PDF file')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setArxivUrl('') // Clear arXiv URL if file is selected
      setError('')
      setDraftJobId('')
      setFinalJobId('')
      setShowDone(false)
    }
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value
    setApiKey(key)
    localStorage.setItem('gemini_api_key', key)
  }

  const handleGenerate = async () => {
    // Check if either file or arXiv URL is provided
    if ((!selectedFile && !arxivUrl.trim()) || !apiKey.trim()) {
      setError('Please select a PDF or paste an arXiv link, and enter your API key')
      return
    }

    setIsGenerating(true)
    setError('')
    setDraftJobId('')
    setFinalJobId('')
    setShowDone(false)
    setActivities([])
    setThinking('')
    setCurrentStep(0)
    setSteps([
      { name: 'Analyze paper', detail: '' },
      { name: 'Design implementation', detail: '' },
      { name: 'Generate notebook', detail: '' },
      { name: 'Validate code', detail: '' },
    ])
    setCompletedSteps([false, false, false, false])

    const formData = new FormData()
    formData.append('api_key', apiKey.trim())

    // Determine which endpoint to use
    let endpoint = `${API_URL}/api/generate`
    if (arxivUrl.trim()) {
      endpoint = `${API_URL}/api/generate-from-arxiv`
      formData.append('arxiv_url', arxivUrl.trim())
    } else if (selectedFile) {
      formData.append('file', selectedFile)
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit reached. Please try again later.')
        if (response.status === 413) throw new Error('PDF too large. Maximum is 30 MB.')
        throw new Error(`Server error (${response.status})`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Failed to read response')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (part.startsWith('event: thinking')) {
            const dataLine = part.split('\n').find(l => l.startsWith('data: '))
            if (dataLine) {
              const data = JSON.parse(dataLine.slice(6))
              setThinking(prev => (prev + data.text).slice(-2000))
            }
          } else if (part.startsWith('event: progress')) {
            const dataLine = part.split('\n').find(l => l.startsWith('data: '))
            if (dataLine) {
              const data = JSON.parse(dataLine.slice(6))
              handleProgress(data)
            }
          } else if (part.startsWith('event: draft_ready')) {
            const dataLine = part.split('\n').find(l => l.startsWith('data: '))
            if (dataLine) {
              const data = JSON.parse(dataLine.slice(6))
              setDraftJobId(data.job_id)
            }
          } else if (part.startsWith('event: complete')) {
            const dataLine = part.split('\n').find(l => l.startsWith('data: '))
            if (dataLine) {
              const data = JSON.parse(dataLine.slice(6))
              handleComplete(data.job_id)
            }
          } else if (part.startsWith('event: error')) {
            const dataLine = part.split('\n').find(l => l.startsWith('data: '))
            if (dataLine) {
              const data = JSON.parse(dataLine.slice(6))
              throw new Error(data.error)
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Connection lost. Please try again.')
      setIsGenerating(false)
    }
  }

  const handleProgress = (data: any) => {
    const { step, detail, extra } = data

    setCurrentStep(step)

    // Update step details
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[step - 1] = { ...newSteps[step - 1], detail }
      return newSteps
    })

    // Mark previous steps as completed
    setCompletedSteps(prev => {
      const newCompleted = [...prev]
      for (let i = 0; i < step - 1; i++) {
        newCompleted[i] = true
      }
      return newCompleted
    })

    // Add activity cards
    if (extra) {
      if (extra.type === 'analysis') {
        setActivities(prev => [...prev, {
          type: 'analysis',
          label: 'Paper Analysis',
          title: extra.title,
          content: extra,
        }])
      } else if (extra.type === 'design') {
        setActivities(prev => [...prev, {
          type: 'design',
          label: 'Architecture',
          title: extra.notebook_title || 'Implementation Plan',
          content: extra,
        }])
      } else if (extra.type === 'cells_generated') {
        setActivities(prev => [...prev, {
          type: 'cells',
          label: 'Notebook Generated',
          title: `${extra.num_cells} cells (${extra.code_cells} code)`,
          content: extra,
        }])
      }
    }
  }

  const handleComplete = (jobId: string) => {
    setFinalJobId(jobId)
    setCompletedSteps([true, true, true, true])
    setIsGenerating(false)
    setShowDone(true)
    setThinking('')
  }

  const stepIcons = [Brain, Code2, Sparkles, CheckCircle2]

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden relative font-sans">
      {/* Banner */}
      {bannerVisible && (
        <div className="fixed top-0 w-full z-50 bg-[#8ad4ff] py-1.5">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-4 relative">
            <span className="text-sm font-medium text-black">Try our new Personalized AI tutor</span>
            <a
              href="https://vizz.vizuara.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium text-black transition-colors"
            >
              Vizz-AI →
            </a>
            <button
              onClick={() => setBannerVisible(false)}
              className="absolute right-6 text-black hover:text-black/80 transition-colors"
              aria-label="Close banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-purple-900/5 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 pt-16 pb-6 relative z-10 max-w-6xl">
        <Hero />

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Upload & Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 flex flex-col min-h-[600px]"
          >
            {/* Upload Zone */}
            <div className="rounded-2xl transition-all duration-300 flex-1 flex items-center">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer w-full flex items-center justify-center",
                  "bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/30"
                )}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <AnimatePresence mode="wait">
                  {!selectedFile ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center text-center space-y-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 animate-float">
                        <Upload className="w-8 h-8 text-[#8ad4ff]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white/90 mb-1">Drop your PDF here</h3>
                        <p className="text-sm text-white/50">or click to browse · Max 30 MB</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="file"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center text-center space-y-3 w-full px-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#8ad4ff]/20 flex items-center justify-center border border-[#8ad4ff]/30 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]">
                        <FileText className="w-8 h-8 text-[#8ad4ff]" />
                      </div>
                      <div className="w-full overflow-hidden">
                        <h3 className="text-base font-medium text-white truncate">{selectedFile.name}</h3>
                        <p className="text-sm text-[#8ad4ff] mt-1">Ready to analyze</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                        className="text-sm text-white/40 hover:text-white underline decoration-white/20 hover:decoration-white transition-colors"
                      >
                        Remove file
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-3 text-white/30 text-sm">
              <div className="flex-1 h-px bg-white/10"></div>
              <span>OR</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* arXiv URL Input */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <label className="text-sm font-medium text-white/60 mb-2 block">Paste arXiv Link</label>
              <input
                type="text"
                value={arxivUrl}
                onChange={(e) => {
                  setArxivUrl(e.target.value)
                  if (e.target.value.trim()) {
                    setSelectedFile(null) // Clear file if URL is entered
                  }
                }}
                placeholder="https://arxiv.org/pdf/..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-white/30 focus:outline-none transition-colors"
              />
            </div>

            {/* API Key Input */}
            <div className="bg-white/5 backdrop-blur-md border-2 border-[#8ad4ff]/40 rounded-xl p-3 space-y-3">
              <label className="text-sm font-medium text-white/80">Gemini API Key</label>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="AIza..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono focus:border-white/30 focus:outline-none transition-colors"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 hover:bg-white/10 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-white/50">
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-[#8ad4ff] hover:text-[#8ad4ff]">
                  Get a free API key
                </a> from Google AI Studio - it takes 10 seconds
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={(!selectedFile && !arxivUrl.trim()) || !apiKey.trim() || isGenerating}
              className={cn(
                "w-full rounded-xl transition-all duration-300 relative overflow-hidden group p-[2px] bg-gradient-to-r from-[#ffd78a] via-[#8ad4ff] to-[#ffa8ff] flex-shrink-0",
                isGenerating
                  ? "shadow-xl shadow-[#8ad4ff]/40 animate-pulse cursor-not-allowed"
                  : (!selectedFile && !arxivUrl.trim()) || !apiKey.trim()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:shadow-xl hover:shadow-[#8ad4ff]/40 active:scale-[0.98]"
              )}
            >
              {isGenerating ? (
                <div className="w-full h-full rounded-xl bg-[#0a0a0a] flex items-center justify-center gap-3 font-semibold text-base text-white py-2.5">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Notebook...
                </div>
              ) : (!selectedFile && !arxivUrl.trim()) || !apiKey.trim() ? (
                <div className="w-full h-full rounded-xl bg-[#0a0a0a] flex items-center justify-center gap-3 font-semibold text-base text-white/40 py-2.5">
                  <Zap className="w-5 h-5" />
                  Generate Notebook
                </div>
              ) : (
                <div className="w-full h-full rounded-xl bg-[#0a0a0a] flex items-center justify-center gap-3 font-semibold text-base text-white py-2.5">
                  <Zap className="w-5 h-5" />
                  Generate Notebook
                </div>
              )}
            </button>
          </motion.div>

          {/* Right Column: Progress & Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="rounded-2xl p-[2px] bg-gradient-to-r from-[#ffd78a] via-[#8ad4ff] to-[#ffa8ff] shadow-2xl">
              <div className="h-full min-h-[650px] rounded-[14px] bg-[#0a0a0a] backdrop-blur-xl overflow-hidden relative">

                <AnimatePresence mode="wait">
                  {/* Empty State */}
                  {!isGenerating && !finalJobId && !draftJobId && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                    >
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-4">
                        <Code2 className="w-10 h-10 text-white/20" />
                      </div>
                      <p className="text-lg font-light text-white/30">Generated notebook will appear here</p>
                    </motion.div>
                  )}

                  {/* Loading State */}
                  {isGenerating && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 p-8 overflow-y-auto"
                    >
                      <div className="space-y-8">
                        {/* Spinner */}
                        <div className="flex justify-center">
                          <div className="relative w-20 h-20">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#ffd78a] via-[#8ad4ff] to-[#ffa8ff] blur-xl opacity-30 animate-pulse rounded-full" />
                            <div className="absolute inset-0 border-t-2 border-[#ffd78a] rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                            <div className="absolute inset-2 border-r-2 border-[#8ad4ff] rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                            <div className="absolute inset-4 border-b-2 border-[#ffa8ff] rounded-full animate-spin" style={{ animationDuration: '2.5s' }} />
                            <Loader2 className="w-8 h-8 text-[#8ad4ff] animate-spin absolute inset-0 m-auto" />
                          </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="space-y-4 pl-4 border-l-2 border-white/5">
                          {steps.map((step, index) => {
                            const Icon = stepIcons[index]
                            const isActive = index + 1 === currentStep
                            const isCompleted = completedSteps[index]

                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{
                                  opacity: isActive || isCompleted ? 1 : 0.4,
                                  x: 0,
                                  scale: isActive ? 1.05 : 1,
                                }}
                                className="flex items-start gap-3"
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                                  isCompleted && "bg-white border-black",
                                  isActive && !isCompleted && "border-[#8ad4ff] bg-[#8ad4ff]/20",
                                  !isActive && !isCompleted && "border-white/10 bg-white/5"
                                )}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-black" />
                                  ) : (
                                    <Icon className={cn("w-4 h-4", isActive ? "text-[#8ad4ff]" : "text-white/30")} />
                                  )}
                                </div>
                                <div>
                                  <h4 className={cn(
                                    "font-semibold text-sm transition-colors",
                                    isActive || isCompleted ? "text-white" : "text-white/40"
                                  )}>
                                    {step.name}
                                  </h4>
                                  {step.detail && (
                                    <p className="text-xs text-white/60 mt-1">{step.detail}</p>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>

                        {/* Thinking Box */}
                        {thinking && (
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                                <Brain className="w-4 h-4 text-[#8ad4ff]" />
                                Model Thinking
                              </h4>
                              <button
                                onClick={() => setShowFullscreenThinking(true)}
                                className="text-xs text-[#8ad4ff] hover:text-[#8ad4ff]"
                              >
                                Expand
                              </button>
                            </div>
                            <div className="text-xs font-mono text-white/60 max-h-32 overflow-y-auto">
                              {thinking.slice(-500)}
                            </div>
                          </div>
                        )}

                        {/* Activity Feed */}
                        {activities.length > 0 && (
                          <div className="space-y-3">
                            {activities.map((activity, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 rounded-lg p-4 border border-white/10"
                              >
                                <div className="text-xs text-[#8ad4ff] font-semibold uppercase tracking-wider mb-1">
                                  {activity.label}
                                </div>
                                <h4 className="text-sm font-semibold text-white mb-2">{activity.title}</h4>
                                {activity.type === 'analysis' && (
                                  <p className="text-xs text-white/60">{activity.content.problem}</p>
                                )}
                                {activity.type === 'design' && (
                                  <div className="flex gap-2 flex-wrap">
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded">{activity.content.model_type}</span>
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded">dim={activity.content.embed_dim}</span>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Success State */}
                  {showDone && (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-20 h-20 rounded-full bg-[#8ad4ff]/20 flex items-center justify-center border-2 border-[#8ad4ff] mb-6"
                      >
                        <CheckCircle2 className="w-10 h-10 text-[#8ad4ff]" />
                      </motion.div>
                      <h2 className="text-2xl font-bold text-white mb-2">Notebook Ready!</h2>
                      <p className="text-white/60 mb-6">All cells validated successfully</p>

                      {/* Download Buttons */}
                      {finalJobId && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                          <a
                            href={`${API_URL}/api/download/${finalJobId}`}
                            download
                            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-lg font-semibold transition-all active:scale-95 shadow-lg border-2 border-black flex-1"
                          >
                            <Download className="w-4 h-4" />
                            Download Notebook
                          </a>
                          <button
                            onClick={async () => {
                              try {
                                // Create GitHub Gist via backend (uses GitHub token)
                                const gistResponse = await fetch(`${API_URL}/api/create-gist/${finalJobId}`, {
                                  method: 'POST',
                                });

                                if (!gistResponse.ok) {
                                  const errorText = await gistResponse.text();
                                  throw new Error(`Failed to create Gist: ${errorText}`);
                                }

                                const gistData = await gistResponse.json();

                                // Open in Google Colab with the proper Colab URL
                                window.open(gistData.colab_url, '_blank');
                              } catch (err: any) {
                                console.error('Failed to open in Colab:', err);
                                alert(`Failed to open in Colab: ${err.message}`);
                              }
                            }}
                            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-lg font-semibold transition-all active:scale-95 shadow-lg border-2 border-black flex-1"
                          >
                            <img src="/icons8-google-colab.svg" alt="Colab" className="w-5 h-5" />
                            Open in Colab
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Error State */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm"
                    >
                      <p className="text-sm text-red-300">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 text-xs text-white/40"
        >
          Powered by Gemini 2.0 Flash · Real PyTorch implementations · Bring your own API key
        </motion.div>
      </div>

      {/* Fullscreen Thinking Modal */}
      <AnimatePresence>
        {showFullscreenThinking && thinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowFullscreenThinking(false)}
          >
            <div className="bg-[#0a0a0a] border border-white/20 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#8ad4ff]" />
                  Model Thinking Process
                </h3>
                <button
                  onClick={() => setShowFullscreenThinking(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="font-mono text-sm text-white/80 whitespace-pre-wrap">
                {thinking}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
