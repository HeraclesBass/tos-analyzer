declare module 'crypto-js' {
  export interface WordArray {
    words: number[];
    sigBytes: number;
    toString(): string;
  }
  
  export namespace SHA256 {
    function hash(message: string | WordArray): WordArray;
  }
  
  export default {
    SHA256: (message: string | WordArray) => WordArray,
  };
}
