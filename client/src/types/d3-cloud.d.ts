declare module 'd3-cloud' {
  export interface Word {
    text: string;
    size: number;
    x?: number;
    y?: number;
    rotate?: number;
  }

  export interface CloudLayout {
    size(size: [number, number]): CloudLayout;
    words(words: any[]): CloudLayout;
    padding(padding: number): CloudLayout;
    rotate(rotate: () => number): CloudLayout;
    font(font: string): CloudLayout;
    fontSize(fontSize: (d: any) => number): CloudLayout;
    spiral(spiral: string): CloudLayout;
    on(event: string, callback: (words: Word[]) => void): CloudLayout;
    start(): CloudLayout;
  }

  export default function cloud(): CloudLayout;
}