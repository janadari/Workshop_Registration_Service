/*
 * Single source of truth for the JWT signing/verification secret.
 *
 * Why this exists: both AuthModule (which signs tokens) and JwtStrategy (which
 * verifies them) used to hardcode the literal 'super-secret'. That is a silent
 * security hole rather than a visible failure - tokens are signed and verified
 * with the same known string, so login works, everything looks fine, and anyone
 * who reads the repository can forge a token with role ADMIN and call every
 * endpoint. It also meant the JWT_SECRET that `render.yaml` generates was
 * ignored completely.
 *
 * Reading the value from the environment closes both problems: Render injects a
 * strong generated secret, and the fallback below is only ever reached in local
 * development (where both sides still agree, so dev keeps working).
 *
 * NOTE: the value is captured when the module graph is first imported, i.e.
 * before Nest has built any provider. Host platforms (Render, Docker, Netlify)
 * set env vars before `node` starts, so production always picks them up; for
 * local runs either export JWT_SECRET in your shell or accept the dev default.
 */
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-insecure-secret';

export const JWT_EXPIRES_IN = '1d';
