import express, { response } from "express";
import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";
import {
  Annotation,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

//WITHOUT LANG CHAIN

// const ai = new GoogleGenAI({
//   apiKey: process.env.Gemini_API_Key,
// });

// app.post("/ai", async (req, res) => {
//   try {
//     const { input } = req.body;
//     const response = await ai.models.generateContent({
//       model: "gemini-3.7-flash",
//       //   contents: input,
//       contents: [
//         {
//           role: "MODEL",
//           parts: [
//             {
//               text: "you are Sandeep's AI assistnt and your name is Jarvis. If you do not know the answer then donot give incorrect answers.",
//             },
//           ],
//         },
//         { role: "USER", parts: [{ text: input }] },
//       ],
//     });
//     return res.status(200).json({
//       success: true,
//       message: response.text,
//     });
//   } catch (error) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// const interaction = async () => {
//   try {
//     const response = await ai.models.generateContent({
//       model: "gemini-3.8-flash",
//       contents: "Explain how AI works in a few words",
//     });

//     console.log(response.text);
//   } catch (error) {
//     console.error(error);
//   }
// };

// interaction();

// WITH LANGCHAIN

// const llm = new ChatGoogleGenerativeAI({
//   model: "gemini-3.7-flash",
//   apiKey: process.env.GOOGLE_API_KEY, //we do not need to specify this key here as it contains the name GOOGLE_API_KEY langchain will automatically fetch the key
// });

// app.post("/ai", async (req, res) => {
//   try {
//     const { prompt } = req.body;

//     const response = await llm.invoke([
//       {
//         role: "user",
//         content: prompt,
//       },
//     ]);
//     return res.status(200).json({
//       success: true,
//       message: response.content,
//     });
//   } catch (error) {
//     res.status(403).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

const myTool = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

const checkPointer = new MemorySaver();

const tools = [myTool];
const toolNode = new ToolNode(tools);

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0, //lesser the temperature the llm will be more serious to answer, if we increase it the llm will be more creative it will explain more. max temperature is true, default is 0.7
  maxTokens: 1000, //number of words it will give as a response
  maxRetries: 2,
}).bindTools(tools);

const callLLM = async (state) => {
  console.log("state:", state);
  const response = await llm.invoke([
    {
      role: "system",
      content:
        "You are Jarvis an assistant made by Sandeep, if you do not know the answer then call releavant tool to give the answer",
    },
    ...state.messages,
  ]);
  return { messages: [response] };
};

const shouldContinue = async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls.length > 0) {
    return "tools";
  } else {
    return "__end__";
  }
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callLLM)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .compile({ checkpointer: checkPointer });

app.post("/ai", async (req, res) => {
  try {
    const { input } = req.body;

    const response = await graph.invoke(
      {
        messages: [
          {
            role: "user",
            content: input,
          },
        ],
      },
      { configurable: { thread_id: "user123" } },
    );

    console.log(response);

    return res.status(200).json({
      success: true,
      message: response.messages[response.messages.length - 1].content,
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Hello from level 4",
  });
});

app.listen(PORT, () => {
  console.log(`App is listening on port http://localhost:${PORT}`);
});
