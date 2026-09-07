import { rm } from 'node:fs/promises';
// Fixed project-relative output only; independent of shell and working directory.
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
