/** Endpoint del HEALTHCHECK de Docker. Sin dependencias: si responde, el proceso vive. */
export const dynamic = 'force-dynamic';

export const GET = () => Response.json({ status: 'ok' });
