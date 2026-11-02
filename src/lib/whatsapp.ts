// WhatsApp via CallMeBot (free). The recipient number must first activate the bot:
// https://www.callmebot.com/blog/free-api-whatsapp-messages/
export async function sendWhatsApp(text: string, phone = process.env.ADMIN_WHATSAPP_NUMBER) {
  const apiKey = process.env.CALLMEBOT_APIKEY
  if (!apiKey || !phone) throw new Error('CALLMEBOT_APIKEY oder ADMIN_WHATSAPP_NUMBER fehlt.')

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  const body = await res.text()
  // CallMeBot answers HTTP 200 even for errors, so the body has to be checked too.
  if (!res.ok || !/queued|sent/i.test(body)) {
    throw new Error(`CallMeBot-Fehler ${res.status}: ${body.replace(/<[^>]+>/g, ' ').trim().slice(0, 200)}`)
  }
}
