import {createGateway} from '../_shared/gateway.mjs';

declare const Deno: {serve(handler: (request: Request) => Promise<Response>): void};
Deno.serve(createGateway());
