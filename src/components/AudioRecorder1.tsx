import { useState, useRef, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'


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
    const finalTranscriptRef = useRef('')

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
            finalTranscriptRef.current = '' // Reset the transcript when starting new recording
            setTranscript('') // Clear the displayed transcript

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
            speechRecognitionRef.current.continuous = true // Fixed typo from 'continous'
            speechRecognitionRef.current.interimResults = true
            
            speechRecognitionRef.current.onresult = (event) => {
                let interimTranscript = ''
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i]
                    if (result.isFinal) {
                        finalTranscriptRef.current += result[0].transcript + ' '
                    } else {
                        interimTranscript += result[0].transcript
                    }
                }

                const currentTranscript = finalTranscriptRef.current + interimTranscript
                setTranscript(currentTranscript)
                onTranscriptUpdate(currentTranscript)
            }

            // Reset recognition on error
            speechRecognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error)
                if (speechRecognitionRef.current) {
                    speechRecognitionRef.current.stop()
                    setTimeout(() => {
                        if (isRecording && speechRecognitionRef.current) {
                            speechRecognitionRef.current.start()
                        }
                    }, 1000)
                }
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

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw)
            analyserRef.current!.getByteFrequencyData(dataArray)

            canvasCtx.fillStyle = 'rgb(0, 0, 0)'
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

            const barWidth = (WIDTH / bufferLength) * 2.5
            let barHeight
            let x = 0

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2
                canvasCtx.fillStyle = `rgb(${barHeight + 100},50, 50)`
                canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight)
                x += barWidth + 1
            }
        }
        draw()
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
            <div className='border p-4 rounded-lg bg-gray-500'>
                <h3 className='font-semibold mb-2'>Transcript:</h3>
                <p className='whitespace-pre-wrap'>{transcript}</p>
            </div>
            <canvas ref={canvasRef} width="640" height="100" className="w-full h-24 bg-black" />
        </div>
    )
}