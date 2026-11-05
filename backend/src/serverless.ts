import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { configure } from './setup';

/* Vercel entry: build the Nest app once per warm instance and hand requests to its Express handler. */
let ready: Promise<express.Express> | undefined;

function boot() {
  const server = express();
  server.set('trust proxy', 1); // behind Vercel's proxy: real client IPs for the throttler
  return NestFactory.create(AppModule, new ExpressAdapter(server), { logger: ['error', 'warn'] }).then(async (app) => {
    configure(app);
    await app.init();
    return server;
  });
}

export default async function handler(req: express.Request, res: express.Response) {
  ready ??= boot().catch((e) => { ready = undefined; throw e; });
  (await ready)(req, res);
}
