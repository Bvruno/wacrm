import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const text = formData.get("text") as string | null
    const title = formData.get("title") as string | null

    const params = new URLSearchParams()

    const phonePattern = /^[\d\s\-+()]{7,20}$/
    if (text && phonePattern.test(text.trim())) {
      params.set("phone", text.trim())
      return NextResponse.redirect(
        new URL(`/contacts/new?${params.toString()}`, req.url),
        302,
      )
    }

    if (text) {
      params.set("note", text)
    }
    if (title) {
      params.set("title", title)
    }

    const redirectPath = params.toString()
      ? `/contacts/new?${params.toString()}`
      : "/inbox"

    return NextResponse.redirect(new URL(redirectPath, req.url), 302)
  } catch {
    return NextResponse.redirect(new URL("/inbox", req.url), 302)
  }
}
