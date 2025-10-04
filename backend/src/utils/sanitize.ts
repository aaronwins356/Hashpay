const stripDangerousCharacters = (value: string): string => {
  return value
    // eslint-disable-next-line no-control-regex -- intentionally removing control characters
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[<>"'`;\\]/g, '')
    .trim();
};

export const sanitizeInput = (value: string): string => {
  return stripDangerousCharacters(value.normalize('NFKC'));
};

export const sanitizeEmail = (value: string): string => {
  return sanitizeInput(value).toLowerCase();
};

export default sanitizeInput;
