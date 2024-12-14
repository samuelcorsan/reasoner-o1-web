import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { input } = await req.json();

  try {
    const { text }: { text: string } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are an expert problem solver specializing in providing initial solutions using thorough chain-of-thought reasoning.

**Your Objectives:**
- Understand the problem deeply.
- Provide a detailed, step-by-step solution.
- If applicable, include and test code snippets to verify your solution.
- Reflect and iterate on your solution until confident.

**Instructions:**
- After each reasoning step, decide whether you need to continue refining your reasoning or if you're ready to pass your solution to the next agent.
- Use at least three different approaches to validate your answer.
- Be explicit about any uncertainties or assumptions in your reasoning.

**Response Format:**
Create the chain of thought in the language in which you are spoken or in the language you are told to speak if you are instructed to do so, otherwise in the language in which you are spoken. DO NOT RESPOND with any hints to give, just the JSON.
Respond in JSON format with the following keys for each step of the chain that you think needs to be done:
- "title": A brief title for the reasoning step.
- "content": Detailed explanation of the reasoning step.
- \`"next_action"\`: \`"continue"\` to proceed with more steps or \`"final_answer"\` if you are confident in your solution.

Include code snippets within triple backticks (\`\`\`javascript) if they aid your solution. An example use case is that whenever you are identifying letters or words in a text you should use \`\`\`javascript\``,
      prompt: `Create a chain of thought to solve the following problem: ${input}.`,
    });

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: "Error generating text" },
      { status: 500 }
    );
  }
}
