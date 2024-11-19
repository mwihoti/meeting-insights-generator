import { useState, useRef, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'
import * as tf from '@tensorflow/tfjs'
import * as speechCommands from '@tensorflow-models/speech-commands'
import { AudioRecorder } from './AudioRecorder';


interface AudioRecorderProps {
    onTranscriptUpdate: (transcript: string) => void
    onRecordingComplete: (blob: Blob) => void
}

export function AudioRecorder({ onTranscriptUpdate, onRecordingComplete}: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationFrameRef = useRef<number | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)


    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true})
            mediaRecorderRef.current = new MediaRecorder(stream)
            audioChunksRef.current = []


            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav'})
                onRecordingComplete(audioBlob)
            }

            speechRecognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
            speechRecognitionRef.current.continous = true
            speechRecognitionRef.current.interimResults = true
            
            
            speechRecognitionRef.current.onresult = (event ) => {
                const currentTranscript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('')
                setTranscript(currentTranscript)
                onTranscriptUpdate(currentTranscript)
            }
            mediaRecorderRef.current.start()
            speechRecognitionRef.current.start()
            setIsRecording(true)


            // Set up audio analysis

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            analyserRef.current = audioContextRef.current.createAnalyser()
            const source = audioContextRef.current.createMediaStreamSource(stream)
            source.connect(analyserRef.current)


            // Start Visualization
            visualize()
            
        } catch (error) {
            console.error('Error starting recording:', error)
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && speechRecognitionRef.current) {
            mediaRecorderRef.current.stop()
            speechRecognitionRef.current.stop()
            setIsRecording(false)

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current) 
            }
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }

    const visualize = () => {
        if (!canvasRef.current || !analyserRef.current) return

        const canvas = canvasRef.current
        const canvasCtx = canvas.getContext('2d')
        if (!canvasCtx) return

        const WIDTH = canvas.width
        const HEIGHT = canvas.height


        analyserRef.current.fftSize = 2048
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)


        canvasCtx.clearRect()
    }
} 


return (
    <div className='space-y-4'>
        <div className='flex items-center space-x-2'>

            <button 
            onClick={isRecording ? stopRecording : startRecording}
             className={`px-4 py-2 rounded ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white transition duration-200`}
        >
                {isRecording ? (
            <>
              <Square className="w-5 h-5 inline-block mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 inline-block mr-2" />
              Start Recording
            </>
          )}
            </button>
                    {isRecording && <div className="text-red-500 animate-pulse">Recording...</div>}

        </div>
        <div className='border p-4 rounded-lg bg-gray-50'>
        <h3 className='font-semibold mb-2'>Transcript:</h3>
        <p className='whitespace-pre-wrap'>{transcript}</p>
        </div>
         <canvas ref={canvasRef} width="640" height="100" className="w-full h-24 bg-black" />
    </div>
)