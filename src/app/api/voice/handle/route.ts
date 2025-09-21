import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

function xml(str: string) {
  return new NextResponse(str, { headers: { "Content-Type": "text/xml" } })
}

const intro = `Vanakkam! Naan TN Gamyam udhavi aasiriyar. Neenga kekka virumbura sevai enna? Udharanama: bus ETA, nearby stop, OTP login.`

export async function POST(req: NextRequest) {
  try {
    // Twilio sends application/x-www-form-urlencoded
    const form = await req.formData()
    const speech = (form.get("SpeechResult") || form.get("speechResult") || "").toString()
    const digits = (form.get("Digits") || "").toString()
    const from = (form.get("From") || "").toString()

    const userText = (speech || digits || "").trim()

    if (!process.env.OPENAI_API_KEY) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi-Neural">${intro}</Say>
  <Pause length="1"/>
  <Say>Please configure OPENAI API key to enable AI responses.</Say>
  <Gather input="speech dtmf" language="ta-IN" hints="bus, ETA, stop, login" action="/api/voice/handle" method="POST" timeout="5"/>
</Response>`
      return xml(twiml)
    }

    let reply = ""

    if (!userText) {
      reply = intro
    } else {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const prompt = `Caller: ${from}\nQuestion: ${userText}\n\nYou are an AI phone assistant for TN Gamyam, a Srivilliputhur bus tracking app.\n- Answer briefly in Tamil first when caller speaks Tamil; otherwise, reply in clear English.\n- Offer app guidance: OTP login via mobile number, check Live Tracks tab for ETAs, use Nearby for stops, temple-route alerts.\n- Do not ask for sensitive data.\n- Keep responses under 3 sentences and friendly.`

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a concise, helpful transit phone assistant for TN Gamyam." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 160,
      })
      reply = completion.choices?.[0]?.message?.content || "Naan udhavi seiven. Neenga enna thevai?"
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi-Neural">${escapeXml(reply)}</Say>
  <Pause length="1"/>
  <Gather input="speech dtmf" language="ta-IN" hints="bus, ETA, stop, login" action="/api/voice/handle" method="POST" timeout="5">
    <Say voice="Polly.Aditi-Neural">Innum kelvi irundhaal sollunga. To repeat, speak after the beep.</Say>
  </Gather>
</Response>`

    return xml(twiml)
  } catch (err) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi-Neural">Sorry, service tharkaalikaaga kidaikkavillai. Please try again.</Say>
  <Hangup/>
</Response>`
    return xml(twiml)
  }
}

export async function GET(req: NextRequest) {
  // Allow simple browser checks
  return POST(req)
}

function escapeXml(unsafe: string) {
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}