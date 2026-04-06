import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface BedrockResponse {
  content: Array<{ type: string; text: string }>;
  id: string;
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

// ---------------------------------------------------------------------------
// Client (singleton)
// ---------------------------------------------------------------------------

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!client) {
    const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID;
    const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY;
    const region = process.env.BEDROCK_REGION || "us-east-1";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing Bedrock credentials. Set BEDROCK_ACCESS_KEY_ID and BEDROCK_SECRET_ACCESS_KEY in .env.local"
      );
    }

    client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Core invoke
// ---------------------------------------------------------------------------

export async function invokeModel(
  modelId: string,
  messages: Message[],
  systemPrompt: string,
  maxTokens: number = 1024
): Promise<string> {
  const bedrockClient = getClient();

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  try {
    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: new TextEncoder().encode(body),
    });

    const response = await bedrockClient.send(command);
    const responseBody: BedrockResponse = JSON.parse(
      new TextDecoder().decode(response.body)
    );

    if (!responseBody.content || responseBody.content.length === 0) {
      throw new Error("Empty response from Bedrock");
    }

    return responseBody.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Re-throw known errors with more context
      if (error.name === "AccessDeniedException") {
        throw new Error(
          `Bedrock access denied for model ${modelId}. Verify IAM permissions and model access in the AWS console.`
        );
      }
      if (error.name === "ValidationException") {
        throw new Error(
          `Bedrock validation error for model ${modelId}: ${error.message}`
        );
      }
      if (error.name === "ThrottlingException") {
        throw new Error(
          "Bedrock rate limit exceeded. Please wait a moment and try again."
        );
      }
      if (error.name === "ModelNotReadyException") {
        throw new Error(
          `Model ${modelId} is not ready. It may need to be enabled in the AWS Bedrock console.`
        );
      }
      throw new Error(`Bedrock error (${error.name}): ${error.message}`);
    }
    throw new Error("Unknown error invoking Bedrock model");
  }
}

// ---------------------------------------------------------------------------
// Helpers for specific models
// ---------------------------------------------------------------------------

const SONNET_MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";
const HAIKU_MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0";

export async function invokeSonnet(
  messages: Message[],
  systemPrompt: string,
  maxTokens: number = 2048
): Promise<string> {
  return invokeModel(SONNET_MODEL_ID, messages, systemPrompt, maxTokens);
}

export async function invokeHaiku(
  messages: Message[],
  systemPrompt: string,
  maxTokens: number = 1024
): Promise<string> {
  return invokeModel(HAIKU_MODEL_ID, messages, systemPrompt, maxTokens);
}
