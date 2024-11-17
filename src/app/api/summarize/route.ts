import { NextResponse } from 'next/server'
import nlp from 'compromise'

function summarize(text: string, numSentences: number = 3): string {
  const doc = nlp(text)
  const sentences = doc.sentences().out('array')

  // Calculate term frequency
  const terms = doc.terms().out('frequency')
  const termFrequency: { [key: string]: number } = {}
  terms.forEach(term => {
    termFrequency[term.normal] = term.count
  })

  // Score sentences based on term frequency
  const sentenceScores = sentences.map(sentence => ({
    sentence,
    score: nlp(sentence).terms().out('array')
      .reduce((score, term) => score + (termFrequency[term] || 0), 0)
  }))

  // Sort sentences by score and select top N
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, numSentences)
    .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))

  // Join the top sentences to form the summary
  return topSentences.map(item => item.sentence.trim()).join(' ')
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()
    const summary = summarize(prompt)
    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Error in summarize API:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}