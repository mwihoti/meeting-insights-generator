'use client'

import { useState, useRef, useEffect } from 'react'

interface AudioRecorderProps {
  onTranscriptUpdate: (transcript: string) => void
  onRecordingComplete: (audioBlob: Blob) => void
}

export function AudioRecorder({ onTranscriptUpdate, onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editableTranscript, setEditableTranscript] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const lastTranscriptRef = useRef<string>('')

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
      // Reset the transcript when component unmounts
      setEditableTranscript('')
      lastTranscriptRef.current = ''
    }
  }, [])

  const startRecording = async () => {
    try {
      setError(null)
      audioChunksRef.current = []
      lastTranscriptRef.current = ''
      setEditableTranscript('')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        onRecordingComplete(audioBlob)
      }

      mediaRecorderRef.current.start()

      if ('webkitSpeechRecognition' in window) {
        recognitionRef.current = new webkitSpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            } else {
              interimTranscript += event.results[i][0].transcript
            }
          }

          const newTranscript = lastTranscriptRef.current + finalTranscript + interimTranscript
          const processedTranscript = postProcessTranscript(newTranscript)
          setEditableTranscript(processedTranscript)
          onTranscriptUpdate(processedTranscript)
          lastTranscriptRef.current = newTranscript
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          setError(`Speech recognition error: ${event.error}`)
        }

        recognitionRef.current.start()
      } else {
        setError('Speech recognition is not supported in this browser.')
      }

      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError(`Error starting recording: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }

    setIsRecording(false)
  }

  const handleTranscriptEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTranscript = e.target.value
    setEditableTranscript(newTranscript)
    onTranscriptUpdate(newTranscript)
    lastTranscriptRef.current = newTranscript
  }

  const postProcessTranscript = (text: string): string => {
    return text
      .replace(/\bi\b/g, 'I')
      .replace(/(?<=\.\s|\?\s|\!\s)[a-z]/g, m => m.toUpperCase())
      .replace(/\b(ok|okay)\b/gi, 'OK')
  }

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded transition duration-200 ${
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
      <textarea
        value={editableTranscript}
        onChange={handleTranscriptEdit}
        placeholder="Transcript will appear here. You can edit it to correct any mistakes."
        rows={10}
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  )
}