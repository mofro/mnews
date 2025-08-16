// Simple in-memory store for development
const store: Record<string, any> = {};

export class MockRedisClient {
  async hgetall(key: string): Promise<Record<string, any> | null> {
    return store[key] || null;
  }

  async hset(key: string, data: Record<string, any>): Promise<number> {
    store[key] = { ...(store[key] || {}), ...data };
    return 1;
  }

  async type(key: string): Promise<string> {
    return store[key] ? 'hash' : 'none';
  }

  async get(key: string): Promise<string | null> {
    return store[key] || null;
  }

  async set(key: string, value: any): Promise<void> {
    store[key] = value;
  }

  async sendCommand(command: string[]): Promise<any> {
    // Mock for LRANGE, SMEMBERS, etc.
    if (command[0] === 'LRANGE') {
      return [];
    }
    if (command[0] === 'SMEMBERS') {
      return [];
    }
    return null;
  }

  async scan(cursor: number, options: any = {}): Promise<[string, string[]]> {
    return ['0', []];
  }
}
