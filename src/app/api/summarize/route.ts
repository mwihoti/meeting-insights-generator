import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // Validate incoming request
    const { prompt } = await req.json()
    if (!prompt) {
      return new NextResponse('Missing prompt in request body', { status: 400 })
    }

    // Validate API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OpenAI API key is not configured')
      return new NextResponse('Server configuration error', { status: 500 })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes meeting transcripts. Provide a concise summary with key points and action items. List major points'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      })
    })

    if (!response.ok) {
      // Get the error details from the API response
      const errorData = await response.json().catch(() => null)
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })

      return NextResponse.json({
        error: `OpenAI API error: ${response.statusText}`
      }, { status: response.status })
      
     {/* // Return appropriate error message based on status code
      if (response.status === 401) {
        return new NextResponse('Invalid API key', { status: 500 })
      } else if (response.status === 429) {
        return new NextResponse('Rate limit exceeded', { status: 429 })
      } else {
        return new NextResponse(`OpenAI API error: ${response.statusText}`, { status: response.status })
      }
      */}
    }

    const data = await response.json()
    
    // Validate response data
    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected API response format:', data)
      return new NextResponse('Invalid response from OpenAI API', { status: 500 })
    }

    return NextResponse.json({
      summary: data.choices[0].message.content
    })

   
    
  } catch (error) {
    console.error('Error in summarize API:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    )
  }
}