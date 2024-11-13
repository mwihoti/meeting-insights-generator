'use client'

import { useState } from 'react'
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Textarea } from "./ui/textarea"
import { useCompletion } from 'ai/react'
import { AlertCircle, Images } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { AudioRecorder } from './AudioRecorder'
import { generatePDF } from '@/lib/pdf-utils'

export default function MeetingInsightsGenerator() {

    const [transcript, setTranscript] = useState('')
    const [summary, setSummary] = useState('')
    const [images, setImages] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

    const { complete } = useCompletion({
        api: '/api/summarize',
    })

    const handleTranscriptUpdate = (newTranscript: string) => {
        setTranscript((prev) => prev + newTranscript)
    }

    const handleRecordingComplete = (blob: Blob ) => {
        setAudioBlob(blob)
    }

    const generateInsights = async () => {
        try {
            setError(null)
            const summarizedText = await complete(transcript)
            setSummary(summarizedText)

            //Extract keywords from summary for image search

            const keywords = summarizedText.split('').slice(0, 5).join(' ')
            const response = await fetch(`/api/image-search?query=${encodeURIComponent(keywords)}`)
            const data = await response.json()
            setImages(data.images)
        } catch (error) {
            console.error('Error generating insights:', error)
            setError(`Error generating insights: ${error instanceof Error ? error.message : String(error)}`)
        }

        }
    const handleGeneratePdF = async () => {
        try {
            await generatePDF(transcript, summary, images)
        } catch (error) {
            console.error('Error generating PDF:', error)
            setError(`Error generating PDF: ${error instanceof Error ? error.message : String(error)}`)
        }
    }
    
    
    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Meeting Insights Generator</CardTitle>

                <CardDescription>Record your meeting, get insights, and find relevant visuals</CardDescription>

            </CardHeader>

            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
     <AudioRecorder onTranscriptUpdate={handleTranscriptUpdate} onRecordingComplete={handleRecordingComplete} />
     <Textarea 
     placeholder="Transcript will appear here..."
     value={transcript}
     onChange={(e) => setTranscript(e.target.value)}
     rows={10}
     />
     <Button onClick={generateInsights} disabled={!transcript}>Generate Insights</Button>
     {summary && (
        <div>
            <h3 className='text-lg font-semibold'>Summary</h3>
            <p>{summary}</p>
        </div>
     )}
     {images.length > 0 && (
        <div>
            <h3 className='text-lg font-semibold'>Related Images</h3>
            <div className='grid grid-cols-2 gap-4'>
                {images.map((image, index) => (
                    <img key={index} src={image} alt={`Related image ${index + 1}`} className='w-full h-auto' />
                ))}
            </div>
        </div>
     )}
     {(summary || Images.length > 0) && (
        <Button onClick={handleGeneratePdF} > Generate PDF Report</Button>
     )}

            </CardContent>

        </Card>
    )

}
