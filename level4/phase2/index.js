import express from "express";
import { ChatGroq } from "@langchain/groq";
import { PDFParse } from "pdf-parse";
import fs from "fs";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import dotenv from "dotenv";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

//PRACTICING RAGS

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0.7, //lesser the temperature the llm will be more serious to answer, if we increase it the llm will be more creative it will explain more. max temperature is true, default is 0.7
  maxTokens: 1000, //number of words it will give as a response
  maxRetries: 2,
});

//Embedding
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

//storing data chunks into vector database
const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "Grocery-store",
});

const upload = async () => {
  const pdfPath = "./knowledge.pdf"; //Upload the pdf
  const buffer = fs.readFileSync(pdfPath); // turn the pdf into a buffer using fs module
  const pdfResult = new PDFParse({ data: buffer }); // parse the data using pdf-parse module
  const result = await pdfResult.getText(); //extract the text
  const text = result.text; //getting the entire text
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docs = await splitter.createDocuments([text]);
  await vectorStore.addDocuments(docs);
};

app.post("/ai", async (req, res) => {
  try {
    const { input } = req.body;

    const docs = await vectorStore.similaritySearch(input, 5);
    const context = docs.map((d) => d.pageContent).join("\n");

    const response = await llm.invoke([
      new SystemMessage(`You are a RAG AI assistant.
        
        STRICT RULES:
        -Answer only from context
        -Do not use outside knowledge
        -If answer not found say:
        "I do not know from uploaded PDF."
        
        context: ${context}
        `),
      new HumanMessage(input),
    ]);

    return res.status(200).json({
      success: true,
      message: response.content,
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
