export const cleanStringForFileSystem = (string: string) => string.replace(/[^\p{L}\d_]/gimu, '_');
