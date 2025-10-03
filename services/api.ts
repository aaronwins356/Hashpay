const MOCK_LATENCY = 1200;

const createMockToken = (email: string) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const encodedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
  return `mock.${encodedEmail}.${issuedAt}`;
};

const delay = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export const signup = async (email: string, password: string): Promise<string> => {
  await delay(MOCK_LATENCY);

  if (!email || !password) {
    throw new Error('Missing signup credentials.');
  }

  return createMockToken(email.trim().toLowerCase());
};

export const login = async (email: string, password: string): Promise<string> => {
  await delay(MOCK_LATENCY);

  if (!email || !password) {
    throw new Error('Missing login credentials.');
  }

  return createMockToken(email.trim().toLowerCase());
};
