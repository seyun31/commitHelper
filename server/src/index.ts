import SYSTEM_PROMPT from '../../src/prompts/system-prompt.txt';
import { Env, handleRequest } from './handler';

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env, SYSTEM_PROMPT);
  },
};
