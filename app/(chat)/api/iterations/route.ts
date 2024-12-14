import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { input } = await req.json();

  try {
    const { text }: { text: string } = await generateText({
      model: groq("llama3-8b-8192"),
      system: `ou are an AI that evaluates the complexity of problems. Analyze the problem and if it is a mathematical problem or one that requires physics it requires more iterations because conventional AI usually fails. ONLY RETURN the number, without any other indication, do not exceed 8 if possible, for example an example answer would be “4”. If it is something that is not reasoning, such as greeting you or doing some static text that you can generate, put “1” and that's it.`,
      prompt: `Determine the number of iterations required to solve the following problem: ${input}.`,
    });

    const iterations: number = parseInt(text, 10);

    if (isNaN(iterations)) {
      throw new Error("Invalid number received from the AI model");
    }

    return NextResponse.json({ iterations });
  } catch (error) {
    return NextResponse.json(
      { error: "Error generating text" },
      { status: 500 }
    );
  }
}
