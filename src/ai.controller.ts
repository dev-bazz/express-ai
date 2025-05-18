import type { Handler } from 'express';
import { streamText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
export const handleAi: Handler = async (req, res) => {
	const ollama = createOllama({
		baseURL: 'http://127.0.0.1:8282/api',
	});
	const model = ollama('gemma3:1b', {});
	const prompt = req.query.prompt as string;
	const { textStream, toTextStreamResponse } = await streamText({
		model,
		prompt: prompt ?? 'Write a short poem for me',
	});
	if (textStream) {
		console.log(await toTextStreamResponse);
	}
	try {
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Content-Type', 'text/event-stream');
		for await (const chunk of textStream) {
			res.write(chunk);
			process.stdout.write(chunk);
		}
		res.end();
	} catch (error) {
		console.error('Streaming error:', error);
		res.status(500).end();
	}
};
