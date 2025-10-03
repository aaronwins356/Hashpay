import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'HASH_PAY_JWT_TOKEN';

export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to get auth token', error);
    return null;
  }
};

export const storeToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.warn('Failed to store auth token', error);
  }
};

export const clearToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to clear auth token', error);
  }
};
