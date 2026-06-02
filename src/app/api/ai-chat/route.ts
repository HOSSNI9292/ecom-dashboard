import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, groqKey, dataContext } = await req.json();

    if (!groqKey) {
      return NextResponse.json(
        { error: "Groq API key missing. Add it in Settings." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert e-commerce analyst assistant for a Cash-on-Delivery (COD) business in Africa. You help the business owner make data-driven decisions about products, advertising, and stock management.

You have access to the following real-time data about their business:

${dataContext}

Your role:
1. Analyze product performance (fake orders, confirmation rates, revenue)
2. Provide actionable advice on whether to stop, reduce, or increase advertising
3. Monitor stock levels and alert when restocking is needed
4. Identify trends and patterns in the data
5. Answer questions in Darija (Moroccan Arabic), French, or English based on user preference

Guidelines:
- Be direct and actionable
- Use specific numbers from the data
- Prioritize high-risk products (fake rate > 50%)
- Recommend stopping ads for products with fake rate > 50%
- Recommend increasing ads for products with fake rate < 15% and good revenue
- Always mention stock status when relevant
- Use emojis sparingly for emphasis
- Keep responses concise but informative
- If asked about a specific product, search the data for it
- Format numbers with proper currency (XOF for West Africa)`;

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Groq API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
