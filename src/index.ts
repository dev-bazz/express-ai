import app from './app';
import type { Application } from 'express';
import http from 'node:http';

const MAX_PORT_RETRIES = 10;
const DEFAULT_PORT = 3002;

const startServer = async (
	port: number,
	app: Application,
	retriesLeft = MAX_PORT_RETRIES,
): Promise<http.Server> => {
	const server = http.createServer(app);

	const tryListen = (port: number): Promise<void> => {
		return new Promise((resolve, reject) => {
			server.once('error', reject);
			server.listen(port, () => {
				server.removeListener('error', reject);
				console.log(`✨ Server is running on http://localhost:${port}`);
				resolve();
			});
		});
	};

	try {
		await tryListen(port);
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
			console.log(
				`Port ${port} is in use 🔄, trying port ${port + 1}...`,
			);
			return startServer(port + 1, app, retriesLeft - 1);
		}
		if (err.code === 'EADDRINUSE') {
			console.error(
				`❌ Failed to find available port after ${MAX_PORT_RETRIES} attempts`,
			);
		} else {
			console.error(`❌ Critical error occurred: ${err.message}`);
		}
		process.exit(1);
	}

	// Handle socket-level errors
	server.on('connection', (socket) => {
		socket.on('error', (err) => {
			console.error(`Socket error: ${err.message}`);
			socket.destroy();
		});
	});

	// Graceful shutdown handlers
	const shutdown = async (signal: string) => {
		console.log(`\n${signal} received. Gracefully shutting down... 🔄`);
		try {
			await new Promise((resolve) => server.close(resolve));
			console.log('✅ Server shut down successfully');
			process.exit(0);
		} catch (err) {
			console.error('❌ Error during shutdown:', err);
			process.exit(1);
		}
	};

	// Handle different termination signals
	process.once('SIGTERM', () => shutdown('SIGTERM'));
	process.once('SIGINT', () => shutdown('SIGINT'));

	// Handle uncaught errors
	process.once('uncaughtException', (error) => {
		console.error('❌ Uncaught Exception:', error);
		shutdown('Uncaught Exception');
	});

	process.once('unhandledRejection', (reason) => {
		console.error('❌ Unhandled Rejection:', reason);
		shutdown('Unhandled Rejection');
	});

	return server;
};

// Start the server
const port = Number(process.env.PORT) || DEFAULT_PORT;
startServer(port, app).catch((err) => {
	console.error('Failed to start server:', err);
	process.exit(1);
});
