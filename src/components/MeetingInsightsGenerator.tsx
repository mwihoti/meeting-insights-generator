'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { AudioRecorder } from './AudioRecorder'
import * as tf from '@tensorflow/tfjs'
import * as use from '@tensorflow-models/universal-sentence-encoder'

interface Insights {
  summary: string
  audioFeatures: number[] | null
}

export default function MeetingInsightsGenerator() {
  const [transcript, setTranscript] = useState('')
  const [insights, setInsights] = useState<Insights | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [model, setModel] = useState<use.UniversalSentenceEncoder | null>(null)

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready()
        console.log('TensorFlow.js is ready')
        const loadedModel = await use.load()
        setModel(loadedModel)
        console.log('Universal Sentence Encoder model loaded')
      } catch (error) {
        console.error('Error loading model:', error)
        setError('Failed to load TensorFlow.js model')
      }
    }
    loadModel()
  }, [])

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
    if (!model) {
      setError('Model not loaded yet. Please wait and try again.')
      return
    }

    try {
      setError(null)
      setIsGeneratingInsights(true)

      // Text summarization using TensorFlow.js
      const sentences = transcript.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0)
      const embeddings = await model.embed(sentences)
      const sentenceImportance = tf.tidy(() => {
        const sentenceMean = embeddings.mean(0)
        const cosineSimilarities = embeddings.dot(sentenceMean).div(
          embeddings.norm('euclidean', 1, true).mul(sentenceMean.norm('euclidean'))
        )
        return cosineSimilarities.arraySync() as number[]
      })

      const topSentences = sentences
        .map((sentence, index) => ({ sentence, importance: sentenceImportance[index] }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3)
        .map(item => item.sentence)

      const summary = topSentences.join(' ')

      // Audio analysis
      const audioFeatures = await analyzeAudio()

      setInsights({ summary, audioFeatures })
    } catch (error) {
      console.error('Error generating insights:', error)
      setError(`Error generating insights: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  const analyzeAudio = async (): Promise<number[] | null> => {
    if (!audioBlob) {
      console.warn('No audio data available')
      return null
    }

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer())
      const channelData = audioBuffer.getChannelData(0) // Get the first channel

      const audioTensor = tf.tensor1d(channelData)
      
      // Perform basic audio analysis (e.g., calculate mean and standard deviation)
      const mean = tf.mean(audioTensor)
      const std = tf.moments(audioTensor).variance.sqrt()

      const result = [mean.dataSync()[0], std.dataSync()[0]]

      // Clean up
      audioTensor.dispose()
      mean.dispose()
      std.dispose()

      return result
    } catch (error) {
      console.error('Error analyzing audio:', error)
      return null
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
        <p className="text-sm text-gray-600">Record your meeting, get insights, and analyze audio</p>
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
            disabled={!transcript || isGeneratingInsights || !model}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingInsights ? 'Generating Insights...' : 'Generate Insights'}
          </button>
        </div>
        {insights && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Summary</h3>
              <p className="text-gray-700">{insights.summary}</p>
            </div>
            {insights.audioFeatures && (
              <div>
                <h3 className="text-lg font-semibold">Audio Features</h3>
                <p className="text-gray-700">Mean: {insights.audioFeatures[0].toFixed(2)}, Standard Deviation: {insights.audioFeatures[1].toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}