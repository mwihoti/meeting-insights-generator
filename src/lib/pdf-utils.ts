import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export async function generatePDF(transcript: string, summary: string, images: string[]) {
 
    const doc = new jsPDF()

    // Add tittle
    doc.setFontSize(20)
    doc.text('Meeting Insights Reports', 20, 20)

    // Add transcript
    doc.setFontSize(16)
    doc.text('Transcript', 20, 40)
    doc.setFontSize(12)
    const splitTranscript = doc.splitTextToSize(transcript, 170)
    doc.text(splitTranscript, 20, 50)

    // Add summary

    const summaryY = doc.internal.pageSize.height - doc.internal.pageSize.height + 60
    doc.setFontSize(16)
    doc.text('Summary', 20, summaryY)
    doc.setFontSize(12)
    doc.text(summary, 20, summaryY + 20, {maxWidth: 170 })
    const splitSummary = doc.splitTextToSize(transcript, 170)
    doc.text(splitSummary, 20, summaryY + 10)

    // Add images

    if (images.length > 0) {
        const imagesY = doc.internal.pageSize.height - doc.internal.pageSize.height + 30
        doc.setFontSize(16)
        doc.text('Relevant Visuals', 20, imagesY )

        for (let i = 0; i < images.length; i++) {
            try {
            const img = await loadImage(images[i])
            const imgWidth = 80
            const imgHeight = (img.height * imgWidth) / img.width
            const x = 20 + (i % 2) * 90
            const y = imagesY + 20 + Math.floor(1 / 2) * (imgHeight + 10)
            doc.addImage(img, 'JPEG', x, y, imgWidth, imgHeight )
        }
        catch (error) {
            console.error(`Error loading image ${i}:`, error)
        }

    }
}

    doc.save('meeting-insights-report.pdf')

}

export function generateTranscriptPDF(transcript: string) {
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(20)
    doc.text('Meetig Transcript', 20, 20)

    // Add transcript
    doc.setFontSize(12)
    const splitTranscript = doc.splitTextToSize(transcript, 170)
    doc.text(splitTranscript, 20, 30)

    // save the pdf
    doc.save('meeting-transcript.pdf')
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
        img.crossOrigin = 'anonymous'
    }) 
}
