declare module 'pdf-parse' {
  function pdf(dataBuffer: Buffer): Promise<{
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }>;
  export = pdf;
}
