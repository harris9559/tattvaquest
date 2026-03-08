declare module 'mailparser' {
  export function simpleParser(source: Buffer | string, options?: any): Promise<any>;
}
