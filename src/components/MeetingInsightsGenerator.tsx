'use client'

import { useState, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { useCompletion } from 'ai/react'
import { AudioRecorder } from './AudioRecorder'
//import { generatePDF } from '@/lib/pdf-utils'

export default function MeetingInsightsGenerator() {

    const [transcript, setTranscript] = useState('')
    const [summary, setSummary] = useState('')
    const [images, setImages] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
    const audioRef = useRef<HTMLAudioElement>(null)
    const { complete } = useCompletion({
        api: '/api/summarize',
    })

    const handleTranscriptUpdate = (newTranscript: string) => {
        setTranscript((prev) => prev + newTranscript)
    }

    const handleRecordingComplete = (blob: Blob ) => {
        setAudioBlob(blob)
        if (audioRef.current) {
            audioRef.current.src = URL.createObjectURL(blob)
       }
    }

    const generateInsights = async () => {
        try {
            setError(null)
            setIsGeneratingInsights(true)

            // call the summarize API
            const summaryResponse = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: transcript})
            })

            if (!summaryResponse.ok) {
                throw new Error('Failed to generate summary')
            }

            const summarizedText = await summaryResponse.text()
            setSummary(summarizedText)

            //Extract keywords from summary for image search

            const keywords = summarizedText.split('').slice(0, 5).join(' ')
            const response = await fetch(`/api/image-search?query=${encodeURIComponent(keywords)}`)
            if (!response.ok) {
                throw new Error('Failed to generate images')
            }
            const data = await response.json()
            setImages(data.images)
        } catch (error) {
            console.error('Error generating insights:', error)
            setError(`Error generating insights: ${error instanceof Error ? error.message : String(error)}`)
        }

        }
    const handleGeneratePDF = async () => {
        try {
            await generatePDF(transcript, summary, images)
        } catch (error) {
            console.error('Error generating PDF:', error)
            setError(`Error generating PDF: ${error instanceof Error ? error.message : String(error)}`)
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
        <div className='w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden'>
            <div className='p-6 border-b'>
                <h2 className='text-2xl font-semibold text-gray-800'>Meeting Insights Generator</h2>
                <p className='text-sm text-gray-600'>Record your meeting, get insights, and find relevant visuals</p>

            </div>
            <div className='p-6 space-y-4'>
                {error && (
                    <div className='bg-red-100 border-l-4 border-red-500 text-red-700 p-4 relative' role="alert">
                        <AlertCircle className='h-4 w-4 absolute left-4 top-4'/>
                        <p className='font-bold ml-6'>Error</p>
                        <p className='ml-6'>{error}</p>
                    </div>
                )}
               <AudioRecorder onTranscriptUpdate={handleTranscriptUpdate} onRecordingComplete={handleRecordingComplete}/>
                {audioBlob && (
                    <div className='flex items-center space-x-2'>
                        <audio ref={audioRef} controls className='w-full'/>
                        <button 
                        onClick={handleDownloadAudio}
                        className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200'> 
                        Download Audio
                        </button>
                        </div>
                )}

                <textarea 
                placeholder='Transcript will appear here...'
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                className='w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <button
                onClick={generateInsights}
                disabled={!transcript || isGeneratingInsights}
                className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                    {isGeneratingInsights ? 'Generaing Insights...' : ''}
                </button>

                {summary && (
                    <div>
                        <h3 className='text-lg font-semibold'>Summary</h3>
                        <p className='text-gray-700'>{summary}</p>
                        </div>
                )}
                {images.length > 0 && (
                    <div>
                        <h3 className='text-lg font-semibold'>Relevant Visuals</h3>
                        <div className='grid grid-cols-2 gap-4'>
                            {images.map((image, index) => (
                                <img key={index} src={image} alt={`Relevant visual ${index + 1}`} className='w-full h-auto rounded' />

                            ))}
                        </div>
                    </div>
                )}
                {(summary || images.length > 0) && (
                    <button
                    onClick={handleGeneratePDF}
                    className='px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition duration-200'>
                        Generate PDF Report
                    </button>
                ) }
            </div>

        </div>
    )

}
