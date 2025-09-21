import { NextRequest, NextResponse } from 'next/server'

function xml(str: string) {
  return new NextResponse(str, { headers: { 'Content-Type': 'text/xml' } })
}

export async function POST(_req: NextRequest) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi-Neural">Vanakkam! Welcome to TN Gamyam, Srivilliputhur bus assistant.</Say>
  <Say>Naan ungalukku udhavi seiven. Pesungal allathu keypad use pannunga.</Say>
  <Pause length="1"/>
  <Gather input="speech dtmf" language="ta-IN" hints="bus, ETA, stop, login" action="/api/voice/handle" method="POST" timeout="5">
    <Say voice="Polly.Aditi-Neural">Please say your question after the beep. For example: next bus ETA, nearby stops, or login help.</Say>
  </Gather>
  <Say>If you did not say anything, you can try again.</Say>
  <Redirect method="POST">/api/voice/answer</Redirect>
</Response>`
  return xml(twiml)
}

export async function GET(req: NextRequest) {
  // Twilio can send GET for validation, respond with same TwiML
  return POST(req)
}