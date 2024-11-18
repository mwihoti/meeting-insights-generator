import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { prompt } = await req.json()

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes meeting transcripts. Provide a concise summary with key points and action items.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate summary')
    }

    const data = await response.json()
    const summary = data.choices[0].message.content

    return new NextResponse(summary)
  } catch (error) {
    console.error('Error in summarize API:', error)
    return new NextResponse('Error generating summary', { status: 500 })
  }
}