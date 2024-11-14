'use client'

import {useState, useRef, useEffect} from 'react';

interface AudioRecorderProps {
    onTranscriptUpdate: (transcript: string) => void
    OnRecordingComplete: (audioBlob: Blob) => void
}

export function AudioRecorder({ onTranscriptUpdate, onRecordingComplete }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const lastTranscritRef = useRef<string>('')

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop()
            }
        }
    }, [])

    const startRecording = async () => {
        try {
            setError(null)
            audioChunksRef.current = []
            lastTranscritRef.current = ''

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true})

            mediaRecorderRef.current = new MediaRecorder(stream)

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data)
            }
            mediaRecorderRef.current.onstop = () => {
                const audioBlob =  new Blob(audioChunksRef.current, { type: 'audio/wav'})
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
                        if (event.results[i].isFiinal) {
                            finalTranscript += event.results[i][0].transcript

                        } else {
                            interimTranscript += event.results[i][0].transcript
                        }
                    }

                    const newTranscript = finalTranscript + interimTranscript
                    if (newTranscript !== lastTranscritRef.current) {
                        onTranscriptUpdate(newTranscript.slice(lastTranscritRef.current.length))
                        lastTranscritRef.current = newTranscript
                    }
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

    return (
        <div>

            <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-4 py-2 rounded transition duration200 ${
                isRecording ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {error && <p className='text-red-500 mt-2'>{error}</p>}
        </div>
    )
}