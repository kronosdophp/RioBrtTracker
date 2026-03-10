import { NextResponse } from "next/server"

const BRT_API_URL =
  process.env.BRT_API_URL || "http://localhost:8080/api/veiculos"

export async function GET() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(BRT_API_URL, {
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend retornou ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Erro ao conectar ao backend C++:", error)
    return NextResponse.json(
      {
        error: "Nao foi possivel conectar ao backend. Verifique se o servidor C++ esta rodando.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 503 }
    )
  }
}
