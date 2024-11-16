import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const response = await fetch (
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    }
    )

    const data = await response.json()
    const images = data.results.map((result: any) => result.url.small)
    return NextResponse.json({ images })
}