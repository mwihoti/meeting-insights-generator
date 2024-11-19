'use client'

import { useState, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { AudioRecorder } from './AudioRecorder'
import { generatePDF, generateTranscriptPDF } from '@/lib/pdf-utils'

export default function MeetingInsightsGenerator() {
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isGeneratingTranscriptPDF, setIsGeneratingTranscriptPDF] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleTranscriptUpdate = (newTranscript: string) => {
    setTranscript(newTranscript)
  }

  const handleRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob)
    if (audioRef.current) {
      audioRef.current.src = URL.createObjectURL(blob)
    }
  }

  const generateInsights = async () => {
    try {
      setError(null)
      setIsGeneratingInsights(true)

      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: transcript }),
      })

      if (!summaryResponse.ok) {
        throw new Error(`Failed to generate summary. API error: ${summaryResponse.statusText}`)
      }

      const data = await summaryResponse.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setSummary(data.summary)
      
      setImages([])
    } catch (error) {
      console.error('Error generating insights:', error)
      setError(`Error generating insights: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  const handleGeneratePDF = async () => {
    try {
      setError(null)
      setIsGeneratingPDF(true)
      await generatePDF(transcript, summary, images)
    } catch (error) {
      console.error('Error generating PDF:', error)
      setError(`Error generating PDF: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleGenerateTranscriptPDF = async () => {
    try {
      setError(null)
      setIsGeneratingTranscriptPDF(true)
      await generateTranscriptPDF(transcript)
    } catch (error) {
      console.error('Error generating transcript PDF:', error)
      setError(`Error generating transcript PDF: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGeneratingTranscriptPDF(false)
    }
  }

  const handleDownloadAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'meeting_recording.wav'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-semibold text-gray-800">Meeting Insights Generator</h2>
        <p className="text-sm text-gray-600">Record your meeting, get insights, and find relevant visuals</p>
      </div>
      <div className="p-6 space-y-4">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 relative" role="alert">
            <AlertCircle className="h-4 w-4 absolute left-4 top-4" />
            <p className="font-bold ml-6">Error</p>
            <p className="ml-6">{error}</p>
          </div>
        )}
        <AudioRecorder 
          onTranscriptUpdate={handleTranscriptUpdate}
          onRecordingComplete={handleRecordingComplete} 
        />
        {audioBlob && (
          <div className="flex items-center space-x-2">
            <audio ref={audioRef} controls className="w-full" />
            <button
              onClick={handleDownloadAudio}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
            >
              Download Audio
            </button>
          </div>
        )}
        <div className="flex space-x-2">
          <button
            onClick={generateInsights}
            disabled={!transcript || isGeneratingInsights}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingInsights ? 'Generating Insights...' : 'Generate Insights'}
          </button>
          <button
            onClick={handleGenerateTranscriptPDF}
            disabled={!transcript || isGeneratingTranscriptPDF}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingTranscriptPDF ? 'Generating PDF...' : 'Download Transcript as PDF'}
          </button>
        </div>
        {summary && (
          <div>
            <h3 className="text-lg font-semibold">Summary</h3>
            <p className="text-gray-700">{summary}</p>
          </div>
        )}
        {images.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold">Relevant Visuals</h3>
            <div className="grid grid-cols-2 gap-4">
              {images.map((image, index) => (
                <img key={index} src={image} alt={`Relevant visual ${index + 1}`} className="w-full h-auto rounded" />
              ))}
            </div>
          </div>
        )}
        {(summary || images.length > 0) && (
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? 'Generating PDF...' : 'Generate Full PDF Report'}
          </button>
        )}
      </div>
    </div>
  )
}